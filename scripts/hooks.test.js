// Os dois hooks de PreToolUse, exercitados como o Claude Code os exercita: um
// processo por chamada, o evento no stdin, a decisão no stdout.
//
// O que estes testes afirmam, e que um "funciona" deixaria passar:
//
// 1. **Nenhuma entrada derruba o hook.** Um hook que sai com código 1 quebra a
//    sessão de quem não programa, no meio de uma operação que ele nem pediu.
//    A regra do guardrail é "toda falha inesperada sai em silêncio com 0" — e
//    ela já foi violada por JSON válido que não era objeto (`null`, `42`).
// 2. **`require-approval` fecha, `check-push` abre.** Os dois falham para lados
//    opostos de propósito: o primeiro guarda operação sem volta, e na dúvida
//    nega; o segundo é conveniência, e na dúvida deixa o push seguir.
//
//   node --test plugin/scripts/hooks.test.js

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const roda = (script, entrada) => {
  const r = spawnSync(process.execPath, [path.join(__dirname, script)], {
    input: entrada,
    encoding: 'utf8',
    timeout: 15000,
  });
  return { exit: r.status, out: r.stdout.trim(), err: r.stderr.trim() };
};

const decisao = (out) => {
  if (!out) return null;
  return JSON.parse(out).hookSpecificOutput.permissionDecision;
};

// ---------------------------------------------------------------------------
// require-approval
// ---------------------------------------------------------------------------

const chamada = (tool, input) => JSON.stringify({ tool_name: tool, tool_input: input });

test('require-approval: sem código, nega e explica o caminho', () => {
  const r = roda('require-approval.js', chamada('mcp__bridgeai__remove_app', { app: 'loja' }));
  assert.equal(r.exit, 0);
  assert.equal(decisao(r.out), 'deny');
  const razao = JSON.parse(r.out).hookSpecificOutput.permissionDecisionReason;
  assert.match(razao, /remove_app/);
  assert.match(razao, /painel/);
  assert.match(razao, /Não invente/);
});

test('require-approval: código inventado é o mesmo que nenhum', () => {
  for (const token of ['inventado', 'BAI-abc', 'BAI-12345678X', '']) {
    const r = roda('require-approval.js', chamada('mcp__bridgeai__provision_resource', { approval_token: token }));
    assert.equal(r.exit, 0);
    assert.equal(decisao(r.out), 'deny', `aceitou "${token}"`);
  }
});

test('require-approval: com código no formato do painel, pede confirmação', () => {
  const r = roda('require-approval.js', chamada('mcp__bridgeai__remove_resource', { approval_token: 'BAI-A2B3C4D5' }));
  assert.equal(r.exit, 0);
  assert.equal(decisao(r.out), 'ask');
  assert.match(JSON.parse(r.out).hookSpecificOutput.permissionDecisionReason, /remove_resource/);
});

test('require-approval: entrada que não é objeto NÃO derruba o hook — e fecha', () => {
  // `null` e `42` são JSON válido. Antes, passavam do parse e quebravam em
  // `event.tool_name`, saindo com 1 no meio da sessão de alguém.
  for (const entrada of ['null', '42', '"texto"', '[]']) {
    const r = roda('require-approval.js', entrada);
    assert.equal(r.exit, 0, `derrubou o hook com ${entrada}: ${r.err}`);
    // Um guarda de operação sem volta, na dúvida, nega.
    assert.equal(decisao(r.out), 'deny', `abriu com ${entrada}`);
  }
});

test('require-approval: JSON quebrado sai em silêncio com 0', () => {
  const r = roda('require-approval.js', '{isto não é json');
  assert.equal(r.exit, 0);
  assert.equal(r.out, '');
});

// ---------------------------------------------------------------------------
// check-push
// ---------------------------------------------------------------------------

test('check-push: comando que não é push sai em silêncio', () => {
  for (const cmd of ['git status', 'npm test', 'echo git pushing', 'ls']) {
    const r = roda('check-push.js', JSON.stringify({ tool_input: { command: cmd } }));
    assert.equal(r.exit, 0);
    assert.equal(r.out, '', `falou algo sobre "${cmd}"`);
  }
});

test('check-push: git push nunca é bloqueado — no máximo pergunta', () => {
  // O resultado depende de o `gh` existir e estar logado nesta máquina, e o
  // teste não pode supor nem uma coisa nem outra. O que ele afirma é o
  // contrato: sai com 0, e ou fica calado (segue) ou devolve "ask" — nunca
  // "deny", porque o erro nativo do git é melhor que um guardrail travando.
  const r = roda('check-push.js', JSON.stringify({ tool_input: { command: 'git push origin main' } }));
  assert.equal(r.exit, 0, r.err);
  const d = decisao(r.out);
  assert.ok(d === null || d === 'ask', `decidiu "${d}"`);
});

test('check-push: entrada que não é objeto NÃO derruba o hook — e abre', () => {
  for (const entrada of ['null', '42', '[]', '{isto não é json', '']) {
    const r = roda('check-push.js', entrada);
    assert.equal(r.exit, 0, `derrubou o hook com ${JSON.stringify(entrada)}: ${r.err}`);
    assert.equal(r.out, '', `falou algo com ${JSON.stringify(entrada)}`);
  }
});

// ---------------------------------------------------------------------------
// O hook de SessionStart
// ---------------------------------------------------------------------------

// ⚠️ Aqui existia um aviso de "você ainda não entrou", disparado por
// `BRIDGEAI_TOKEN` estar vazia. Ele saiu em 04/09/2026: quem entra pelo OAuth do
// Claude Code não define variável de ambiente nenhuma, e o aviso passaria a
// aparecer em TODA sessão de quem já está dentro.
//
// O teste afirma a AUSÊNCIA da frase antiga. Afirmar só que as regras carregam
// deixaria a volta dela passar batida.
test('load-platform: não inventa que o usuário está desconectado', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'load-platform.js')], {
    input: JSON.stringify({ hook_event_name: 'SessionStart' }),
    encoding: 'utf8',
    timeout: 15000,
    env: { ...process.env, BRIDGEAI_TOKEN: '' },
  });

  assert.equal(r.status, 0);
  const texto = JSON.parse(r.stdout).hookSpecificOutput.additionalContext;

  assert.ok(texto.includes('BridgeAI'), 'as regras da plataforma não carregaram');
  assert.doesNotMatch(texto, /ainda não está conectado/);
  assert.doesNotMatch(texto, /BRIDGEAI_TOKEN/);
});
