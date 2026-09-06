---
description: Põe o projeto no ar — cria o repositório se faltar, escreve o workflow e publica
---

Você vai levar este projeto do computador dele até o ar, sem mandar ele abrir
nenhuma página de configuração. **Não existe token para colar em lugar nenhum**: a
Action se identifica sozinha com um crachá assinado pelo GitHub, e a BridgeAI
confere a assinatura. Se você se pegar explicando "Settings → Secrets", pare — essa
instrução é de antes de 04/09/2026 e está errada.

O que ainda é dele: autorizar o `gh` na primeira vez, se ele nunca usou.

---

## 1. Qual app

`list_apps`. Se houver um só, é ele — não pergunte. Se houver vários, pergunte qual.
Se não houver nenhum, **não invente**: o app precisa existir antes, e quem cria é
`create_app` (`/bridgeai:comecar` faz isso). Diga isso e pare.

Guarde o **id** do app. É ele que vai no workflow.

## 2. O repositório

```
git rev-parse --is-inside-work-tree ; git remote get-url origin
```

- **Sem repositório git**: `git init`, `.gitignore` que exclua `.env` e
  `node_modules`, e um primeiro commit.
- **Sem `origin`**: crie com `gh repo create <nome> --private --source=. --remote=origin --push`.
  Se o `gh` não estiver autenticado, rode `gh auth login` e conduza — é login no
  navegador, igual ao da BridgeAI.
- **Com `origin`**: siga.

⚠️ **O dono do repositório precisa ser o dono do app.** O vínculo automático
funciona porque o crachá prova que os dois são a mesma conta do GitHub. Se o
repositório for de uma **organização** (`github.com/acme/...`) e o app for pessoal,
o vínculo não acontece — e não deve. Nesse caso, e só nesse, o caminho é o token de
publicação do painel: ele continua existindo. Diga isso com todas as letras em vez
de deixar a Action falhar com 404.

## 3. O Dockerfile

Se não existir, escreva um seguindo a skill **`dentro-do-conteiner`** — ela é o
contrato do que roda lá: o app escuta em `process.env.PORT` (a plataforma manda
`3000`), o disco é somente leitura, a migration roda no `CMD` antes do servidor,
e arquivo vai para o armazenamento por URL assinada. Um Dockerfile que ignora
isso sobe saudável e o site responde 502.

Confira que o caminho de saúde responde 200 — `describe_app` diz qual é, e
`set_health_path` muda se você criou a rota em outro lugar.

## 4. O workflow

Copie `${CLAUDE_PLUGIN_ROOT}/templates/publicar.yml` para
`.github/workflows/publicar.yml` e **troque `APP_ID_AQUI` pelo id do app**. Confira
também o `BRIDGEAI_AMBIENTE` (quase sempre `prod`).

Não mexa em `permissions:` — sem `id-token: write` a Action não consegue pedir o
crachá, e a publicação para no primeiro passo.

## 5. Publicar

Commit e `git push` na branch principal. A Action dispara sozinha.

Acompanhe com `gh run watch --exit-status` em vez de mandar ele abrir a aba Actions.
Leva uns 30 segundos; **a primeira vez leva cerca de um minuto**, porque ela cria o
contêiner, rotaciona as credenciais e entrega o que ele já guardou no painel.

Na primeira publicação a Action escreve uma linha dizendo que o repositório foi
vinculado ao app. Repasse: é o que explica por que nunca mais vai pedir nada.

## 6. Conferir, e só então dar o endereço

`status`. Só depois de ele dizer que o app está no ar, mande
`https://<app>.bridgeaibrasil.com.br`. Mandar antes faz ele abrir, ver erro e achar
que quebrou.

---

## Quando falhar

Leia o log com `gh run view --log-failed` e traduza. Os que aparecem:

- **"Falta 'permissions: id-token: write'"** — o workflow foi editado. Reponha.
- **"Não encontrei o app … na conta …"** — o dono do repositório não é o dono do
  app. Quase sempre é repositório de organização; ver o aviso do passo 2.
- **"O app … publica do repositório X"** — o app já está vinculado a outro
  repositório. Trocar é decisão dele, e o caminho é o token do painel.
- **`healthy: false`** — a imagem subiu e o contêiner está de pé, mas o app não
  respondeu no caminho de saúde a tempo. Não republique: leia `logs`.

Se parar no meio, diga em que passo, o que já funcionou, e o que falta.

$ARGUMENTS
