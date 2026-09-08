// O registro de portas locais, exercitado com portas de verdade.
//
// O que estes testes afirmam, e que um "funciona" deixaria passar:
//
// 1. **"Fechado" sai da MEDIÇÃO, nunca do arquivo.** Uma porta anotada em que
//    ninguém atende some do registro sozinha — é o caso normal (a janela foi
//    fechada, a máquina reiniciou), e um registro que só some por comando
//    explícito estaria errado na maioria das vezes.
// 2. **Dono trocado é um estado próprio.** É o caso perigoso do túnel: a porta
//    está de pé e quem atende é OUTRO processo, então o `.env` do projeto
//    aponta para um banco que não é o nosso — sem erro nenhum.
// 3. **Não existe comando de matar.** Se alguém acrescentar um, este teste
//    reprova — e a conversa sobre PID reciclado acontece antes, e não depois de
//    alguém derrubar um processo alheio.
//
//   node --test plugin/scripts/portas.test.js

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const net = require('node:net');
const path = require('node:path');

const portas = require('./portas.js');

const arquivoNovo = () =>
  path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'bai-portas-')), 'portas.json');

/** Sobe um servidor de mentira numa porta livre e devolve a porta. */
const servidorEfemero = () =>
  new Promise((resolve) => {
    const s = net.createServer(() => {});
    s.listen(0, '127.0.0.1', () => resolve({ porta: s.address().port, fechar: () => s.close() }));
  });

/** Uma porta que ninguém atende: abre, mede o número e fecha antes de usar. */
const portaLivre = async () => {
  const s = await servidorEfemero();
  s.fechar();
  return s.porta;
};

// ---------------------------------------------------------------------------

test('anota a abertura e lê de volta', () => {
  const arquivo = arquivoNovo();
  portas.anotarAbertura(
    { porta: 3000, oQue: 'servidor local', projeto: 'C:\\projetos\\loja', pid: 4242 },
    arquivo,
  );

  const { portas: registro } = portas.ler(arquivo);
  assert.equal(registro['3000'].oQue, 'servidor local');
  assert.equal(registro['3000'].pid, 4242);
  assert.ok(Date.parse(registro['3000'].desde) > 0);
});

test('porta inválida é recusada em vez de virar lixo no registro', () => {
  const arquivo = arquivoNovo();
  assert.throws(() => portas.anotarAbertura({ porta: 0 }, arquivo));
  assert.throws(() => portas.anotarAbertura({ porta: 99999 }, arquivo));
  assert.throws(() => portas.anotarAbertura({ porta: 'abc' }, arquivo));
  assert.deepEqual(portas.ler(arquivo).portas, {});
});

test('registro corrompido não derruba nada — volta vazio', () => {
  const arquivo = arquivoNovo();
  fs.writeFileSync(arquivo, '{isto não é json', 'utf8');
  assert.deepEqual(portas.ler(arquivo).portas, {});

  // JSON válido que não é o nosso formato entra pelo mesmo caminho.
  fs.writeFileSync(arquivo, '42', 'utf8');
  assert.deepEqual(portas.ler(arquivo).portas, {});
});

test('fechar uma porta que não estava anotada devolve false, e não inventa', () => {
  const arquivo = arquivoNovo();
  assert.equal(portas.anotarFechamento(3000, arquivo), false);
});

// ---------------------------------------------------------------------------
// A medição — o que separa o registro de uma promessa

test('porta em que ninguém atende sai do registro sozinha', async () => {
  const arquivo = arquivoNovo();
  const porta = await portaLivre();
  portas.anotarAbertura({ porta, oQue: 'servidor da sessão passada' }, arquivo);

  const linhas = await portas.reconciliar({ arquivo });
  assert.equal(linhas.length, 1);
  assert.equal(linhas[0].estado, 'fechado');

  // E o registro foi limpo: a próxima sessão não herda a afirmação velha.
  assert.deepEqual(portas.ler(arquivo).portas, {});

  // O resumo não fala de porta fechada. Um relatório que lista o que já não
  // existe é o que se aprende a ignorar.
  assert.equal(portas.resumo(linhas), '');
});

test('porta de pé é reportada, com desde quando e para que serve', async () => {
  const arquivo = arquivoNovo();
  const s = await servidorEfemero();
  try {
    portas.anotarAbertura(
      { porta: s.porta, oQue: 'túnel do banco (serve todos os projetos)', pid: process.pid },
      arquivo,
    );

    const linhas = await portas.reconciliar({ arquivo });
    assert.equal(linhas[0].estado, 'de-pe');

    const texto = portas.resumo(linhas);
    assert.match(texto, new RegExp(String(s.porta)));
    assert.match(texto, /túnel do banco/);

    // E ela continua anotada: só o que morreu é limpo.
    assert.ok(portas.ler(arquivo).portas[String(s.porta)]);
  } finally {
    s.fechar();
  }
});

test('quem atende deixou de ser o processo anotado: isso é OUTRO estado', async () => {
  const arquivo = arquivoNovo();
  const s = await servidorEfemero();
  try {
    // Quem escuta é este processo; o registro diz que era outro.
    portas.anotarAbertura({ porta: s.porta, oQue: 'túnel do banco', pid: process.pid + 1 }, arquivo);

    const [linha] = await portas.reconciliar({ arquivo });

    if (linha.donoAgora === null) {
      // Máquina sem `netstat`/`lsof`, ou sem permissão para ler o dono. Não
      // saber é um estado legítimo — e o certo aqui é NÃO afirmar troca de
      // dono, em vez de deduzir do arquivo.
      assert.equal(linha.estado, 'de-pe');
      return;
    }

    assert.equal(linha.donoAgora, process.pid);
    assert.equal(linha.estado, 'outro-dono');
    assert.match(portas.resumo([linha]), /NÃO pelo processo anotado/);
  } finally {
    s.fechar();
  }
});

// ---------------------------------------------------------------------------

test('não existe comando de matar processo, e isso é de propósito', () => {
  const nomes = Object.keys(portas).join(' ').toLowerCase();
  assert.doesNotMatch(nomes, /matar|kill|encerrar|derrubar/);

  const fonte = fs.readFileSync(path.join(__dirname, 'portas.js'), 'utf8');
  assert.doesNotMatch(fonte, /taskkill|SIGKILL|SIGTERM/);

  // `process.kill(pid, 0)` é a exceção, e não é matar: o sinal 0 só pergunta se
  // o processo existe. Qualquer outro sinal reprova a linha acima.
  assert.match(fonte, /process\.kill\(pid, 0\)/);
});

test('o resumo diz para conferir o PID que ESTÁ atendendo, não o anotado', async () => {
  const arquivo = arquivoNovo();
  const s = await servidorEfemero();
  try {
    portas.anotarAbertura({ porta: s.porta, oQue: 'servidor local', pid: process.pid }, arquivo);
    const texto = portas.resumo(await portas.reconciliar({ arquivo }));
    assert.match(texto, /nunca o anotado/);
    assert.match(texto, /recicla PID/);
  } finally {
    s.fechar();
  }
});
