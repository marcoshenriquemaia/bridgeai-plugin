---
description: Prepara a máquina e cria o projeto na BridgeAI, do zero até rodando
---

Você vai levar o usuário de uma máquina possivelmente vazia até o projeto rodando.
Ele digita este comando e assiste — só um passo pede algo dele.

**Faça tudo você.** Não peça para ele instalar nada à mão, não mande abrir site de
download, não explique o que é git. Rode, confira, siga.

---

## Etapa 1 — Ver o que já existe

Cheque as três ferramentas de uma vez e siga em frente com o que faltar:

```
git --version ; gh --version ; node --version
```

No Windows, instale o que faltar em silêncio:

- git → `winget install --id Git.Git -e --silent`
- gh → `winget install --id GitHub.cli -e --silent`
- node → `winget install --id OpenJS.NodeJS.LTS -e --silent`

Se o `winget` não existir — Windows 10 antigo ou máquina corporativa — baixe os
instaladores oficiais e rode com as flags de instalação silenciosa. Se o download
for bloqueado por antivírus ou proxy, **pare e diga isso com todas as letras**: é
um problema que só o usuário resolve, e insistir só perde tempo dele.

No macOS: o git vem com as ferramentas de linha de comando do Xcode. Para o `gh`,
use o Homebrew se já existir; se não existir, baixe o pacote oficial em vez de
instalar o Homebrew inteiro na máquina de alguém.

## Etapa 2 — Conectar ao GitHub

Este é o único passo manual. **Avise antes o que vai aparecer**, senão ele trava
com medo na tela de permissão:

> "Vou te conectar ao GitHub. Vai aparecer um código de 8 letras e o navegador vai
> abrir sozinho. A página do GitHub vai pedir permissão para acessar repositórios —
> pode confirmar, é assim mesmo. É só colar o código e clicar em autorizar."

```
gh auth login --web --git-protocol https
```

Mostre o código **em destaque, sozinho numa linha**, e espere. Depois:

```
gh auth setup-git
```

Se ele ainda não tiver conta no GitHub, mande criar em https://github.com/signup —
é e-mail e senha, três minutos, e é a única vez que ele entra lá. A mesma conta
serve de login da BridgeAI.

## Etapa 3 — Entender o projeto

Antes de criar qualquer coisa, descubra o que ele quer construir. Pergunte sobre o
negócio, não sobre tecnologia: o que o site faz, quem usa, vende alguma coisa,
precisa de app de celular.

Com isso, chame `suggest_plan` e apresente **uma** recomendação com o preço em
reais por mês — não um cardápio. Diga também o que você **não** vai incluir e
quanto isso economiza. Espere ele aprovar.

## Etapa 4 — Criar

```
create_app
```

Isso cria o repositório na organização da BridgeAI, convida a conta dele, escreve o
fluxo de build, e provisiona banco, armazenamento e subdomínio.

## Etapa 5 — Trazer para a máquina

Clone em `%USERPROFILE%\BridgeAI\<nome-do-app>` no Windows, ou `~/BridgeAI/<nome>`
no macOS e Linux.

**Nunca clone dentro de Documentos, Área de Trabalho ou OneDrive.** Essas pastas
costumam ser sincronizadas, e a sincronização corrompe o `.git` e trava o
`node_modules` durante a instalação — gerando erros que ninguém associa à causa.
Não pergunte onde ele quer salvar: escolha o caminho certo e siga.

```
gh repo clone <repo> <caminho>
```

Depois `dev_credentials` para gravar o arquivo de ambiente. Ele não vê senha nenhuma.

## Etapa 6 — Rodar

Instale as dependências, suba o servidor em segundo plano, confira que respondeu, e
só então mande o endereço:

> "Pronto. Seu projeto está rodando em http://localhost:3000 — pode abrir no
> navegador. A partir de agora é só me dizer o que você quer mudar."

---

## Ao terminar

Grave o perfil em `~/.bridgeai/profile.json` para as próximas sessões:
`{"profile": "guided"}` ou `{"profile": "technical"}`, conforme a conta.

Se qualquer etapa falhar, não deixe pela metade: diga em que passo parou, o que já
funcionou, e o que precisa acontecer para seguir.

$ARGUMENTS
