#!/usr/bin/env node
// A ponta local do túnel da BridgeAI.
//
// Abre um `127.0.0.1:55432` na máquina da pessoa e liga cada conexão que chegar
// nele ao banco do projeto, por dentro do WebSocket do servidor MCP. Para o
// Prisma, o `psql` e qualquer driver, aquilo é um Postgres comum na máquina.
//
//   node tunnel.js --app loja-do-joao --environment dev
//
// Por que ele existe: o banco da plataforma só tem endereço interno, e publicar
// a porta dele seria expor banco de cliente à internet. O detalhe inteiro está
// em `mcp/src/tunnel.ts`.
//
// ⚠️ **A porta padrão NÃO é a 5432, e essa escolha é de segurança de dado.**
// A 5432 é a porta do Postgres de todo mundo. Numa máquina que já tinha um
// Postgres em Docker os dois subiam juntos sem reclamar: no Windows, ligar em
// `127.0.0.1:5432` com um `0.0.0.0:5432` existente é permitido, e o endereço
// específico vence. O perigo não é a colisão — é o silêncio ao contrário: se o
// túnel cair enquanto o app roda, a próxima conexão cai no Postgres local, sem
// erro nenhum, e a migration seguinte vai para o banco errado.
//
// Por isso, além da 55432: este script RECUSA subir se já houver alguém
// atendendo na porta, em vez de confiar no `EADDRINUSE` — que no Windows não
// acontece. E confere que o outro lado responde antes de dizer "aberto".
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
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const PADRAO_MCP = 'https://mcp.bridgeaibrasil.com.br';

/**
 * A porta local. Longe da 5432 de propósito — ver o aviso no topo.
 *
 * Ao mudar este número, mude junto o `porta` do `credentials` em
 * `mcp/src/real-source.ts`: é ele que escreve o `.env` que aponta para cá. Os
 * dois discordarem dá "connection refused" num arquivo que a plataforma gerou.
 */
const PORTA_PADRAO = 55432;

/**
 * A porta local do cache, quando o app tem um. Longe da 6379 pelo mesmo
 * motivo, e tem que casar com `portaCache` no `credentials` de
 * `mcp/src/real-source.ts`.
 */
const PORTA_CACHE_PADRAO = 56379;

/** Quanto esperar pelo aperto de mão com o servidor antes de desistir. */
const ESPERA_MS = 10_000;

/** O subprotocolo que o servidor exige. Ver PROTOCOL em `mcp/src/tunnel.ts`. */
const PROTOCOLO = 'bridgeai.tunnel.v1';

function args(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) out[a.slice(2)] = argv[i + 1] ?? '';
  }
  return out;
}

/**
 * Lê uma variável do `.env` do projeto, sem depender de biblioteca.
 *
 * ⚠️ É por aqui que o túnel funciona para quem entrou pelo caminho
 * RECOMENDADO. O login por OAuth (`/mcp` → bridgeai) guarda o acesso dentro do
 * cliente MCP, e este arquivo é um programa separado: ele não alcança aquele
 * token, e o ambiente não tem nenhum. O `dev_credentials` resolve gravando um
 * `BRIDGEAI_TUNNEL_TOKEN` no `.env` — de escopo restrito e curta duração —, e
 * o que falta é alguém lê-lo.
 *
 * Não sobrescreve o ambiente: quem exportou uma variável quis aquilo.
 */
function doEnvDoProjeto(chave) {
  for (const nome of ['.env', '.env.local']) {
    let bruto;
    try {
      bruto = readFileSync(resolve(process.cwd(), nome), 'utf8');
    } catch {
      continue;
    }
    for (const linha of bruto.split(/\r?\n/)) {
      const m = linha.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (!m || m[1] !== chave) continue;
      // Aspas em volta são convenção de arquivo `.env`, não parte do valor.
      return m[2].trim().replace(/^(['"])([\s\S]*)\1$/, '$2');
    }
  }
  return null;
}

const opt = args(process.argv.slice(2));
const app = opt.app;
const environment = opt.environment || 'dev';
const porta = Number(opt.port || PORTA_PADRAO);
const base = (opt.url || process.env.BRIDGEAI_MCP_URL || PADRAO_MCP).replace(/\/+$/, '');

// A ordem é do mais explícito para o mais implícito: o que veio no comando
// ganha de tudo, o ambiente vem depois, e o `.env` é a reserva — que na prática
// é o caso comum de quem entrou por OAuth.
const token =
  opt.token ||
  process.env.BRIDGEAI_TOKEN ||
  process.env.BRIDGEAI_TUNNEL_TOKEN ||
  doEnvDoProjeto('BRIDGEAI_TUNNEL_TOKEN');

function morre(mensagem) {
  console.error(mensagem);
  process.exit(1);
}

if (!app) morre('Diga qual projeto: --app <nome-do-projeto>');
if (!token) {
  // ⚠️ Esta mensagem dizia "rode `npm run login`" — um comando do repositório
  // PRIVADO da plataforma, que quem instalou o plugin não tem. Ela mandava a
  // pessoa a um lugar onde ela não consegue chegar.
  //
  // E a causa mais provável de cair aqui não é "não entrei": é ter entrado pelo
  // caminho recomendado. O login por OAuth (`/mcp` → bridgeai) guarda o token
  // dentro do cliente MCP, e este script é um processo separado que só enxerga
  // o ambiente. Enquanto o túnel autenticar por variável, quem entrou por OAuth
  // precisa deste segundo login.
  morre(
    'Faltou o acesso da BridgeAI para abrir o túnel.\n' +
      '\n' +
      'Rode:  node "' +
      (process.env.CLAUDE_PLUGIN_ROOT || '<plugin>') +
      '/scripts/login.js"\n' +
      '\n' +
      'Depois feche e abra o terminal, para a variável entrar no ambiente.\n' +
      'Se você entrou pelo /mcp, isto é esperado: aquele login vale para as\n' +
      'ferramentas, e o túnel é um programa à parte que ainda lê o ambiente.',
  );
}

// O cache vem junto quando o `.env` que o `dev_credentials` escreveu diz que
// vem (`BRIDGEAI_TUNNEL_CACHE`), ou quando alguém pede `--cache`. Sem uma das
// duas, só o banco — o comportamento de sempre.
const comCache = 'cache' in opt || doEnvDoProjeto('BRIDGEAI_TUNNEL_CACHE') !== null;
const portaCache = Number(opt['cache-port'] || PORTA_CACHE_PADRAO);

const wsUrlPara = (target) =>
  `${base.replace(/^http/, 'ws')}/tunnel` +
  `?app=${encodeURIComponent(app)}&environment=${encodeURIComponent(environment)}&target=${target}`;
const wsUrl = wsUrlPara('db');

/**
 * Pergunta ao servidor por que o túnel não abriria, ANTES de tentar abrir.
 *
 * A API de WebSocket não entrega o código HTTP de um upgrade recusado: 401, 403
 * e 404 chegam aqui como o mesmo erro vazio. Sem esta pergunta, a única coisa
 * que dá para dizer é "não deu" — e quem está do outro lado não programa.
 */
async function conferir(target = 'db') {
  const url =
    `${base}/tunnel/check` +
    `?app=${encodeURIComponent(app)}&environment=${encodeURIComponent(environment)}&target=${target}`;
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

/**
 * Já tem alguém atendendo nesta porta?
 *
 * Perguntar CONECTANDO, e não confiando no `EADDRINUSE` do `listen`. No Windows
 * o `listen` em `127.0.0.1:<p>` funciona mesmo com um `0.0.0.0:<p>` já de pé —
 * os dois convivem, o endereço específico ganha as conexões novas, e nada
 * reclama. Foi assim que o túnel e um Postgres em Docker subiram lado a lado.
 *
 * Um `connect` bem-sucedido não engana: se algo aceitou a conexão, é esse algo
 * que o `.env` do projeto vai encontrar quando o túnel não estiver de pé.
 */
function ocupada(p) {
  return new Promise((resolve) => {
    const s = net.connect({ host: '127.0.0.1', port: p });
    let respondido = false;
    const fim = (r) => {
      if (respondido) return;
      respondido = true;
      s.destroy();
      resolve(r);
    };
    s.setTimeout(1500);
    s.once('connect', () => fim(true));
    s.once('error', () => fim(false)); // recusada é o que se quer: porta livre
    s.once('timeout', () => fim(false));
  });
}

/**
 * Abre um WebSocket e fecha, só para ver se o outro lado está mesmo lá.
 *
 * O servidor conecta o banco ANTES de aceitar o upgrade (ver `mcp/src/tunnel.ts`),
 * então um `open` aqui quer dizer que o Postgres da nuvem aceitou uma conexão.
 * Sem isto, "Túnel aberto" queria dizer só "consegui reservar a porta" — e o
 * primeiro a descobrir que o banco não vinha era o app da pessoa, com um erro
 * de driver que não aponta para lugar nenhum.
 */
function apresentacao(url = wsUrl) {
  return new Promise((resolve) => {
    let respondido = false;
    const fim = (r) => {
      if (respondido) return;
      respondido = true;
      resolve(r);
    };

    let ws;
    try {
      ws = new WebSocket(url, [PROTOCOLO, `bridgeai.token.${token}`]);
    } catch {
      return fim(false);
    }

    const relogio = setTimeout(() => fim(false), ESPERA_MS);
    ws.addEventListener('open', () => {
      clearTimeout(relogio);
      try {
        ws.close();
      } catch {
        /* já fechou sozinho */
      }
      fim(true);
    });
    // Fechar sem ter aberto é recusa. Depois do `open` o `fim` já respondeu, e
    // a segunda chamada não faz nada — daí a guarda.
    ws.addEventListener('error', () => {
      clearTimeout(relogio);
      fim(false);
    });
    ws.addEventListener('close', () => {
      clearTimeout(relogio);
      fim(false);
    });
  });
}

/** Liga uma conexão local ao servidor. Uma por conexão, como um TCP de verdade. */
function atende(local, url = wsUrl) {
  const ws = new WebSocket(url, [PROTOCOLO, `bridgeai.token.${token}`]);
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
  // A porta primeiro: é a única conferência que não depende da internet, e é a
  // que protege dado. Continuar com a porta ocupada é aceitar que, no dia em que
  // o túnel cair, o projeto escreva no banco errado sem nenhum erro aparecer.
  if (await ocupada(porta)) {
    morre(
      `Já tem alguma coisa atendendo em 127.0.0.1:${porta}, então o túnel não vai subir aí.\n` +
        'Quase sempre é um Postgres seu — em Docker, ou instalado na máquina.\n' +
        '\n' +
        'Não dá para dividir a porta: se o túnel caísse, seu projeto passaria a\n' +
        'gravar nesse outro banco sem avisar, e uma migration iria para o lugar\n' +
        'errado em silêncio.\n' +
        '\n' +
        `Saídas: desligue o que está usando a ${porta}, ou escolha outra com\n` +
        `--port ${porta + 1} — e mude DATABASE_URL e DB_PORT no .env junto.`,
    );
  }

  await conferir();

  // Só depois de saber que o pedido é legítimo é que vale gastar um WebSocket
  // para ver se o banco responde. Ao contrário, um token vencido apareceria
  // aqui como "o banco não respondeu", que manda a pessoa olhar o lugar errado.
  if (!(await apresentacao())) {
    morre(
      'Consegui falar com a BridgeAI, mas o banco do projeto não respondeu ao abrir o túnel.\n' +
        'Não vou subir a porta local: um túnel aberto sem banco atrás parece que está\n' +
        'funcionando e falha só quando você for usar.\n' +
        '\n' +
        'Tente de novo em alguns segundos. Se continuar, é o banco do projeto que está fora.',
    );
  }

  const servidor = net.createServer(atende);

  servidor.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
      // Continua valendo: o `ocupada` acima fecha a janela quase toda, mas dois
      // túneis subindo ao mesmo tempo ainda chegam aqui — e no Linux este é o
      // erro que aparece de verdade.
      morre(
        `A porta ${porta} já está ocupada na sua máquina. ` +
          `Use outra: --port ${porta + 1} (e mude a porta no seu arquivo .env também).`,
      );
    }
    morre(`Não consegui abrir a porta ${porta}: ${e.message}`);
  });

  // Só 127.0.0.1. Escutar em 0.0.0.0 poria o banco do projeto ao alcance de
  // qualquer um na mesma rede — o café, o coworking, o wi-fi do prédio.
  servidor.listen(porta, '127.0.0.1', () => {
    console.log(`Túnel aberto: 127.0.0.1:${porta} → banco de ${app} (${environment}).`);
    console.log('O banco da nuvem respondeu — a ligação foi conferida, e não só reservada.');
    if (!comCache) console.log('Deixe esta janela aberta enquanto estiver desenvolvendo.');
  });

  if (!comCache) return;

  // A segunda porta, para o cache. Mesmas três conferências do banco, pela
  // mesma razão: uma porta aberta sem nada atrás parece que funciona e falha
  // só quando o app for usar.
  if (await ocupada(portaCache)) {
    morre(
      `Já tem alguma coisa atendendo em 127.0.0.1:${portaCache}, e é onde o cache do projeto iria.\n` +
        'Quase sempre é um Redis seu. Desligue-o, ou escolha outra porta com\n' +
        `--cache-port ${portaCache + 1} — e mude a porta em REDIS_URL no .env junto.`,
    );
  }
  await conferir('cache');
  if (!(await apresentacao(wsUrlPara('cache')))) {
    morre('O banco do projeto respondeu, mas o cache não. Tente de novo em alguns segundos.');
  }

  const servidorCache = net.createServer((local) => atende(local, wsUrlPara('cache')));
  servidorCache.on('error', (e) => morre(`Não consegui abrir a porta ${portaCache} do cache: ${e.message}`));
  servidorCache.listen(portaCache, '127.0.0.1', () => {
    console.log(`Túnel aberto: 127.0.0.1:${portaCache} → cache de ${app} (faixa de desenvolvimento, separada da produção).`);
    console.log('Deixe esta janela aberta enquanto estiver desenvolvendo.');
  });
}

main();
