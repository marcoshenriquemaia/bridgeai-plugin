// O login, exercitado contra uma BridgeAI de mentira: um processo por chamada,
// como o Claude o roda pela ferramenta Bash.
//
// O que vale aqui é o NEGATIVO: o token não pode aparecer no stdout. Quem lê o
// stdout deste script é o Claude, e o que o Claude lê vai para o histórico do
// chat. Um teste que só afirmasse "gravou no arquivo" deixaria passar a versão
// do servidor, que imprime o token na tela — e foi dela que este script nasceu.
//
//   node --test plugin/scripts/login.test.js

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const TOKEN = 'bai_prova_NAO_PODE_APARECER_no_chat';

/** Uma BridgeAI que responde `pending` uma vez e depois entrega o token. */
function servidorFalso(roteiro) {
  let tentativas = 0;
  const server = http.createServer((req, res) => {
    const responder = (status, body) => {
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(body));
    };
    if (req.url === '/auth/device') {
      return responder(200, {
        device_code: 'dev-123',
        user_code: 'ABCD-EFGH',
        verification_uri: 'https://github.com/login/device',
        interval: 0,
        expires_in: 30,
      });
    }
    if (req.url === '/auth/device/token') {
      tentativas += 1;
      if (tentativas === 1) return responder(202, { status: 'pending' });
      return roteiro(responder);
    }
    responder(404, { error: 'rota desconhecida' });
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve({ server, porta: server.address().port }));
  });
}

// `spawn`, e não `spawnSync`: o servidor de mentira vive NESTE processo, e o
// síncrono trava o event loop que o atenderia — o script ficava esperando uma
// resposta que só sairia depois de ele terminar.
const roda = (porta, destino) =>
  new Promise((resolve) => {
    const p = spawn(process.execPath, [path.join(__dirname, 'login.js')], {
      timeout: 20000,
      env: {
        ...process.env,
        BRIDGEAI_URL: `http://127.0.0.1:${porta}`,
        BRIDGEAI_LOGIN_DESTINO: destino,
        BRIDGEAI_LOGIN_SEM_NAVEGADOR: '1',
      },
    });
    let stdout = '';
    let stderr = '';
    p.stdout.on('data', (d) => (stdout += d));
    p.stderr.on('data', (d) => (stderr += d));
    p.on('close', (status) => resolve({ status, stdout, stderr }));
  });

test('login: guarda o token no ambiente e NÃO o imprime', async () => {
  const { server, porta } = await servidorFalso((responder) =>
    responder(200, { token: TOKEN, owner: 'dona-alfa', expires_at: '2027-01-01T00:00:00.000Z' }),
  );
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'bai-login-'));
  const destino = path.join(pasta, 'perfil');
  // Uma entrada de um login anterior precisa ser substituída, e não somada.
  fs.writeFileSync(destino, 'export PATH="$PATH:/x"\nexport BRIDGEAI_TOKEN="token-velho"\n');

  try {
    const r = await roda(porta, destino);
    assert.equal(r.status, 0, r.stderr);

    assert.match(r.stdout, /ABCD-EFGH/, 'o código que a pessoa digita precisa aparecer');
    assert.match(r.stdout, /entrou como dona-alfa/);
    assert.match(r.stdout, /Feche e abra o Claude Code/);
    assert.doesNotMatch(r.stdout + r.stderr, new RegExp(TOKEN), 'o token foi para o chat');
    assert.doesNotMatch(r.stdout + r.stderr, /token-velho/);

    const perfil = fs.readFileSync(destino, 'utf8');
    assert.match(perfil, new RegExp(`export BRIDGEAI_TOKEN="${TOKEN}"`));
    assert.doesNotMatch(perfil, /token-velho/, 'a linha do login anterior continuou valendo');
    assert.match(perfil, /export PATH=/, 'apagou o que não era nosso');
  } finally {
    server.close();
    fs.rmSync(pasta, { recursive: true, force: true });
  }
});

test('login: recusa do GitHub sai com 1 e a frase da plataforma, sem gravar nada', async () => {
  const { server, porta } = await servidorFalso((responder) =>
    responder(400, { error: 'Você recusou a autorização no GitHub.' }),
  );
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'bai-login-'));
  const destino = path.join(pasta, 'perfil');

  try {
    const r = await roda(porta, destino);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /recusou a autorização/);
    assert.equal(fs.existsSync(destino), false);
  } finally {
    server.close();
    fs.rmSync(pasta, { recursive: true, force: true });
  }
});
