<!--
  Modelo do bloco que vai para o CLAUDE.md do PROJETO do usuário.

  Ele é versionado no repositório dele, então alcança quem o hook deste plugin
  não alcança: um colaborador que clonou, outro agente, uma máquina sem o
  plugin instalado. Foi essa a lacuna que fez alguém desenvolvendo aqui não
  descobrir que existia como acrescentar um ambiente, e outro publicar um app
  que subia na porta errada.

  Regras ao escrever no projeto:

  - Se já existe um `CLAUDE.md`, ACRESCENTE esta seção no fim. Nunca sobrescreva
    o arquivo de alguém.
  - Troque `<app>` pelo id do app. Não troque mais nada por número.
  - ⚠️ **Nenhum preço, nenhum MB, nenhuma lista de ambientes aqui.** Isso muda no
    primeiro `provision_resource` e ninguém volta para corrigir o arquivo — e a
    lista de frases que esta plataforma escreveu e o código não sustentava já é
    longa demais. O que envelhece se pergunta às ferramentas.
-->

## Este projeto roda na BridgeAI

O app é **`<app>`**. A BridgeAI hospeda o servidor, o banco, o cache e o
armazenamento dele, e o Claude enxerga tudo isso pelas ferramentas
`mcp__bridgeai__*` — `status`, `logs`, `query`, `describe_schema`,
`current_cost`. **Consulte antes de supor**: o estado real está a uma chamada de
distância.

Se essas ferramentas não aparecerem nesta sessão, o plugin não está instalado ou
ninguém entrou. Instalar e entrar:

```
/plugin marketplace add marcoshenriquemaia/bridgeai-plugin
/plugin install bridgeai@bridgeai
/mcp          → escolha bridgeai → autenticar
```

### Rodar na máquina

O servidor roda aqui; banco, cache e armazenamento ficam na nuvem. **Ninguém
instala Docker, Postgres nem Redis.** A ordem, e ela importa:

1. `dev_credentials` grava o `.env` — ele já traz o acesso que o túnel usa.
2. `node "${CLAUDE_PLUGIN_ROOT}/scripts/tunnel.js" --dev`, em segundo plano.
3. `npm install && npm run dev`.

O `.env` **não vai para o Git**. E antes de subir servidor ou túnel, veja o que a
sessão anterior deixou aberto:
`node "${CLAUDE_PLUGIN_ROOT}/scripts/portas.js"`.

### O que o servidor recebe quando está publicado

Vale para o Dockerfile e para todo código que grava arquivo. Publicado é
diferente da máquina de quem escreve, e a diferença não dá erro que aponte a
causa:

- **A porta vem em `PORT`.** Escute `process.env.PORT`. Um número fixo faz o
  roteador bater no lugar errado e o site responder 502 com o contêiner saudável.
- **O disco é somente leitura**, com `/tmp` para o que for temporário. App que
  grava em `./uploads` funciona aqui e quebra lá. Arquivo de usuário vai para o
  armazenamento, por URL assinada.
- **Migration roda no `CMD`**, no arranque do contêiner — não há passo manual em
  produção, e não há backup.
- Há um caminho de saúde que precisa responder 200 (`status` mostra qual).

Com o plugin instalado, a skill `dentro-do-conteiner` tem o contrato inteiro.

### O que NÃO se faz por aqui

Publicar é uma GitHub Action deste repositório (`.github/workflows/publicar.yml`)
— nunca um comando manual na máquina de ninguém. Criar recurso, mudar tamanho,
remover app e voltar versão exigem um **código de aprovação** que só a pessoa
dona da conta pega no painel, em https://painel.bridgeaibrasil.com.br. O Claude
não gera esse código, e não deve tentar contornar a falta dele.
