---
description: Entra na BridgeAI com a conta do GitHub, para o Claude enxergar os projetos
---

Você vai conectar esta máquina à conta BridgeAI do usuário. É o passo que faz as
ferramentas `mcp__bridgeai__*` aparecerem — sem ele, o plugin está instalado e não
enxerga nada.

**Avise antes o que vai aparecer**, senão ele trava na tela de permissão:

> "Vou te conectar à BridgeAI. Vai aparecer um código de 8 letras e o navegador vai
> abrir sozinho no GitHub. É só digitar o código lá e clicar em autorizar. Se pedir
> permissão para ler seu e-mail, pode confirmar — é só isso que ela pede."

Rode:

```
node "${CLAUDE_PLUGIN_ROOT}/scripts/login.js"
```

Mostre o código **em destaque, sozinho numa linha**, e espere. O script fica
esperando a confirmação e termina sozinho.

**O acesso é gravado direto no ambiente da máquina, e nunca aparece na tela.** Não
tente lê-lo, não peça para o usuário colar nada, e não procure onde ficou. Se o
script disser que entrou, entrou.

Quando terminar, diga ao usuário a única coisa que falta, e que só ele pode fazer:

> "Pronto, você entrou como <nome>. Agora feche o Claude Code e abra de novo — é
> assim que ele passa a enxergar seus projetos. Quando voltar, é só me chamar."

Se ele ainda não tiver conta no GitHub, mande criar em https://github.com/signup —
é e-mail e senha, três minutos. A mesma conta serve para a BridgeAI e para guardar o
código do projeto.

Se o script disser que a plataforma não respondeu, tente uma vez mais. Se
continuar, pare e diga com todas as letras: o problema não é da máquina dele.

$ARGUMENTS
