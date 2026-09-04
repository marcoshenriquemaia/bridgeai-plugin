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
