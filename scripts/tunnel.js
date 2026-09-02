#!/usr/bin/env node
// A ponta local do túnel da BridgeAI.
//
// Abre um `127.0.0.1:5432` na máquina da pessoa e liga cada conexão que chegar
// nele ao banco do projeto, por dentro do WebSocket do servidor MCP. Para o
// Prisma, o `psql` e qualquer driver, aquilo é um Postgres comum na máquina.
//
//   node tunnel.js --app loja-do-joao --environment dev
//
// Por que ele existe: o banco da plataforma só tem endereço interno, e publicar
// a porta dele seria expor banco de cliente à internet. O detalhe inteiro está
// em `mcp/src/tunnel.ts`.
//
// ⚠️ Zero dependência, de propósito. Este arquivo roda na máquina do usuário,
// que pode não ter `node_modules` nenhum — e mandar alguém rodar `npm install`
// antes de conseguir desenvolver é exatamente o degrau que o produto promete
// tirar. Por isso `WebSocket` global (Node 22) e `node:net`, e nada além disso.
//
// ⚠️ Como o `WebSocket` do Node não deixa pôr cabeçalho, o token viaja no
// subprotocolo — o servidor aceita os dois caminhos. Ver TOKEN_PROTOCOL_PREFIX
// em `mcp/src/tunnel.ts`.

const net = require('node:net');

const PADRAO_MCP = 'https://mcp.bridgeaibrasil.com.br';

function args(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) out[a.slice(2)] = argv[i + 1] ?? '';
  }
  return out;
}

const opt = args(process.argv.slice(2));
const app = opt.app;
const environment = opt.environment || 'dev';
const porta = Number(opt.port || 5432);
const base = (opt.url || process.env.BRIDGEAI_MCP_URL || PADRAO_MCP).replace(/\/+$/, '');
const token = process.env.BRIDGEAI_TOKEN || opt.token;

function morre(mensagem) {
  console.error(mensagem);
  process.exit(1);
}

if (!app) morre('Diga qual projeto: --app <nome-do-projeto>');
if (!token) {
  morre('Faltou o acesso da BridgeAI. Rode `npm run login` e tente de novo.');
}

const wsUrl =
  `${base.replace(/^http/, 'ws')}/tunnel` +
  `?app=${encodeURIComponent(app)}&environment=${encodeURIComponent(environment)}&target=db`;

/**
 * Pergunta ao servidor por que o túnel não abriria, ANTES de tentar abrir.
 *
 * A API de WebSocket não entrega o código HTTP de um upgrade recusado: 401, 403
 * e 404 chegam aqui como o mesmo erro vazio. Sem esta pergunta, a única coisa
 * que dá para dizer é "não deu" — e quem está do outro lado não programa.
 */
async function conferir() {
  const url =
    `${base}/tunnel/check` +
    `?app=${encodeURIComponent(app)}&environment=${encodeURIComponent(environment)}`;
  let res;
  try {
    res = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
  } catch {
    morre('Não consegui falar com a BridgeAI. Confira sua conexão com a internet.');
  }
  if (res.ok) return;

  let corpo = {};
  try {
    corpo = await res.json();
  } catch {
    /* resposta sem JSON: cai na frase genérica abaixo */
  }
  morre(corpo.error || `A BridgeAI respondeu ${res.status} e não deu para abrir o túnel.`);
}

/** Liga uma conexão local ao servidor. Uma por conexão, como um TCP de verdade. */
function atende(local) {
  const ws = new WebSocket(wsUrl, ['bridgeai.tunnel.v1', `bridgeai.token.${token}`]);
  ws.binaryType = 'arraybuffer';

  // O que chegar antes de o WebSocket abrir fica aqui. Um driver de banco manda
  // o aperto de mão no primeiro milissegundo, muito antes de o WebSocket estar
  // pronto — sem esta fila, esse primeiro pacote se perderia e a conexão ficaria
  // pendurada sem ninguém entender por quê.
  const fila = [];
  let aberto = false;

  local.on('data', (d) => {
    if (aberto) ws.send(d);
    else fila.push(d);
  });

  ws.addEventListener('open', () => {
    aberto = true;
    for (const d of fila) ws.send(d);
    fila.length = 0;
  });

  ws.addEventListener('message', (ev) => {
    // Só binário é dado. O servidor não manda texto neste canal — ele conecta o
    // banco ANTES de aceitar o WebSocket, justamente para não precisar avisar
    // nada por aqui.
    if (typeof ev.data === 'string') return;
    local.write(Buffer.from(ev.data));
  });

  const fecha = () => {
    try {
      local.destroy();
    } catch {
      /* já estava fechada */
    }
    try {
      if (ws.readyState <= 1) ws.close();
    } catch {
      /* idem */
    }
  };

  ws.addEventListener('close', fecha);
  ws.addEventListener('error', fecha);
  local.on('error', fecha);
  local.on('close', fecha);
}

async function main() {
  await conferir();

  const servidor = net.createServer(atende);

  servidor.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
      morre(
        `A porta ${porta} já está ocupada na sua máquina. ` +
          'Provavelmente há outro banco rodando aí. ' +
          `Use outra: --port ${porta + 1} (e mude a porta no seu arquivo .env também).`,
      );
    }
    morre(`Não consegui abrir a porta ${porta}: ${e.message}`);
  });

  // Só 127.0.0.1. Escutar em 0.0.0.0 poria o banco do projeto ao alcance de
  // qualquer um na mesma rede — o café, o coworking, o wi-fi do prédio.
  servidor.listen(porta, '127.0.0.1', () => {
    console.log(`Túnel aberto: 127.0.0.1:${porta} → banco de ${app} (${environment}).`);
    console.log('Deixe esta janela aberta enquanto estiver desenvolvendo.');
  });
}

main();
