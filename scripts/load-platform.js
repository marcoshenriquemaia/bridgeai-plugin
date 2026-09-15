#!/usr/bin/env node
// O que ainda precisa ser MEDIDO nesta máquina no início de cada sessão.
//
// ## ⚠️ As regras da plataforma NÃO saem mais daqui — 15/09/2026
//
// Até hoje este hook carregava `rules/platform.md` e `rules/guided.md`. Elas
// passaram para o campo `instructions` do servidor MCP (`mcp/src/platform-rules.ts`),
// e as duas pastas foram removidas deste repositório.
//
// A razão não é arrumação: elas só existiam para quem instalasse o plugin — dois
// comandos de chat, um marketplace do GitHub, e um reinício em toda versão do
// Claude Code anterior à 2.1.221. Quem usa Codex, Cursor ou qualquer outro
// cliente MCP não recebia regra nenhuma e passava a supor. Pelo `instructions`,
// o mesmo texto chega em toda sessão de todo cliente conectado, sem instalar
// nada.
//
// ⚠️ **E por isso este arquivo não pode voltar a carregá-las**: o servidor já
// as manda. Duas cópias seriam ~23 mil tokens repetidos em toda conversa de
// quem tem o plugin — o dobro do custo por zero conteúdo novo. `hooks.test.js`
// afirma essa ausência.
//
// ## O que sobrou, e por que ele não cabe no servidor
//
// As portas locais que ficaram de pé. Um servidor MCP roda em outro computador:
// ele não tem como saber que o `npm run dev` da sessão passada continua vivo na
// 3000, nem que um Postgres tomou a 55432 — e é justamente esse segundo caso
// que faz a próxima migration ir para o banco errado, sem erro nenhum.
//
// Medir isso exige estar na máquina, e é a única coisa aqui que exige.
//
// Regra de ouro herdada do guardrail: hook que derruba a sessão é pior que hook
// nenhum. Qualquer falha aqui sai em silêncio.

/**
 * As portas locais que sobraram da sessão anterior.
 *
 * Este é o pedaço que resolve o problema de verdade, e ele precisa ser MEDIDO
 * aqui e não lido de um arquivo: a sessão que deixou o servidor rodando não
 * escreveu "fechei" em lugar nenhum, e a que fechou pode ter sido morta com a
 * janela. Ver `scripts/portas.js`.
 *
 * Silencioso quando não há nada de pé — o custo em contexto tem que ser zero
 * para quem começou a máquina limpa, senão isto vira uma linha que se aprende a
 * ignorar.
 */
async function portasAbertas() {
  try {
    const portas = require('./portas.js');
    return portas.resumo(await portas.reconciliar());
  } catch {
    return '';
  }
}

async function main() {
  const texto = await portasAbertas();
  if (!texto) return;

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext: texto,
    },
  }));
}

main().catch(() => process.exit(0));
