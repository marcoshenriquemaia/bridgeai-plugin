---
description: Entra na BridgeAI com a conta do GitHub, para o Claude enxergar os projetos
---

Você vai conectar esta máquina à conta BridgeAI do usuário. É o passo que faz as
ferramentas `mcp__bridgeai__*` aparecerem — sem ele, o plugin está instalado e não
enxerga nada.

**O login é do próprio Claude Code, e não um script.** O servidor da BridgeAI é um
servidor de autorização: o Claude Code descobre isso sozinho, abre o navegador e
guarda o acesso. Não há token para colar, variável de ambiente para definir, nem
reinício depois.

Peça isto, exatamente nesta ordem:

> "Digite `/mcp`, escolha **bridgeai** e clique em autenticar. O navegador vai abrir
> no GitHub — é só autorizar. Se ele pedir permissão para ler seu e-mail, pode
> confirmar: é a única que a BridgeAI pede, e é para avisar quando o crédito
> estiver acabando."

`/mcp` é um comando do Claude Code e só o usuário pode digitar — você não consegue
rodar por ele. Espere ele dizer que terminou.

**Não peça, não leia e não procure o acesso.** Ele não passa pelo chat, não fica em
variável de ambiente e não tem arquivo para abrir. Se o usuário colar alguma coisa
que pareça um token, diga que foi parar no histórico e que ele deve entrar de novo
por `/mcp`.

## Confira antes de dizer que deu certo

Chame `list_apps`. Se responder, entrou — diga com quem, e siga para o que ele
queria fazer.

Se as ferramentas continuarem sem aparecer:

- **"bridgeai failed" ou "needs authentication" em `/mcp`** — a autenticação não
  chegou ao fim. Peça para repetir; o navegador pode ter sido fechado antes.
- **O plugin foi instalado agora** — o Claude Code lê a lista de servidores ao
  abrir. Aqui, e só aqui, fechar e abrir resolve.
- **Nada disso** — rode `/bridgeai:doutor`.

$ARGUMENTS
