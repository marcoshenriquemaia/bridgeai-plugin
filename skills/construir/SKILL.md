---
name: construir
description: Construir um projeto a partir de um plano do Arquiteto da BridgeAI — o id colado tem o formato P-XXXXXX. Use quando o usuário colar um plano, ou disser "vou construir o projeto X na BridgeAI". Ela diz como buscar o plano, o que fazer com o recorte, as cores e os itens já escolhidos, em que ordem criar o projeto e subir o ambiente de desenvolvimento, e o que NÃO perguntar de novo.
---

# Construir a partir de um plano

O usuário conversou com o Arquiteto da BridgeAI antes de falar com você. Ele
descreveu a ideia, respondeu perguntas sobre o que o projeto precisa fazer, e
escolheu cores e formato de botão **vendo exemplos na tela** — que é a única
forma que funciona com quem não é designer.

Esse trabalho está gravado. Ele colou o id para você buscar.

```
project_plan(plan_id: "P-XXXXXX")
```

⚠️ **Busque ANTES de escrever qualquer linha de código, e antes de perguntar
qualquer coisa.** Refazer a entrevista é o pior começo possível: ele acabou de
responder, e repetir diz que a plataforma não guardou nada.

Se as ferramentas `mcp__bridgeai__*` não aparecerem, o plugin não está instalado
ou ninguém entrou. `/bridgeai:entrar` resolve, e o plano continua lá — ele não
expira.

## O que o plano já decidiu, e você não reabre

| | |
|---|---|
| **O que ele confirmou** | A resposta traz a fala de fechamento: o projeto descrito nas palavras dele, por que o recorte é esse, e por que cada peça cobrada existe. **É a parte mais útil do plano** — as listas dizem o QUE, e ela diz o PORQUÊ. Ele já leu e concordou com ela na tela |
| **O recorte** | O que fica de pé primeiro e o que fica para depois. Construa **só a primeira lista**. Ela foi escolhida para caber em duas semanas, e juntar tudo é como um projeto vira oito meses e nenhum site no ar |
| **As cores** | Vêm em hexadecimal, na ordem fundo, tinta, destaque, apoio, extra. Use **desde a primeira tela**. Começar no cinza padrão do framework joga fora a metade mais cara da conversa |
| **O formato** | Botão e campo: arredondado, reto, pílula ou contorno. Uma decisão de CSS, e ele já a tomou |
| **A stack** | O que o Arquiteto escolheu sabendo o que a plataforma roda. Se você discordar, **diga o motivo antes de trocar** — não troque calado |
| **Os itens** | Servidor, banco, cache e armazenamento, já normalizados pelo catálogo. São os argumentos do `create_app`, prontos na resposta |

O que o plano **não** decidiu, e você combina com ele: o **id do projeto** (curto,
minúsculas e hífen — vira o endereço `<id>.bridgeaibrasil.com.br`) e o nome das
tabelas, rotas e arquivos.

## A ordem

**1. Buscar o plano.** Leia em voz alta o que ele vai ganhar primeiro e quanto
vai custar por mês. ⚠️ O número da resposta é o do catálogo de **hoje**, e não o
do dia em que ele fechou a conversa — diga o de hoje.

⚠️ **E não repita a fala de fechamento de volta para ele.** Ele acabou de ouvir
aquilo, palavra por palavra, e concordou — repetir diz que você não leu. Ela
está ali para VOCÊ saber por que o projeto é assim.

**2. Criar o projeto**, se a resposta disser que ele ainda não existe.
`create_app` com os argumentos que vieram prontos. São duas chamadas: a primeira
devolve um link para ele autorizar, a segunda executa. Abra o link no navegador
dele e chame `aguardar_aprovacao` — **ele não copia código nenhum**.

Se a resposta disser que o plano **já virou um projeto**, não crie outro:
`describe_app` e continue de onde parou.

**3. Escrever o `CLAUDE.md` do projeto** com a seção da plataforma
(`${CLAUDE_PLUGIN_ROOT}/templates/projeto.md`, trocando `<app>` pelo id).
Acrescente no fim se o arquivo já existir; nunca sobrescreva. Isto alcança quem
o plugin não alcança — um colaborador que clonou, outro agente, ele em outra
máquina.

**4. Subir o ambiente de desenvolvimento** — a seção abaixo.

**5. Construir a primeira lista**, e só ela.

**6. Publicar** quando a primeira lista estiver de pé: `/bridgeai:publicar`. Não
deixe para o fim de tudo — um site no ar cedo é o que faz ele acreditar que o
projeto existe.

## O ambiente de desenvolvimento

**Ninguém instala Docker, Postgres nem Redis.** O servidor roda na máquina dele;
banco, cache e armazenamento ficam na nuvem, por um túnel. A ordem importa:

1. `dev_credentials` — grava o `.env`, que já traz o acesso que o túnel usa.
2. `node "${CLAUDE_PLUGIN_ROOT}/scripts/tunnel.js" --dev`, em segundo plano.
3. `npm install && npm run dev`.

⚠️ **O `.env` vem ANTES do túnel**, e não é preferência: o token do túnel nasce
ali. Ao contrário, ele sobe sem acesso e a mensagem não diz por quê.

Se `dev_credentials` recusar, o ambiente de desenvolvimento está **desligado na
conta dele**. A ferramenta diz onde ligar. ⚠️ Ligar **custa dinheiro por mês**,
então quem decide é ele — não ligue por ele, e não contorne com Docker.

**Um túnel só, para todos os projetos dele.** Quem já está com um aberto não
precisa de outro.

## As portas

Servidor e túnel continuam rodando depois que a conversa acaba. **Antes de subir
qualquer um dos dois:**

```
node "${CLAUDE_PLUGIN_ROOT}/scripts/portas.js"
```

Ele mede as portas na hora e diz de qual projeto cada uma é. Anote o que **você**
subir:

```
node "${CLAUDE_PLUGIN_ROOT}/scripts/portas.js" abrir --porta 3000 --o-que "servidor de desenvolvimento" --pid <pid>
```

Três regras, e as três já custaram tempo de alguém:

- ⚠️ **Porta ocupada NÃO é motivo para abrir outra.** Um app na porta de trás
  enquanto ele olha a da frente faz ele concluir que a sua mudança não
  funcionou. Descubra o que está lá — quase sempre é o processo dele mesmo, de
  ontem.
- ⚠️ **Se algo atende na porta do túnel e não é o nosso túnel, pare e diga.** O
  `.env` aponta para lá: o que estiver do outro lado recebe as consultas e as
  migrations, **sem erro nenhum aparecer**.
- **Nunca encerre um processo sem confirmar com ele**, e confira o PID que está
  atendendo AGORA — nunca o anotado. O sistema recicla PID: matar o número de
  ontem é matar um processo qualquer de hoje.

## Antes de escrever a primeira linha

- `describe_schema` antes de qualquer SQL ou migration. Chutar `created_at` onde
  a coluna é `criado_em` é o erro mais comum de quem não olhou.
- A skill **`dentro-do-conteiner`** antes de escrever o Dockerfile, uma rota de
  upload, uma fila, um cron ou a migration de produção. O que o servidor exige
  publicado não aparece na máquina dele, e o modo de falha é: funciona aqui,
  quebra lá, e o erro não aponta a causa.

## Como falar com ele

Ele não é técnico — foi por isso que o Arquiteto existiu. Diga o que você está
fazendo em resultado, e não em tecnologia: "estou montando a tela que lista as
peças" e não "criei o componente de listagem com SSR".

E **não elogie a escolha dele a cada passo**. No dia em que você precisar dizer
"isso vai dar trabalho", é a sua franqueza acumulada que faz ele acreditar.
