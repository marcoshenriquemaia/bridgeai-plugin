---
description: Prepara a máquina e cria o projeto na BridgeAI, do zero até rodando
---

Você vai levar o usuário de uma máquina possivelmente vazia até o projeto rodando.
Ele digita este comando e assiste — só os logins e o token de publicação pedem algo
dele.

**Faça tudo você.** Não peça para ele instalar nada à mão, não mande abrir site de
download, não explique o que é git. Rode, confira, siga.

**Este comando é retomável.** Se as ferramentas `mcp__bridgeai__*` não estiverem
carregadas nesta sessão, faça as etapas 1 e 2 e **pare**: o Claude Code só passa a
enxergar a BridgeAI depois de reaberto. Peça para ele fechar, abrir e rodar
`/bridgeai:comecar` de novo — e, na volta, `list_apps` diz onde parou.

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

**Grave o perfil agora**, em `~/.bridgeai/profile.json`: `{"profile": "guided"}` ou
`{"profile": "technical"}`, conforme quem está do outro lado. Aqui e não no fim — o
arquivo decide o tom das próximas sessões, e um comando que só o grava na última
linha nunca o grava quando para no meio.

## Etapa 2 — Conectar ao GitHub e à BridgeAI

São dois logins com a mesma conta, e são os únicos passos manuais. **Avise antes o
que vai aparecer**, senão ele trava com medo na tela de permissão:

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
é e-mail e senha, três minutos. A mesma conta serve de login da BridgeAI.

**Depois, a BridgeAI** — só se as ferramentas `mcp__bridgeai__*` não estiverem
carregadas. Siga o `/bridgeai:entrar`: o mesmo desenho, um código de 8 letras e o
navegador abrindo no GitHub. O acesso é gravado no ambiente da máquina e **nunca
aparece na tela** — não tente lê-lo. Terminou, peça para fechar e abrir o Claude
Code e rodar este comando de novo. É a única interrupção do caminho, e é uma só.

## Etapa 3 — Entender o projeto

Antes de criar qualquer coisa, descubra o que ele quer construir. Pergunte sobre o
negócio, não sobre tecnologia: o que o site faz, quem usa, vende alguma coisa,
precisa de app de celular.

Com isso, escolha **uma** recomendação de tamanho e ponha o preço na mesa em reais
por mês — não um cardápio. Diga também o que você **não** vai incluir e quanto isso
economiza.

O número tem de sair de `estimate_cost`, e não da sua cabeça. Se o usuário já tem um
app, `estimate_cost` responde direto. Se é o primeiro, você ainda não tem um app para
consultar: diga a faixa como referência — **um projeto pequeno com servidor, banco,
cache e armazenamento fica em torno de R$ 88 por mês** — e avise que o número exato
sai assim que o projeto existir.

Não cite preço de plano. **Não existe mais.** A cobrança é por consumo, hora a hora,
item por item: um projeto que não precisa de cache não paga cache. Dizer "o Starter
custa R$ 97" cotaria R$ 9,42 acima do que a pessoa realmente pagaria, e ainda faria
parecer que ela paga por um pacote em vez do que usa.

## Etapa 4 — Criar

**Se o app já existe** — confira com `list_apps` antes de supor que não —, pule
para a etapa 5.

Criar é `create_app`, em duas chamadas. A primeira, com `id`, `name`, os itens
(`server_mb`, e `cache_mb` ou `bucket_gb` só se o projeto precisar) e o
`health_path` que o app vai responder (`/api/health` — e você implementa essa rota
no código dele), devolve um link. Mande o link e explique em uma frase o que ele
vai ler lá: o nome, os itens e o custo por mês. Ele clica em "Autorizar", copia o
código, e a segunda chamada leva só o código.

Não existe plano. Um site pequeno é `server_mb: 512`; cache só se o projeto tem
fila, sessão ou algo que precise de memória rápida; armazenamento só se guarda
arquivo. Na dúvida, menos: dá para adicionar depois, com `provision_resource`.

**Saldo vem antes.** `create_app` recusa sem R$ 10 de crédito e três dias de fôlego
contando o app novo, e diz quanto tem e onde recarregar. Se for o primeiro app da
conta, não há como consultar antes: chame, e se recusar, repasse a frase com o link
do painel (https://painel.bridgeaibrasil.com.br) e espere ele recarregar. Uns R$ 90
cobrem o primeiro mês de um projeto pequeno; diga esse número.

O que nasce: banco, cache, armazenamento e o ambiente local. **O site NÃO fica no ar
aqui** — publicar é a etapa 7. Diga isso na hora, para ele não abrir o endereço e
achar que quebrou.

## Etapa 5 — Trazer para a máquina

A pasta é `%USERPROFILE%\BridgeAI\<nome-do-app>` no Windows, ou `~/BridgeAI/<nome>`
no macOS e Linux. Se o projeto já tem repositório, clone ali. Se é novo, crie a
pasta, inicie o projeto, e crie o repositório privado dele com
`gh repo create <nome> --private --source . --push`.

**Nunca clone dentro de Documentos, Área de Trabalho ou OneDrive.** Essas pastas
costumam ser sincronizadas, e a sincronização corrompe o `.git` e trava o
`node_modules` durante a instalação — gerando erros que ninguém associa à causa.
Não pergunte onde ele quer salvar: escolha o caminho certo e siga.

```
gh repo clone <repo> <caminho>
```

## Etapa 6 — Rodar na máquina dele

O desenho é: **o servidor roda na máquina dele, os dados ficam na nuvem.** Nada de
Docker, nada de instalar Postgres. Quem liga as duas pontas é o túnel.

São três passos, nesta ordem, e **a ordem importa** — o passo 1 é o que dá ao
túnel o acesso que ele precisa.

**1. `dev_credentials` e grave o `.env`.** O arquivo já vem apontando para
`127.0.0.1`, com a senha dentro. Escreva direto no arquivo, **sem imprimir o
conteúdo no chat**, e confirme que `.env` está no `.gitignore`.

Entre as variáveis vem o `BRIDGEAI_TUNNEL_TOKEN`, que é o acesso que o túnel usa
para abrir a ligação. Ele vale 7 dias. **Por isso este passo vem antes**: subir o
túnel primeiro, num projeto novo, dá "faltou o acesso" — o arquivo que ele lê
ainda não existe.

**2. Suba o túnel, em segundo plano, e deixe rodando** — a partir da pasta do
projeto, que é onde o `.env` está.

```
node "${CLAUDE_PLUGIN_ROOT}/scripts/tunnel.js" --app <app> --environment dev
```

Ele abre um `127.0.0.1:55432` que se comporta como um Postgres comum. Quando
alguma coisa estiver errada (ambiente que não existe, projeto de outra pessoa,
acesso vencido), ele diz o motivo em português e sai; **leia o que ele disse
antes de tentar outra coisa.** Se disser que o acesso expirou, chame
`dev_credentials` de novo e regrave o `.env` — o token novo vem junto.

**3. Instale as dependências e suba o servidor.** Confira que respondeu, e só então
mande o endereço:

> "Pronto. Seu projeto está rodando em http://localhost:3000 — pode abrir no
> navegador. Deixe aquela outra janela aberta, ela é o que liga seu computador ao
> banco de dados. A partir de agora é só me dizer o que você quer mudar."

### Quando o projeto não tem ambiente de desenvolvimento

O túnel **não abre para produção**, de propósito: o banco de quem está usando o site
dele não vem para a máquina de ninguém. Num app que só tem produção não há para onde
tunelar.

**O conserto é acrescentar o ambiente local**, e ele é uma chamada: `estimate_cost`
com `kind: "database"` e `environment: "dev"`, o número na mesa, e
`gerar_link_aprovacao` + `provision_resource` com `resource_kind: "database"` e
`environment: "dev"`. Custa cerca de R$ 39/mês, nasce vazio, e não reinicia o site
dele. Diga o preço antes — é uma linha nova na conta, não um ajuste.

Se ele não quiser pagar por isso, **não invente um contorno**. Diga o que dá para
fazer: escrever o código, publicar, e olhar o resultado no endereço do app.
`status`, `logs` e `query` investigam lá, que é para isso que existem.

⚠️ **Não culpe o plano.** O ambiente local vem em todos, Starter incluído. Um app
sem ele foi publicado antes de o provisionamento saber criá-lo — dizer "é do plano
Pro para cima" faz a pessoa pagar R$ 200 a mais por mês por algo que ela já tem.

### Se o servidor local reclamar de "connection refused"

É o túnel que caiu ou nunca subiu. Confira antes de mexer em qualquer outra coisa —
esse erro não diz nada sobre o código dele.

## Etapa 7 — Publicar

Quem publica é uma GitHub Action no repositório dele, e não uma ferramenta sua. **E
não há nada para ele configurar no GitHub**: a Action se identifica com um crachá
que o próprio GitHub assina, e a BridgeAI confere a assinatura. Não existe segredo
para colar.

Siga o `/bridgeai:publicar` — ele é este passo inteiro, e é retomável. Em resumo:

1. **O Dockerfile e o workflow.** Escreva um `Dockerfile` seguindo a skill
   `dentro-do-conteiner` — porta em `process.env.PORT`, disco somente leitura,
   migration no `CMD` — e confira que o caminho de saúde responde 200. Copie
   `${CLAUDE_PLUGIN_ROOT}/templates/publicar.yml` para
   `.github/workflows/publicar.yml`, trocando `APP_ID_AQUI` pelo id do app.
2. **Um `git push` na branch principal.** A Action compila, sobe a imagem e troca o
   contêiner — uns 30 segundos, e cerca de um minuto na primeira vez. Acompanhe com
   `gh run watch --exit-status`, e não mandando ele abrir a aba Actions.
3. **`status`, e só então o endereço** `https://<app>.bridgeaibrasil.com.br`.

⚠️ Repositório de **organização** é a exceção: o vínculo automático compara o dono
do repositório com o dono do app, então ele não acontece ali. Só nesse caso use o
token de publicação do painel, colado em `Settings → Secrets and variables →
Actions` como `BRIDGEAI_DEPLOY_TOKEN`.

---

## Ao terminar

Se qualquer etapa falhar, não deixe pela metade: diga em que passo parou, o que já
funcionou, e o que precisa acontecer para seguir. Parar com uma frase clara vale
mais do que tentar o próximo passo com o anterior quebrado.

$ARGUMENTS
