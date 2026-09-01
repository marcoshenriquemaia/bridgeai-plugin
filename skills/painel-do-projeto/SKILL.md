---
name: painel-do-projeto
description: Como criar um painel administrativo ou de métricas na BridgeAI — o manifesto declarativo, o que ele cobre, e como fazer botões que executam regra de negócio sem abrir mão da validação. Use quando o usuário quiser gerenciar dados (produtos, pedidos, cadastros), ver números do projeto, ou pedir um CMS, admin, dashboard ou área administrativa.
---

# Painel do projeto

O usuário quase sempre precisa de duas coisas: **mexer nos dados** (cadastrar
produto, mudar preço, ver pedido) e **ver números** (quantas vendas, quantos
cadastros). A BridgeAI gera os dois a partir do schema do banco.

## Você descreve, a plataforma executa

Você **não escreve código de servidor** para o painel. Você escreve um manifesto:
quais consultas, quais componentes, quais permissões. A BridgeAI valida as consultas
— tabelas permitidas, limite obrigatório, só leitura por padrão — e renderiza.

Isso não é limitação de expressividade: você compõe qualquer combinação de tabela,
gráfico, indicador e formulário, com qualquer consulta que passe na validação. É
limitação de *superfície*, e é o que impede que um painel gerado automaticamente
vire uma porta aberta para o banco de um cliente.

Fluxo: leia o schema com `describe_app`, monte o manifesto, chame
`publicar_dashboard`. Sai em `<app>-admin.bridgeaibrasil.com.br`, com login e papéis próprios,
separado da autenticação do app.

## Comece pelo que ele falou

Não gere um painel com tudo que existe no banco. Ele disse "quero gerenciar meus
produtos e ver os pedidos" — faça exatamente isso, bem-feito. Tabela de produtos com
busca, formulário de edição, lista de pedidos com filtro. Mais telas depois, se ele
pedir.

Campo de imagem usa upload assinado direto para o armazenamento. Nunca coloque
credencial de bucket no navegador.

## Quando o botão precisa fazer algo de verdade

"Marcar como enviado" que também baixa estoque e dispara e-mail não é edição de
registro, é regra de negócio. O painel **não** executa isso.

O botão chama um endpoint do app dele — `POST /api/admin/pedidos/:id/enviar` — e a
regra fica no código do projeto, onde você escreve à vontade e onde ela pertence.
Declare o botão no manifesto apontando para a rota, e implemente a rota no app.

Essa separação é o que mantém o painel seguro: ele mostra dados e dispara ações
nomeadas, nunca executa lógica arbitrária com acesso ao banco.

## Versione

Todo manifesto publicado vira uma versão. Se uma mudança quebrar o painel, o usuário
volta em um clique. Diga isso a ele quando publicar a primeira vez — saber que dá
para desfazer é o que faz alguém não-técnico ter coragem de pedir mudanças.

## Ao entregar

Mande o endereço e diga o que ele consegue fazer ali, em uma frase por tela. Não
explique o manifesto, não mostre a consulta, não fale em schema. Ele quer saber que
consegue cadastrar produto e ver quem comprou.
