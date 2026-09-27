# BridgeAI — plugin para Claude Code

**[bridgeaibrasil.com.br](https://bridgeaibrasil.com.br)** · hospedagem brasileira
que o seu agente de código opera sozinho.

Conecta o Claude Code à plataforma BridgeAI. Com ele, o Claude para de trabalhar no
escuro: cria o projeto, enxerga o banco, os logs, o custo e o estado do que está no
ar — e mostra o preço antes de gastar o seu dinheiro.

Servidor, banco PostgreSQL, cache e arquivos em máquinas no Brasil, com crédito
pré-pago por Pix — sem assinatura, sem fatura e sem cartão internacional. Você
contrata item por item, e o que não foi pedido não é cobrado.

O preço fica em
**[bridgeaibrasil.com.br/precos](https://bridgeaibrasil.com.br/precos)**, e não
aqui de propósito: aquela página é **gerada do mesmo catálogo que emite a
cobrança**, então ela não tem como divergir. Um valor digitado neste README
divergiria no primeiro dia em que o catálogo mudasse, dentro de um arquivo que
ninguém relê.

Feito para funcionar **junto** com o
[guardrail](https://github.com/marcoshenriquemaia/claude-guardrail), não no lugar
dele. O guardrail cuida de segurança e qualidade em qualquer projeto; este cuida da
plataforma. Instale os dois.

---

## Instalar

Dentro do Claude Code:

```
/plugin marketplace add marcoshenriquemaia/bridgeai-plugin
/plugin install bridgeai@bridgeai
```

Se aparecer `Run /reload-plugins to activate`, digite `/reload-plugins`.

### Entrar

```
/bridgeai:entrar
```

Ele pede para você digitar `/mcp`, escolher **bridgeai** e autenticar: o navegador
abre no GitHub, você confirma, e pronto. O acesso fica guardado pelo próprio Claude
Code e **não aparece na tela** — sem token para colar e sem reiniciar nada.

### Pelo celular ou pela web (claude.ai/code)

O Claude Code também roda **na nuvem**: você abre uma sessão pelo celular ou pelo
navegador, e uma máquina da Anthropic faz o papel do seu computador — clona o
projeto do GitHub, instala, roda. **A máquina não custa nada a mais**; o trabalho
do Claude gasta o limite do seu plano, como sempre.

O plugin não é instalado lá, então a BridgeAI entra por outro caminho:

1. **Conecte a BridgeAI como conector**, uma vez, em
   [claude.ai/customize/connectors](https://claude.ai/customize/connectors): conector
   personalizado com o endereço `https://mcp.bridgeaibrasil.com.br/mcp`. O GitHub
   pede para você autorizar, e a BridgeAI mostra uma tela **"Conectar a BridgeAI ao
   Claude"** — confira que é a sua conta e clique em **Conectar**. Vale para web,
   celular e desktop.
2. **Libere dois domínios na rede do ambiente da nuvem** (ícone de nuvem no título da
   sessão → Edit → *Network access* **Custom**, marcando a lista padrão):
   `mcp.bridgeaibrasil.com.br` e `br-se1.magaluobjects.com`. Sem isso o banco de
   desenvolvimento e os arquivos não chegam à máquina da nuvem.

O resto o próprio servidor ensina ao Claude: montar o `.env`, baixar e abrir o túnel.

⚠️ **O que a nuvem não tem:** o app rodando lá não abre no seu celular — o
`localhost` é da máquina da Anthropic. O Claude mostra a tela por print; para ver de
verdade, publique.

### Criar o primeiro projeto

```
/bridgeai:comecar
```

Ele prepara a máquina, cria o projeto na BridgeAI e deixa rodando no seu computador.
Publicar na internet é um `git push`: o passo a passo está no próprio comando.

### Precisa de Node.js

O login, o túnel e as verificações rodam em Node. Confira com `node --version`; se
der erro, baixe a versão LTS em [nodejs.org](https://nodejs.org). O
`/bridgeai:comecar` também instala sozinho no Windows.

---

## O que vem junto

### Comandos

| Comando | Para |
|---|---|
| `/bridgeai:entrar` | Conectar esta máquina à sua conta |
| `/bridgeai:comecar` | Da máquina vazia ao projeto rodando |
| `/bridgeai:publicar` | Põe o projeto no ar, sem configurar nada no GitHub |
| `/bridgeai:doutor` | Quando "parou de funcionar" — confere e conserta |
| `/bridgeai:custo` | Quanto está gastando e no que dá para economizar |

### Skills

Carregam sozinhas quando o assunto aparece — você não precisa chamar.

| Skill | Quando |
|---|---|
| `publicar-mobile` | App de celular: testar, distribuir, publicar nas lojas |
| `painel-do-projeto` | Área administrativa, CMS, métricas |

### Proteções automáticas

- **Operação sem volta exige código de aprovação.** Criar projeto, mudar de plano ou
  apagar um app só acontece com um código que você copia do painel. O Claude não
  consegue gerar esse código — e é isso que impede que uma instrução escondida
  dentro de um log ou de um registro do banco destrua alguma coisa.
- **Custo antes de gastar.** Nenhum recurso é proposto sem o preço em reais por mês.
- **Conexão com o GitHub conferida antes do envio.** Quando o acesso expira, em vez
  de um erro em inglês, você recebe o passo para reconectar.
- **Regras carregadas em toda sessão**, ajustadas ao perfil da conta.

---

## Perfis

O tom muda conforme quem está do outro lado:

- **guided** (padrão) — o Claude explica em linguagem simples, decide as questões
  técnicas sozinho, faz em vez de mandar fazer, e fala de custo em reais por mês.
- **technical** — só as regras da plataforma, sem a camada de condução.

Para forçar em uma sessão: `BRIDGEAI_PROFILE=technical`. Para fixar na máquina,
`~/.bridgeai/profile.json` com `{"profile": "technical"}`.

---

## Estrutura

```
.claude-plugin/plugin.json   manifesto
.mcp.json                    conexão com o MCP da BridgeAI (login por OAuth)
hooks/hooks.json             início de sessão e proteções
rules/platform.md            sempre carregado
rules/guided.md              carregado só no perfil guided
commands/                    os comandos acima
skills/                      carregadas sob demanda
scripts/                     login, túnel e hooks — Node sem dependências
templates/publicar.yml       o workflow que publica o seu projeto
```

O que fica em `rules/` é injetado em **toda** sessão e ocupa contexto que seria do
código do usuário. Antes de acrescentar algo lá, pergunte se aquilo precisa valer
desde a primeira mensagem. Se a resposta for "só quando o assunto aparecer", é skill.

## Licença

MIT.
