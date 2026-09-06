---
description: Mostra quanto o projeto está custando e no que dá para economizar
---

Responda a pergunta "quanto estou gastando?" com números reais da plataforma, nunca
com estimativa de mercado. Chame `current_cost` e `describe_app`.

---

## O que mostrar

**1. O saldo e o fôlego, antes de tudo.** Quanto tem na conta e quantos dias isso
dura no ritmo atual, com a data — `current_cost` dá os dois. "R$ 63" não diz nada
para quem não sabe quanto custa um servidor; "dura uns 6 dias, até 8 de setembro"
diz.

**2. O mês até agora, e a projeção.** Quanto já foi e quanto deve fechar. Sempre em
reais por mês. Não compare com preço de plano: plano não é preço, e não existe teto
de fatura — quem limita é o saldo.

**3. Onde o dinheiro está.** Um recurso por linha, do maior para o menor. Se um item
sozinho é mais da metade da conta, diga isso — é onde vale mexer.

**Se o fôlego for menor que sete dias, diga o que acontece** e onde recarregar
(https://painel.bridgeaibrasil.com.br): acabando o saldo há três dias de carência,
depois os apps da conta pausam, nada é apagado, e recarregar religa. Sem drama, e
sem esconder.

**O que dá para cortar.** Recurso provisionado e sem uso, ambiente que ninguém
abre há semanas, tamanho maior do que o consumo real justifica. **Com o valor da
economia.** Se não houver nada a cortar, diga que está enxuto — é uma informação
boa, não uma resposta vazia.

**Ambiente parado é a linha mais fácil de esquecer.** Cada ambiente é um banco de
dados próprio e custa cerca de R$ 39/mês. Homologação que ninguém abre há um mês
é dinheiro correndo — **diga o valor**. O ambiente local do usuário, não: é onde
ele desenvolve.

⚠️ **Mas não ofereça tirar: a plataforma não sabe.** Apagar o banco de um
ambiente apagaria os dados dele, e o único caminho de eliminação é `remove_app`,
que leva o projeto inteiro. Mostrar o número e dizer que reduzir aquilo passa
pelo suporte é honesto; prometer o corte e descobrir na hora que não dá é o
gesto que faz alguém parar de confiar na conta.

## Se o projeto for de um cliente

Quando o `current_cost` disser que este projeto tem **crédito próprio, pago por
um responsável financeiro**, a conversa muda de assunto:

- Os números são do projeto, não do bolso do usuário. Não misture com o saldo da
  conta dele.
- **Não mande recarregar.** Ele já passou essa conta adiante. Se o crédito estiver
  acabando, o que ele pode fazer é avisar quem paga — e o responsável já recebe
  e-mail automático, com o link.
- Se a ferramenta avisar que **não há link de pagamento vigente**, isso é urgente
  e dê destaque: sem link o responsável não recebe aviso nenhum e não tem como
  pagar. Ele gera um no painel, na página do projeto.

E se o projeto ainda é do usuário mas foi feito para outra pessoa, conte que dá
para passar a conta adiante: painel → o projeto → "Quem paga". Ele define o
e-mail do cliente, gera um link, e o cliente paga direto por Pix ou cartão sem
precisar de conta nenhuma.

## Como falar

O tom é de quem administra o dinheiro do outro com cuidado, não de quem vende. Se o
projeto está pequeno demais para o plano, recomende descer. Se algo em outro lugar
sairia de graça e serve, diga.

Nada de tabela de bytes, hora de CPU ou unidade que ele não usa no dia a dia.
"Seu banco está com 1,2 GB" é útil. "18.400 IOPS" não é.

## Se ele perguntar sobre uma mudança específica

Chame `estimate_cost` e responda com os dois números — o de hoje e o de depois:

> "Adicionar cache custa R$ 7 por mês. Sua conta vai de R$ 88 para R$ 95."

E se você achar que não vale a pena, diga antes dele perguntar.

$ARGUMENTS
