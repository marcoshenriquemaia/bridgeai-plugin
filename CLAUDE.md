# Plugin BridgeAI — notas de desenvolvimento

Este arquivo é para quem desenvolve o plugin. Quem instala não o recebe: um
`CLAUDE.md` na raiz de um plugin não é lido como contexto. É por isso que as regras
entregues ao usuário entram pelo hook `SessionStart`, em
[scripts/load-platform.js](scripts/load-platform.js).

## O princípio da divisão

Este plugin e o [guardrail](https://github.com/marcoshenriquemaia/claude-guardrail)
se dividem por **assunto**, nunca por senioridade do usuário:

- **Guardrail** — segurança, ações destrutivas, qualidade, escolha de tecnologia.
  Vale para qualquer pessoa e funciona sem a BridgeAI. É também o topo do funil de
  aquisição, então não pode passar a exigir conta na plataforma.
- **Este plugin** — como a plataforma funciona, o MCP, custo, aprovação, fluxos.

O tom **não é um terceiro plugin**: é uma variável lida do perfil da conta. Três das
quatro preocupações não mudam com quem está do outro lado; só a condução muda.

## Contexto é orçamento

Tudo em `rules/` entra em toda sessão e some a cada compactação — é contexto que o
usuário pagou e que deixa de estar disponível para o código dele. `platform.md`
precisa ficar enxuto.

Critério para decidir onde algo mora:

- Precisa moldar **toda** interação, inclusive a primeira? → `rules/`
- Responde a uma situação identificável? → `skills/`, que o Claude carrega ao
  reconhecer a situação.

Fluxo de mobile, painel, domínio e deploy são skills justamente por isso.

## Hooks devolvem decisão, não bloqueiam

`require-approval.js` e `check-push.js` devolvem `permissionDecision` em JSON no
stdout, não `exit 2`.

A diferença importa: `exit 2` bloqueia sem caminho de aprovação, e um guardrail sem
saída legítima ensina a ser contornado. Devolver `deny` com a instrução de como
aprovar, ou `ask` com o que confirmar, mantém o controle com a pessoa.

Toda falha inesperada nos scripts sai em silêncio com `exit 0`. Hook que derruba a
sessão é pior que hook nenhum.

## O contrato com o servidor

Os nomes de ferramenta em [rules/platform.md](rules/platform.md) são o contrato
que o MCP precisa cumprir. Ao renomear uma ferramenta no servidor, atualize aqui e no
matcher de `hooks/hooks.json` — o matcher lista por nome as operações sem volta, e
uma ferramenta destrutiva fora dessa lista passa sem aprovação.

⚠️ **O contrato foi escrito antes do servidor, e por um tempo mentiu.** A tabela
anunciava 23 ferramentas quando existiam 10, e o Claude prometia ao usuário coisas
que estouravam na cara dele. Hoje `platform.md` lista as 16 que existem e diz por
extenso quais não existem. Ao acrescentar ferramenta no servidor, a tabela e a lista
de ausentes mudam JUNTAS — uma POC feita como usuário comum é o que pegou isso, e
ela está em `poc/2026-09-02-ana-acolhe.md`.

**E as skills mentiram do mesmo jeito, por mais tempo.** Até 04/09/2026
`painel-do-projeto` mandava chamar `publicar_dashboard` e `publicar-mobile`
mandava chamar `registrar_build` — duas ferramentas que o `platform.md` dizia não
existir. Regra e skill discordando é o pior caso: a skill carrega justamente na
hora em que o usuário pediu aquilo. Ao conferir o plugin contra o servidor,
confira as skills e os comandos, e não só a tabela.

## O login mora aqui, e não imprime o token

[scripts/login.js](scripts/login.js) é o `npm run login` do servidor portado para
zero dependência — com uma diferença que é a razão de ele existir separado: **o
token nunca sai no stdout.** Quem roda o script é o Claude, pela ferramenta Bash,
e o stdout dele vai para o chat. O script grava direto no ambiente (`setx` no
Windows, o arquivo de perfil do shell nos outros) e a tela só diz "entrou como
fulano".

⚠️ **Este parágrafo dizia que o `.mcp.json` lê `${BRIDGEAI_TOKEN}` no arranque, e
que por isso entrar exige fechar e abrir o Claude Code. Deixou de ser verdade em
04/09/2026**, quando o OAuth entrou: o `.mcp.json` tem só `type` e `url`, o
cliente MCP faz o login sozinho, e não há variável de ambiente nenhuma no
caminho. O mesmo se aplicava ao aviso do `SessionStart`, que saía de a variável
estar vazia e apareceria em toda sessão de quem já entrou.

**O `login.js` continua existindo, e para uma coisa só: o túnel.**
`scripts/tunnel.js` lê `process.env.BRIDGEAI_TOKEN` — ele é um processo
separado, fora do cliente MCP, e não tem como alcançar o token que o OAuth
guardou. Quem entrou pelo caminho novo **não tem essa variável**, e é por isso
que o túnel ainda pede o login antigo.

`login.test.js` afirma o negativo — o token NÃO aparece na saída — contra um
servidor de mentira. Detalhe do teste: `spawn` e não `spawnSync`, porque o servidor
falso vive no processo do teste e o síncrono trava o event loop que o atenderia.

## O túnel

[scripts/tunnel.js](scripts/tunnel.js) é a ponta local do túnel: abre um
`127.0.0.1:55432` e o liga ao banco do projeto por dentro do WebSocket do MCP. É o
que faz "servidor local, dados na nuvem" funcionar sem Docker.

**Zero dependência, e isso é requisito, não estilo.** Ele roda na máquina do
usuário, que pode não ter `node_modules` nenhum — mandar alguém rodar `npm install`
antes de conseguir desenvolver é o degrau que o produto promete tirar. Por isso
`WebSocket` global do Node e `node:net`, e nada além.

**A porta é 55432 e não 5432, e isso é segurança de dado.** A 5432 é a porta do
Postgres de todo mundo: numa máquina que já tinha um Postgres em Docker os dois
subiam juntos sem reclamar, porque no Windows ligar em `127.0.0.1:5432` com um
`0.0.0.0:5432` existente é permitido e o endereço específico vence. O perigo não
é a colisão — é o silêncio ao contrário: **se o túnel cair enquanto o app roda, a
próxima conexão cai no Postgres local sem erro nenhum, e a migration seguinte vai
para o banco errado.**

Daí as duas conferências no arranque, e as duas precisam continuar existindo:

- **`ocupada()` conecta na porta antes de escutar nela**, e recusa subir se
  alguém atender. Confiar no `EADDRINUSE` do `listen` não serve: no Windows ele
  não acontece.
- **`apresentacao()` abre um WebSocket e fecha**, só para ver se o banco da nuvem
  respondeu. O servidor conecta o banco ANTES de aceitar o upgrade, então um
  `open` prova o caminho inteiro. Sem isso, "Túnel aberto" queria dizer apenas
  "consegui reservar a porta".

Ao mudar o número, mude junto o `porta` do `credentials` em
`mcp/src/real-source.ts` — é ele que escreve o `.env` que aponta para cá.

O protocolo entre as duas pontas é testado em `mcp/src/tunnel.test.ts`, que
reescreve este cliente em vez de importá-lo — se os dois divergirem, é lá que
aparece.

## O `.mcp.json` fica na raiz

A documentação do Claude Code aceita dois lugares: um `.mcp.json` na **raiz do
plugin**, ou um campo `mcpServers` dentro do `plugin.json`. Dentro de
`.claude-plugin/` não é um deles. Está na raiz, e o item de "confirmar a posição"
que viveu meses no roadmap sai por isso — o que ainda não aconteceu é uma
instalação de verdade pelo marketplace, e ela depende do repositório público.

## Ainda falta

- **Instalar de verdade** pelo marketplace numa máquina limpa, e rodar
  `/bridgeai:entrar` → `/bridgeai:comecar` até o app no ar. O repositório é
  público desde 04/09/2026 (`marcoshenriquemaia/bridgeai-plugin`), e no
  repositório da plataforma esta pasta é um submódulo: commit e push aqui
  primeiro, ponteiro lá depois.
- Skill de domínio próprio (a feature não existe no servidor; a skill vem depois)
- Teste do `load-platform.js` e do `tunnel.js`, no formato do `hooks.test.js`
