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
que estouravam na cara dele. Hoje `platform.md` lista as 12 que existem e diz por
extenso quais não existem. Ao acrescentar ferramenta no servidor, a tabela e a lista
de ausentes mudam JUNTAS — uma POC feita como usuário comum é o que pegou isso, e
ela está em `poc/2026-09-02-ana-acolhe.md`.

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

## Ainda falta

- Skills de domínio próprio e de deploy
- Agente de custos que consulta o MCP em vez de estimar
- Confirmar a posição correta do `.mcp.json` (raiz ou `.claude-plugin/`)
- Teste dos scripts, no formato do `check-dangerous.test.js` do guardrail
