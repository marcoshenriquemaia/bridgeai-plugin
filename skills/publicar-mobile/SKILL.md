---
name: publicar-mobile
description: Como desenvolver, testar e distribuir um app de celular feito com Expo na BridgeAI — onde a API mora em cada fase, por que o aparelho não alcança o notebook, quando construir um binário novo e quando basta uma atualização por ar, e como o celular manda foto para o armazenamento. Use quando o projeto for um app nativo, quando o usuário quiser mostrar o app para outra pessoa testar, ou quando falar em Expo, EAS, TestFlight, Play Store ou App Store.
---

# App de celular na BridgeAI

## O que muda em relação a um site

Num site, o servidor roda na máquina da pessoa e o navegador abre `localhost` — a
mesma máquina, e por isso funciona sem ninguém pensar.

**Num app de celular o cliente é outro aparelho**, e ele não alcança o `localhost` do
notebook. É aqui que quase todo mundo trava, e é a única coisa deste documento que
você precisa entender antes de escrever a primeira linha.

A BridgeAI resolve a metade dos DADOS desde o primeiro dia: banco, cache e
armazenamento estão na nuvem, e o `.env` do `dev_credentials` já aponta para eles. O
que **não** está na nuvem no ambiente local é a API — ela roda na máquina da pessoa,
por decisão de produto (some o Docker Desktop, que é o que trava mentorado).

Então a pergunta "para onde o app aponta?" tem três respostas, e elas mudam conforme
quem vai segurar o celular.

## Para onde o `EXPO_PUBLIC_API_URL` aponta

| Fase | Quem segura o celular | Aponta para |
|---|---|---|
| Você mexendo, com Expo Go | você, na mesma Wi-Fi | `http://<IP da sua máquina>:3000` |
| Build de teste (`preview`) | o testador, em qualquer lugar | **a URL pública do app na BridgeAI** |
| Loja | o usuário final | **a URL pública, ou o domínio próprio** |

**A partir do build, a API precisa estar na nuvem — não tem contorno.** O aparelho do
testador não está na sua rede, e o seu notebook não fica ligado à noite. Um binário
apontando para um IP de LAN funciona na sua mesa e falha na mão de qualquer outra
pessoa, com uma tela de carregamento que nunca termina e nenhum erro que explique.

Pegue a URL pública com `describe_app` — é o endereço do ambiente (`prod` ou
`staging`) daquele projeto.

⚠️ **Nunca ponha o endereço da LAN num build.** E não peça o IP da máquina antes da
hora: enquanto for Expo Go na mesma Wi-Fi, `npx expo start` já imprime o endereço
certo, e o usuário só precisa copiar o número dele para o `.env` do app.

## O que isso custa, e quando pagar

Publicar a API é o que faz o testador conseguir abrir o app. Diga o número **antes**
de propor, e chame `estimate_cost` para confirmar:

| | Por mês |
|---|---|
| Servidor de 256 MB + banco de produção | **R$ 61,51** |
| Servidor de 512 MB + banco de produção | **R$ 84,18** |
| Armazenamento de 5 GB (fotos) | + R$ 1,65 |

**Não crie produção no dia em que o projeto nasce.** O app começa só com o ambiente
local — API na máquina, dados na nuvem, Expo Go na Wi-Fi — e isso não custa nada além
do ambiente de desenvolvimento que a pessoa já tem. **Produção entra no dia do
primeiro build para outra pessoa**, e é aí que ela paga.

## HTTP na rede local: as duas armadilhas dos sistemas

Enquanto a API estiver na máquina da pessoa, ela é `http://` — e os dois sistemas
desconfiam disso.

- **iOS.** O ATS não é aplicado a conexões de rede local, mas um build de
  desenvolvimento pode precisar de `NSAllowsLocalNetworking`, e o iOS ainda mostra o
  diálogo de permissão de **Rede local** na primeira tentativa. Se o app "não conecta"
  e não há erro, é a permissão negada.
- **Android.** Texto claro é bloqueado desde o Android 9. Em build de desenvolvimento
  o Expo já libera; se você gerar um binário apontando para HTTP, precisa de
  `usesCleartextTraffic` no `expo-build-properties` — e isso é o sinal de que o
  endereço está errado, não de que falta configuração.

**Nada disso existe quando a API está na BridgeAI**: o endereço já é HTTPS com
certificado válido, no primeiro deploy, sem ninguém configurar nada. É a razão
principal de publicar cedo em vez de brigar com a rede local.

## A regra que decide o ritmo: construa raro, atualize sempre

O plano gratuito do EAS dá **30 builds por mês, no máximo 15 de iOS**. Parece pouco e
é — se cada mudança virar um build. Mas uma atualização por ar entrega JavaScript e
imagens em segundos, sem build nenhum.

| A mudança é | Como chega |
|---|---|
| Tela, texto, estilo, lógica, chamada de API, imagem | **atualização** — segundos |
| Biblioteca com código nativo | **build** — muda a casca do app |
| Permissão nova (câmera, localização, notificação) | **build** |
| Versão do SDK do Expo | **build**, e testar tudo de novo |
| **A URL da API** | **build** — ela é embutida no binário |

Com isso, um projeto faz um ou dois builds por mês e centenas de atualizações.

⚠️ **A última linha é a que morde neste contexto.** `EXPO_PUBLIC_*` é substituída no
momento do empacotamento: trocar o endereço da API depois exige binário novo. Decida o
endereço **antes** do primeiro build — é o que evita queimar metade da cota de iOS do
mês corrigindo uma URL.

**Avise antes de sair do caminho fácil.** Quando for sugerir uma biblioteca que traz
código nativo, diga o custo antes de instalar:

> "Essa biblioteca precisa de código nativo. Isso significa que, daqui pra frente,
> cada teste vai exigir gerar o app de novo — uns 20 minutos, e tem limite mensal.
> Tem uma alternativa que não precisa disso; quer que eu use?"

## Recarga instantânea e atualização por ar não coexistem

Enquanto o aparelho está ligado ao empacotador local, o mecanismo de atualização fica
desativado. São dois modos, e o usuário precisa do modelo mental — que cabe em duas
linhas:

> Você mexendo sozinho: a mudança chega em 1 segundo e só você vê.
> Você publicando para o testador: chega em 20 segundos, sem seu computador ligado,
> e todo mundo vê.

## Como o testador recebe

Não gere um QR novo a cada rodada e não mande arquivo por mensagem. Um build de teste
(`eas build --profile preview`) ganha uma página no expo.dev com o QR e o link de
instalação, e as atualizações por ar chegam nela sem build novo.

**Ele manda esse link uma vez para os testadores e nunca mais precisa mandar nada.**

⚠️ Não existe `registrar_build` nem uma página `/testar` na BridgeAI. O histórico de
versões é o do EAS.

## Foto e vídeo: o celular manda direto, e não pela sua API

É o caso mais comum de app de celular e o que mais derruba servidor pequeno: um vídeo
de 40 MB atravessando um contêiner de 256 MB derruba o processo, e com três pessoas
enviando junto derruba sempre.

Na BridgeAI o caminho é outro, e já está pronto: **a API assina um endereço e sai da
frente.** O celular sobe os bytes direto para o armazenamento.

1. O app pede à sua API uma URL de envio;
2. a API chama `POST /storage/sign` com o `STORAGE_TOKEN` do contêiner;
3. o app faz o `PUT` na URL que voltou.

Acima de 5 MB o envio vai em partes (`multipart_create`, `multipart_part`,
`multipart_complete`) — o que importa em celular, onde a rede cai no meio.

A skill `dentro-do-conteiner` tem o formato exato do pedido e o que cada verbo aceita.
**Nunca ponha o `STORAGE_TOKEN` dentro do app**: ele assina para o bucket inteiro do
projeto, e código de app de celular é lido por qualquer um que baixe o arquivo da
loja.

## Notificação

O envio de push é do Expo (`exp.host`), e o contêiner da BridgeAI tem saída para a
internet — então a sua API manda a notificação sem nada especial. O que a plataforma
NÃO tem é agendador próprio: notificação marcada para depois roda dentro do seu
processo (`node-cron`, ou uma fila BullMQ no cache), e reinicia junto com o app.

Guarde o token de push do aparelho no seu banco como qualquer outro dado.

## Link que abre o app (deep link)

Universal Links no iOS e App Links no Android exigem que o **seu domínio** sirva um
arquivo em `/.well-known/`, com o tipo `application/json` e **sem redirecionamento**.
Quem serve é o seu app, na rota que você escrever — o Traefik entrega o caminho como
qualquer outro. Confira depois de publicar: um redirecionamento no meio faz o sistema
desistir em silêncio, e o link volta a abrir o navegador.

## Contas

Só a partir do primeiro build existe conta no Expo, e ela é **dele**, não da BridgeAI —
cada conta traz o próprio plano gratuito. Entra com GitHub, a mesma do resto:
`eas login -b` abre o navegador.

O build roda a partir da máquina dele, com `--no-wait`. O comando envia o projeto e a
construção acontece nos servidores do Expo. A BridgeAI não guarda credencial do Expo,
e não participa do build.

Conta da Apple (US$ 99/ano) e do Google Play (US$ 25) só aparecem na hora de publicar
nas lojas, e são dele — o app sai no nome dele.

## Publicar nas lojas

Certificado, perfil de provisionamento, ficha da loja, rejeição na revisão: isso é
trabalho de acompanhamento humano, não de automação. Se ele pedir, explique que essa
parte é feita junto com a mentoria e ofereça preparar tudo que dá para preparar antes
— ícone, nome, descrição, capturas de tela, política de privacidade.

## Antes do primeiro build, confira estas cinco

1. O endereço da API no `.env` do app é o **público** da BridgeAI, e não um IP.
2. O app responde 200 no `health_path` publicado (`status` mostra).
3. O que era `http://` virou `https://` em todo lugar — inclusive imagens.
4. O `STORAGE_TOKEN` **não** está no código do app.
5. Se o app fala com o banco, ele fala **pela sua API** — nunca direto. O banco não
   tem endereço público, e o túnel não abre para produção.
