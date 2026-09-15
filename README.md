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

Aparece um código de 8 letras, o navegador abre no GitHub, você confirma. O acesso
fica guardado na sua máquina e **não aparece na tela**. Depois, **feche e abra o
Claude Code** — é assim que ele passa a enxergar seus projetos.

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
---

## As regras vêm do servidor, e não daqui

Desde 15/09/2026 as regras da plataforma chegam pelo campo `instructions` do
servidor MCP, e não mais por um hook deste plugin. Elas passaram a valer em
**qualquer** cliente MCP — Claude Code, Codex, Cursor — sem instalar nada.

O mesmo vale para as skills e os templates: quem os entrega é a ferramenta
`get_guide`.

⚠️ **Por isso este plugin não é mais necessário para usar a BridgeAI.** Ele
continua funcionando e continua publicado; o caminho anunciado é só o servidor
MCP. As ferramentas locais — o túnel, o registro de portas — estão em
`npx bridgeai`, que não exige instalação.

---

## Estrutura

```
.claude-plugin/plugin.json   manifesto
.mcp.json                    conexão com o MCP da BridgeAI (login por OAuth)
hooks/hooks.json             início de sessão e proteções
commands/                    os comandos acima
skills/                      carregadas sob demanda
scripts/                     túnel, portas, login e hooks — Node sem dependências
bin/bridgeai.js              o comando do `npx bridgeai`
package.json                 o pacote npm com as ferramentas locais
templates/publicar.yml       o workflow que publica o seu projeto
```

⚠️ **`rules/` não existe mais aqui.** As regras da plataforma moram no servidor
MCP (`mcp/rules/`, servidas pelo `instructions`), e duplicá-las neste hook
custaria ~25 mil tokens repetidos em toda conversa de quem tem o plugin.
`scripts/hooks.test.js` afirma essa ausência.

## Licença

MIT.
