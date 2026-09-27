// O túnel, quando o caminho até a BridgeAI está fechado.
//
// Numa sessão do Claude Code na nuvem, a VM passa por um porteiro de rede que
// recusa domínios fora da lista com 403 e `x-deny-reason: host_not_allowed`. A
// primeira versão lia isso como "a BridgeAI respondeu 403" — e mandava a pessoa
// procurar defeito no lugar que nem recebeu o pedido. O que se afirma aqui é o
// NEGATIVO: a frase antiga não pode voltar.
//
//   node --test plugin/scripts/tunnel.test.js

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const TUNEL = path.join(__dirname, 'tunnel.js');

/** Um porteiro que responde a todo pedido do mesmo jeito. */
function porteiro(status, headers, corpo) {
  const server = http.createServer((_req, res) => {
    res.writeHead(status, headers);
    res.end(corpo);
  });
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r(server)));
}

/** Roda o túnel numa pasta com `.env`, numa porta livre, e devolve o que ele disse. */
function rodar(url) {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'bai-tunel-'));
  fs.writeFileSync(path.join(pasta, '.env'), 'BRIDGEAI_TUNNEL_TOKEN=bai_de_teste\n');
  return new Promise((resolve) => {
    const env = { ...process.env };
    delete env.BRIDGEAI_TOKEN;
    delete env.BRIDGEAI_TUNNEL_TOKEN;
    const p = spawn(process.execPath, [TUNEL, '--dev', '--url', url, '--port', String(40000 + Math.floor(Math.random() * 10000))], { cwd: pasta, env });
    let saida = '';
    p.stdout.on('data', (d) => (saida += d));
    p.stderr.on('data', (d) => (saida += d));
    p.on('close', (code) => {
      fs.rmSync(pasta, { recursive: true, force: true });
      resolve({ code, saida });
    });
  });
}

test('a rede da nuvem recusou: a frase diz que foi a rede, e o que liberar', async () => {
  const s = await porteiro(
    403,
    { 'content-type': 'text/plain', 'x-deny-reason': 'host_not_allowed' },
    'Host not in allowlist: 127.0.0.1.',
  );
  try {
    const { code, saida } = await rodar(`http://127.0.0.1:${s.address().port}`);
    assert.notEqual(code, 0);
    assert.match(saida, /A rede desta máquina bloqueou/);
    assert.match(saida, /Network access "Custom"/);
    assert.match(saida, /br-se1\.magaluobjects\.com/);
    assert.doesNotMatch(saida, /A BridgeAI respondeu/);
  } finally {
    s.close();
  }
});

test('um 403 sem a resposta da BridgeAI não é atribuído a ela', async () => {
  const s = await porteiro(403, { 'content-type': 'text/html' }, '<h1>Forbidden</h1>');
  try {
    const { code, saida } = await rodar(`http://127.0.0.1:${s.address().port}`);
    assert.notEqual(code, 0);
    assert.match(saida, /sem a resposta da BridgeAI/);
    assert.doesNotMatch(saida, /A BridgeAI respondeu/);
  } finally {
    s.close();
  }
});

test('a recusa escrita PELA BridgeAI continua chegando como ela escreveu', async () => {
  const s = await porteiro(
    401,
    { 'content-type': 'application/json' },
    JSON.stringify({ error: 'Acesso vencido. Chame dev_credentials de novo.' }),
  );
  try {
    const { saida } = await rodar(`http://127.0.0.1:${s.address().port}`);
    assert.match(saida, /Acesso vencido\. Chame dev_credentials de novo\./);
  } finally {
    s.close();
  }
});
