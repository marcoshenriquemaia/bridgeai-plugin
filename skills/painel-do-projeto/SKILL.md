---
name: painel-do-projeto
description: Como fazer um painel administrativo ou de métricas para um projeto hospedado na BridgeAI — onde ele mora, o que não pode ir para o navegador, e como fazer botões que executam regra de negócio sem abrir mão da validação. Use quando o usuário quiser gerenciar dados (produtos, pedidos, cadastros), ver números do projeto, ou pedir um CMS, admin, dashboard ou área administrativa.
---

# Painel do projeto

O usuário quase sempre precisa de duas coisas: **mexer nos dados** (cadastrar
produto, mudar preço, ver pedido) e **ver números** (quantas vendas, quantos
cadastros).

⚠️ **A BridgeAI não gera painel.** Não existe `publicar_dashboard`, manifesto nem
endereço `-admin` — a versão anterior desta skill descrevia um produto que nunca
foi construído. O painel é código do app dele, e quem escreve é você.

## Onde ele mora

Dentro do próprio app, numa rota `/admin`, no mesmo repositório e na mesma
publicação. Sem segundo serviço, sem segundo domínio, sem custo novo — e diga isso a
ele: **não custa nada a mais**. Leia o schema com `describe_app` antes de desenhar,
em vez de perguntar o que existe no banco.

## Comece pelo que ele falou

Não gere um painel com tudo que existe no banco. Ele disse "quero gerenciar meus
produtos e ver os pedidos" — faça exatamente isso, bem-feito. Tabela de produtos com
busca, formulário de edição, lista de pedidos com filtro. Mais telas depois, se ele
pedir.

## As três regras que não mudam

- **Login próprio, separado do login dos clientes do site.** Quem entra no painel é
  o dono e quem ele autorizar; um cliente da loja nunca pode chegar lá por ter conta
  na loja.
- **Toda consulta passa pelo servidor do app**, com limite de linhas e validação
  do que veio do formulário. O navegador nunca fala com o banco, e o painel nunca
  monta SQL a partir de texto digitado.
- **Imagem sobe pelo armazenamento do app, por URL assinada.** O servidor pede a
  URL à plataforma (o contêiner já tem `STORAGE_TOKEN` e `STORAGE_SIGN_URL` no
  ambiente) e entrega ao navegador, que sobe o arquivo direto. Credencial de
  armazenamento nunca vai ao navegador — o app nem tem uma. O formato do pedido
  está na skill `dentro-do-conteiner`; e **nunca grave em `./uploads`**: o
  disco do servidor é somente leitura.

## Quando o botão precisa fazer algo de verdade

"Marcar como enviado" que também baixa estoque e dispara e-mail não é edição de
registro, é regra de negócio. Ela mora num endpoint do app —
`POST /api/admin/pedidos/:id/enviar` — com a mesma autenticação do painel, e o
botão só chama a rota. Regra de negócio dentro do componente da tela é regra que a
próxima tela reescreve diferente.

## Ao entregar

Publique como qualquer mudança (a Action do repositório), confira com `status`, e
mande o endereço dizendo o que ele consegue fazer ali, em uma frase por tela. Não
explique a rota, não mostre a consulta, não fale em schema. Ele quer saber que
consegue cadastrar produto e ver quem comprou.
