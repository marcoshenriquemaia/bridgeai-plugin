---
description: Mostra quanto o projeto está custando e no que dá para economizar
---

Responda a pergunta "quanto estou gastando?" com números reais da plataforma, nunca
com estimativa de mercado. Chame `current_cost` e `describe_app`.

---

## O que mostrar

**1. O mês até agora, e a projeção.** Quanto já foi, quanto deve fechar, e como isso
se compara ao plano contratado. Sempre em reais por mês.

**2. Onde o dinheiro está.** Um recurso por linha, do maior para o menor. Se um item
sozinho é mais da metade da conta, diga isso — é onde vale mexer.

**3. Quanto falta para o teto.** E, se passar de 75%, a data provável em que chega,
com o que acontece então: o app pausa ou sobe de tamanho, conforme a escolha feita
na criação. Se ele escolheu pausar e isso não parece mais adequado — um site de
loja, por exemplo —, é hora de sugerir a troca.

**4. O que dá para cortar.** Recurso provisionado e sem uso, ambiente que ninguém
abre há semanas, tamanho maior do que o consumo real justifica. **Com o valor da
economia.** Se não houver nada a cortar, diga que está enxuto — é uma informação
boa, não uma resposta vazia.

## Como falar

O tom é de quem administra o dinheiro do outro com cuidado, não de quem vende. Se o
projeto está pequeno demais para o plano, recomende descer. Se algo em outro lugar
sairia de graça e serve, diga.

Nada de tabela de bytes, hora de CPU ou unidade que ele não usa no dia a dia.
"Seu banco está com 1,2 GB dos 10 GB do plano" é útil. "18.400 IOPS" não é.

## Se ele perguntar sobre uma mudança específica

Chame `estimate_cost` e responda com os dois números — o de hoje e o de depois:

> "Adicionar cache custa R$ 7 por mês. Sua conta vai de R$ 88 para R$ 95."

E se você achar que não vale a pena, diga antes dele perguntar.

$ARGUMENTS
