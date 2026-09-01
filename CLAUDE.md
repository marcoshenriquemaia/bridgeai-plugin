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

## Ainda falta

- Skills de domínio próprio e de deploy
- Agente de custos que consulta o MCP em vez de estimar
- Confirmar a posição correta do `.mcp.json` (raiz ou `.claude-plugin/`)
- Teste dos scripts, no formato do `check-dangerous.test.js` do guardrail
