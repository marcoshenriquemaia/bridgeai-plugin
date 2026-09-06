---
name: dentro-do-conteiner
description: O que o servidor de um app na BridgeAI recebe, exige e proíbe — porta, variáveis, disco somente leitura, o que o cache deixa fazer, como subir e ler arquivo do armazenamento, e como rodar migration em produção. Use ANTES de escrever ou mudar o Dockerfile, uma rota de upload ou download, uma fila, um cron, uma migration, ou quando o app funciona na máquina do usuário e quebra publicado.
---

# Dentro do contêiner

O servidor de um app roda num contêiner Docker com coleiras. Elas não aparecem
na máquina do usuário, então **o modo de falha típico é: funciona local, quebra
publicado, e o erro não aponta a causa.** Tudo abaixo foi medido no que a
plataforma entrega hoje — não é recomendação, é contrato.

## O que o app recebe no ambiente

| Variável | O que é |
|---|---|
| `PORT` | **`3000`.** É onde o roteador bate. O app PRECISA escutar em `process.env.PORT` — um app na 3001 sobe saudável e o site responde 502 |
| `DATABASE_URL` | `postgresql://…?sslmode=require`. Prisma, Drizzle, Knex e o resto funcionam como está. **Só o driver `pg` direto** lê `require` como `verify-full` e morre em "self-signed certificate": acrescente `&uselibpqcompat=true` |
| `REDIS_URL` | Só se o app tem cache. `redis://usuario:senha@host:6379`, usuário com chaves só na faixa dele |
| `STORAGE_TOKEN`, `STORAGE_SIGN_URL`, `STORAGE_BUCKET` | Só se o app tem armazenamento. Ver "Arquivos" abaixo — **não há chave S3**, e não há como listar o bucket |
| O que o usuário guardou no painel | Chega como variável de ambiente com o nome pedido em `request_variable` |

Nada mais. Não invente `NODE_ENV`, `HOST` nem `DATABASE_HOST`: se o app
precisa, ele deriva de `DATABASE_URL` ou pede pelo `request_variable`.

## O que o disco permite

**O sistema de arquivos é somente leitura.** Dá para escrever em dois lugares,
e os dois somem quando o contêiner reinicia:

- `/tmp` — 64 MB
- `/app/.next/cache` — 128 MB (o cache de revalidação do Next)

Consequências que quebram app de verdade:

- **Upload em `./uploads` ou `public/` não funciona.** Arquivo vai para o
  armazenamento, por URL assinada — abaixo.
- **SQLite não funciona** como banco do app. O banco é o Postgres da
  `DATABASE_URL`.
- **Log em arquivo não funciona.** Escreva em `stdout`/`stderr`; é o que `logs`
  lê. Não use `winston` com transporte de arquivo nem `pino` para arquivo.
- **Cache em disco (imagens do Next fora de `.next/cache`, `node-cache` para
  arquivo) morre no reinício.** Se precisa durar, é o Redis.
- Bibliotecas que escrevem no diretório do pacote na primeira execução
  (fontes, binários baixados sob demanda, `sharp` sem o binário pré-instalado)
  falham. Resolva no `Dockerfile`, no build.

Limites que valem também: **256 processos** (bomba de fork morre sozinha), a
memória do item servidor (o app é derrubado ao estourar — `status` mostra
quanto falta), e a CPU proporcional à memória (no teto, o kernel só atrasa o
app, sem erro nenhum; é a lentidão que não deixa rastro).

## O Dockerfile

Um só estágio serve; dois é melhor para a imagem ficar pequena (a publicação
sobe a imagem inteira). O que não pode faltar:

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build          # se houver build
ENV NODE_ENV=production
# A porta é decidida pela plataforma; o app lê PORT em tempo de execução.
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
```

- **Escute em `process.env.PORT`**, com `3000` de reserva. Nunca chumbe outra.
- **Não use `USER root`** para contornar o disco somente leitura: não contorna.
- **A imagem precisa subir sozinha, sem comando de fora.** Não existe
  `docker exec` na plataforma — o que precisa rodar antes do servidor roda no
  `CMD`.
- **Responda 200 no caminho de saúde** (`describe_app` diz qual; `set_health_path`
  muda). A publicação espera esse 200 por até ~80 segundos e depois desiste com
  `healthy: false` — um app que demora mais que isso para subir precisa de um
  caminho de saúde que responda antes de terminar de carregar tudo.

## Migration em produção

**Não há ferramenta de migration, e não há backup.** O caminho é o app rodar a
migration **no arranque**, antes de escutar a porta — o `migrate deploy` do
Prisma, o `migrate` do Drizzle, o `knex migrate:latest`, ou o equivalente —
dentro do `CMD` acima. Regras:

1. **Teste a migration no ambiente local primeiro**, pelo túnel, contra o banco
   local. É para isso que ele existe.
2. **Uma migration que apaga coluna ou tabela é irreversível.** `rollback_deploy`
   volta o código, não o banco. Diga ao usuário, com o nome do que some, antes
   de publicar.
3. **Migration precisa ser idempotente** no sentido de rodar de novo sem
   quebrar: o contêiner reinicia (a plataforma reinicia ao aplicar variável, ao
   mudar item, no `restart_app`), e cada arranque roda o `CMD` de novo. As
   ferramentas de migration já garantem isso pela tabela de controle delas; SQL
   à mão no arranque não.
4. Se a migration falha, o app não sobe, e `logs` mostra o erro. `status` diz
   "fora do ar" e a publicação `healthy: false`.

### Prisma: o `shadowDatabaseUrl` já vem no `.env`

`prisma migrate dev` cria um **shadow database** descartável, e a role da
plataforma não cria database — nenhuma cria, por desenho. Sem endereço de um
shadow que já existe, ele morre em **P3014**, `permission denied to create
database`.

O `dev_credentials` escreve `SHADOW_DATABASE_URL` no `.env`, apontando para um
banco descartável **da pessoa** que a plataforma provisiona junto com o ambiente
de desenvolvimento dela. Ponha no schema:

```prisma
datasource db {
  provider          = "postgresql"
  url               = env("DATABASE_URL")
  shadowDatabaseUrl = env("SHADOW_DATABASE_URL")
}
```

⚠️ **Nunca aponte o `shadowDatabaseUrl` para o banco de um projeto.** O Prisma
**apaga** o shadow a cada migration — medido. Apontá-lo para outro projeto do
usuário destruiria aquele banco, em silêncio, no comando que ele roda todo dia.
Se a variável não estiver no `.env`, chame `dev_credentials` de novo; não invente
um endereço.

## Cache (Redis)

O usuário do app tem `+@all -@dangerous`: **não** faz `KEYS`, `FLUSHALL`,
`FLUSHDB`, `CONFIG`, `DEBUG`, `SHUTDOWN`, `MONITOR`, nem enxerga chave fora da
faixa dele. Consequências:

- **BullMQ** funciona, mas reclama no arranque por não conseguir `CONFIG GET
  maxmemory-policy` — é aviso, não erro. A instância já está em `noeviction`.
- `SCAN` com o prefixo do app funciona; `KEYS` não. Bibliotecas de sessão e
  rate-limit funcionam.
- Não há `maxmemory` por app: o cache é fatia de uma instância compartilhada.
  Use TTL em tudo.
- **No ambiente local o cache vem pelo mesmo túnel**, numa faixa de chaves só
  de desenvolvimento (`t:<app>-dev:*`), separada da produção. O
  `dev_credentials` escreve `REDIS_URL` apontando para `127.0.0.1:56379` e o
  `tunnel.js` abre essa segunda porta sozinho. Mesmo assim, faça o app
  **tolerar `REDIS_URL` ausente** (cache em memória ou desligado): é o que o
  mantém de pé quando o túnel cai no meio do trabalho.

## Arquivos (armazenamento)

O app não tem chave de nuvem. Ele pede uma URL assinada à plataforma e usa a
URL — do servidor dele, nunca do navegador:

```
POST ${STORAGE_SIGN_URL}
Authorization: Bearer ${STORAGE_TOKEN}
Content-Type: application/json

{ "method": "PUT", "key": "fotos/2026/produto-41.jpg", "expiresIn": 900 }

→ { "url": "https://…", "method": "PUT", "bucket": "…", "key": "…", "expiresAt": "…" }
```

- `method`: `PUT` (subir), `GET` (baixar), `HEAD` (existe?), `DELETE` (apagar).
- `key`: o nome do arquivo no bucket — letras, números, `.`, `-`, `_` e `/`;
  sem barra no começo ou no fim; sem `..`. **O app decide a chave e a grava no
  banco dele**: não existe listagem, então o que não está no banco está perdido.
- `expiresIn`: segundos, até 3600. Padrão curto. A URL vale para UM objeto,
  UM verbo, alguns minutos.
- O PUT exige `Content-Length`: quem sobe precisa saber o tamanho. Para
  fluxo de tamanho desconhecido ou arquivo grande (> 5 MB), use envio em
  partes: `operation: "multipart_create"` (a URL responde XML com `UploadId`),
  depois `multipart_part` com `uploadId` e `partNumber` (1 a 10.000) por parte,
  e `multipart_complete` (ou `multipart_abort`). Cada uma é um pedido de
  assinatura.
- **Upload do navegador do usuário final:** o servidor do app pede a URL de PUT
  e devolve ao navegador, que sobe direto. O `STORAGE_TOKEN` nunca sai do
  servidor.
- Fotos públicas de produto: o app assina um GET com validade longa (até 1 h)
  quando monta a página, ou serve pelo próprio servidor como proxy. Não existe
  "tornar público".
- **300 assinaturas por minuto por app.** Um laço que assina por item de lista
  estoura; assine sob demanda.
- **O ambiente local TEM armazenamento**, e é um bucket separado do de
  produção. O `dev_credentials` escreve `STORAGE_TOKEN`, `STORAGE_SIGN_URL` e
  `STORAGE_BUCKET` no `.env`, e o código do app é **o mesmo** nos dois: ele pede
  URL ao `STORAGE_SIGN_URL` e sobe nela. Nada de MinIO, nada de Docker.

  ⚠️ **O token do `.env` não assina no bucket de produção**, e essa recusa é de
  propósito: rodando local você executa código pela metade, e um `PUT` de teste
  no bucket de produção passa por cima de arquivo de gente de verdade sem erro
  nenhum. É a mesma razão de o túnel recusar o banco de produção.

  Os arquivos que você subir desenvolvendo ficam no bucket local, e **não
  aparecem** no app publicado. Precisa de um arquivo nos dois? Suba duas vezes.

## O que não existe, e como o app contorna

- **Tarefa agendada / cron / worker separado.** Rode dentro do processo
  (`setInterval`, `node-cron`), aceitando que reinicia junto com o app. Para
  fila, BullMQ no mesmo processo.
- **Endereço.** O da plataforma é `<app>.bridgeaibrasil.com.br`, e ele sempre
  responde. O usuário pode acrescentar um domínio dele no painel — o app não
  muda em nada por causa disso: quem roteia é a borda, e o contêiner continua
  recebendo a requisição do mesmo jeito. Não escreva o endereço no código; se
  precisar montar link absoluto, leia do `Host` da requisição.
- **E-mail, SMS, pagamento.** São serviços de fora, com chave pedida por
  `request_variable`.
- **Mais de uma instância.** Um contêiner por ambiente. Estado em memória
  (sessão, cache, contador) sobrevive só até o próximo reinício — e reinício
  acontece.

## Quando "funciona local e quebra publicado"

Nesta ordem, porque é a ordem de frequência: a porta (`PORT`), um caminho de
escrita em disco, uma variável que existe no `.env` e não foi pedida pelo
`request_variable`, o driver `pg` sem `uselibpqcompat`, uma migration que
falhou no arranque. `logs` com `since_minutes` em volta da publicação mostra
qual — e `status` diz se o contêiner sequer ficou de pé.
