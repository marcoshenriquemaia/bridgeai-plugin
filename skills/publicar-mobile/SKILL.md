---
name: publicar-mobile
description: Como testar e distribuir um app de celular feito com Expo na BridgeAI — quando construir um binário novo e quando basta uma atualização por ar, a página de teste permanente, e por que a API precisa estar na nuvem. Use quando o projeto for um app nativo, quando o usuário quiser mostrar o app para outra pessoa testar, ou quando falar em Expo, EAS, TestFlight, Play Store ou App Store.
---

# Publicar e testar um app de celular

## O modelo de desenvolvimento inverte

Num site, o servidor roda na máquina dele e o navegador abre `localhost`. Num app de
celular, o aparelho **não alcança o `localhost` do notebook** — e é aí que quase todo
mundo trava com Expo.

Na BridgeAI isso não acontece: a API fica na nuvem e só o empacotador é local. Grave
`EXPO_PUBLIC_API_URL` apontando para o ambiente `dev` com `dev_credentials`. Não peça
o endereço de rede da máquina dele, não configure túnel para a API, não mande
descobrir IP.

## A regra que decide tudo: construa raro, atualize sempre

O plano gratuito do EAS dá cerca de 30 builds por mês, no máximo 15 de iOS. Parece
pouco e é — se cada mudança virar um build. Mas uma atualização por ar entrega
JavaScript e imagens em segundos, sem build nenhum.

| A mudança é | Como chega |
|---|---|
| Tela, texto, estilo, lógica, chamada de API, imagem | **atualização** — segundos |
| Biblioteca com código nativo | **build** — muda a casca do app |
| Permissão nova (câmera, localização, notificação) | **build** |
| Versão do SDK do Expo | **build**, e testar tudo de novo |

Com isso, um projeto faz um ou dois builds por mês e centenas de atualizações.

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

Não gere um QR novo a cada rodada e não mande arquivo por mensagem. Um build de
teste (`eas build --profile preview`) ganha uma página no expo.dev com o QR e o link
de instalação, e as atualizações por ar chegam nela sem build novo.

**Ele manda esse link uma vez para os testadores e nunca mais precisa mandar nada.**

⚠️ Não existe `registrar_build` nem uma página `/testar` na BridgeAI — a versão
anterior desta skill prometia as duas. O histórico de versões é o do EAS.

## Contas

Só a partir da homologação existe conta no Expo, e ela é **dele**, não da BridgeAI —
cada conta traz o próprio plano gratuito. Entra com GitHub, a mesma do resto:
`eas login -b` abre o navegador.

O build roda a partir da máquina dele, com `--no-wait`. O comando envia o projeto e
a construção acontece nos servidores do Expo. A BridgeAI não guarda credencial do
Expo, e não participa do build.

Conta da Apple (US$ 99/ano) e do Google Play (US$ 25) só aparecem na hora de
publicar nas lojas, e são dele — o app sai no nome dele.

## Publicar nas lojas

Certificado, perfil de provisionamento, ficha da loja, rejeição na revisão: isso é
trabalho de acompanhamento humano, não de automação. Se ele pedir, explique que essa
parte é feita junto com a mentoria e ofereça preparar tudo que dá para preparar antes
— ícone, nome, descrição, capturas de tela, política de privacidade.
