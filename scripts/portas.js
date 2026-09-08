#!/usr/bin/env node
// Registro das portas locais que um projeto da BridgeAI deixou abertas.
//
// ## O problema que ele resolve
//
// A pessoa começa uma funcionalidade, sobe o servidor local e o túnel, e vai
// embora sem parar nada. Na sessão seguinte — outra janela, outro dia, às vezes
// outro projeto — a porta está ocupada, e o caminho fácil é abrir outra: o app
// passa a responder na 3001 enquanto ela olha a 3000 e conclui que a mudança não
// funcionou.
//
// Com o túnel é pior, e o `CLAUDE.md` da plataforma já escreve por quê: **se ele
// cair e outro Postgres tomar a 55432, a próxima conexão vai para o banco errado
// sem erro nenhum**, e a migration seguinte vai junto.
//
// ## Porta é recurso da MÁQUINA, não do projeto
//
// Por isso o registro é UM, em `~/.bridgeai/portas.json`, ao lado do
// `profile.json`, e a chave é a PORTA. Um arquivo dentro de cada projeto não
// enxergaria o conflito que mais dói, que é entre projetos — e o caso já está
// documentado: o túnel é **um só para todos os projetos** (`--dev`), e o
// `/bridgeai:comecar` manda "se já tem um túnel aberto de outro projeto, pule
// este passo" sem dar ao Claude nenhum jeito de saber disso.
//
// ## As três regras, e as três são sobre não mentir
//
// 1. **O arquivo é uma AFIRMAÇÃO, não um fato.** A máquina reinicia, o terminal
//    fecha, o processo morre — e ninguém escreve "fechei". Toda leitura mede a
//    porta na hora; o registro só diz de quem ela era e desde quando.
// 2. **"Fechado" nunca sai da ausência de registro.** Sai de ninguém estar
//    escutando. Mesma disciplina do `probed: false` do `status` e do `measured`
//    da vigia de disco: não saber é um estado, e ele não pode ser confundido
//    com "está tudo bem".
// 3. **Não existe comando de matar aqui, e é de propósito.** PID é reciclado
//    pelo sistema: matar o 12345 de ontem é matar um processo qualquer de hoje.
//    O que este arquivo entrega é IDENTIDADE — quem escuta a porta agora, e com
//    que nome — para quem for encerrar conferir antes, e com o usuário.
//
// Zero dependência, como todo script deste plugin: ele roda na máquina de quem
// pode não ter `node_modules` nenhum.

const fs = require('fs');
const path = require('path');
const os = require('os');
const net = require('net');
const { execFileSync } = require('child_process');

const PASTA = path.join(os.homedir(), '.bridgeai');
const REGISTRO = path.join(PASTA, 'portas.json');
const VERSAO = 1;

// Uma conexão que ninguém atende falha em milissegundos; o teto existe para o
// caso de um firewall que engole o pacote em vez de recusar.
const TIMEOUT_MS = 800;

// ---------------------------------------------------------------------------
// O arquivo

function ler(arquivo = REGISTRO) {
  try {
    const dados = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
    if (!dados || typeof dados !== 'object' || typeof dados.portas !== 'object') return vazio();
    return { versao: dados.versao || VERSAO, portas: dados.portas || {} };
  } catch {
    // Sem arquivo, ilegível, ou escrito por uma versão futura: começa vazio. Um
    // registro corrompido não pode impedir alguém de desenvolver.
    return vazio();
  }
}

function vazio() {
  return { versao: VERSAO, portas: {} };
}

// Escreve por temporário + rename: duas sessões anotando ao mesmo tempo é raro,
// mas um arquivo cortado no meio faria toda sessão seguinte começar do zero.
function gravar(dados, arquivo = REGISTRO) {
  fs.mkdirSync(path.dirname(arquivo), { recursive: true });
  const tmp = `${arquivo}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(dados, null, 2)}\n`, 'utf8');
  fs.renameSync(tmp, arquivo);
}

/**
 * Anota que uma porta foi aberta.
 *
 * `pid` é opcional e vale ouro quando existe: é o que separa "o processo que eu
 * conheço continua de pé" de "alguém TROCOU o dono desta porta", que é o caso
 * perigoso do túnel.
 */
function anotarAbertura(
  { porta, oQue, projeto, comando, pid } = {},
  arquivo = REGISTRO,
) {
  const p = Number(porta);
  if (!Number.isInteger(p) || p < 1 || p > 65535) throw new Error(`Porta inválida: ${porta}`);

  const dados = ler(arquivo);
  dados.portas[String(p)] = {
    oQue: oQue || 'processo local',
    projeto: projeto || process.cwd(),
    comando: comando || null,
    pid: Number.isInteger(Number(pid)) && Number(pid) > 0 ? Number(pid) : null,
    desde: new Date().toISOString(),
  };
  gravar(dados, arquivo);
  return dados.portas[String(p)];
}

/** Anota que uma porta foi fechada. Some do registro — o histórico não serve a ninguém. */
function anotarFechamento(porta, arquivo = REGISTRO) {
  const dados = ler(arquivo);
  const chave = String(Number(porta));
  if (!(chave in dados.portas)) return false;
  delete dados.portas[chave];
  gravar(dados, arquivo);
  return true;
}

// ---------------------------------------------------------------------------
// A medição — a parte que decide se o arquivo acima é verdade

/**
 * Alguém atende em 127.0.0.1:porta?
 *
 * Perguntando CONECTANDO, que é o mesmo caminho do `ocupada()` do `tunnel.js` e
 * pela mesma razão: no Windows, ligar em `127.0.0.1:<p>` com um `0.0.0.0:<p>` já
 * de pé é permitido, e nada reclama.
 */
function escutando(porta, timeout = TIMEOUT_MS) {
  return new Promise((resolve) => {
    const s = net.connect({ host: '127.0.0.1', port: Number(porta) });
    let respondido = false;
    const fim = (r) => {
      if (respondido) return;
      respondido = true;
      s.destroy();
      resolve(r);
    };
    s.setTimeout(timeout);
    s.once('connect', () => fim(true));
    s.once('error', () => fim(false));
    s.once('timeout', () => fim(false));
  });
}

function rodar(cmd, args) {
  try {
    return execFileSync(cmd, args, {
      encoding: 'utf8',
      timeout: 4000,
      stdio: ['ignore', 'pipe', 'ignore'],
      windowsHide: true,
    });
  } catch {
    // Ferramenta ausente, sem permissão, ou saída diferente da esperada. `null`
    // é "não sei", e quem lê precisa poder dizer isso em vez de inventar dono.
    return null;
  }
}

/** Quem escuta a porta AGORA, medido no sistema. `null` quando não deu para saber. */
function donoDaPorta(porta) {
  const p = String(Number(porta));

  if (process.platform === 'win32') {
    const saida = rodar('netstat', ['-ano', '-p', 'tcp']);
    if (!saida) return null;
    for (const linha of saida.split(/\r?\n/)) {
      const campos = linha.trim().split(/\s+/);
      if (campos.length < 5) continue;
      const [, local, , estado, pid] = campos;
      if (estado !== 'LISTENING') continue;
      // `local` é `127.0.0.1:3000` ou `[::]:3000`; a porta é o que vem depois
      // do último dois-pontos, senão o IPv6 quebraria a leitura.
      if (local.slice(local.lastIndexOf(':') + 1) !== p) continue;
      const n = Number(pid);
      if (Number.isInteger(n) && n > 0) return n;
    }
    return null;
  }

  const saida = rodar('lsof', ['-nP', `-iTCP:${p}`, '-sTCP:LISTEN', '-t']);
  if (!saida) return null;
  const n = Number(saida.trim().split(/\s+/)[0]);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** O nome do processo, para a frase dizer "node.exe" e não só um número. */
function nomeDoProcesso(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return null;

  if (process.platform === 'win32') {
    const saida = rodar('tasklist', ['/FI', `PID eq ${pid}`, '/NH', '/FO', 'CSV']);
    const m = saida && saida.match(/^"([^"]+)"/m);
    return m ? m[1] : null;
  }

  const saida = rodar('ps', ['-o', 'comm=', '-p', String(pid)]);
  const nome = saida && saida.trim().split(/\r?\n/)[0];
  return nome || null;
}

function vivo(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return null;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    // EPERM quer dizer que o processo existe e é de outro usuário — vivo, e não
    // ausente. Só ESRCH prova que ele se foi.
    return e && e.code === 'EPERM';
  }
}

/**
 * O estado real de cada porta registrada, e a limpeza do que já não existe.
 *
 * Três estados, e a diferença entre os dois primeiros é o que salva alguém:
 *
 * - `de-pe`      — alguém atende, e é o processo que anotamos (ou não sabemos
 *                  o dono, e então não afirmamos nada além de "está ocupada").
 * - `outro-dono` — alguém atende, e é OUTRO processo. No túnel, este é o estado
 *                  em que o `.env` do projeto aponta para um banco alheio.
 * - `fechado`    — ninguém atende. O registro é apagado aqui, e não por um
 *                  comando que alguém talvez nunca rode.
 */
async function reconciliar({ arquivo = REGISTRO, limpar = true } = {}) {
  const dados = ler(arquivo);
  const linhas = [];
  let mudou = false;

  for (const [chave, reg] of Object.entries(dados.portas)) {
    const porta = Number(chave);
    const ocupada = await escutando(porta);

    if (!ocupada) {
      linhas.push({ porta, ...reg, estado: 'fechado', donoAgora: null, nomeAgora: null });
      delete dados.portas[chave];
      mudou = true;
      continue;
    }

    const donoAgora = donoDaPorta(porta);
    const trocou = reg.pid != null && donoAgora != null && donoAgora !== reg.pid;
    linhas.push({
      porta,
      ...reg,
      estado: trocou ? 'outro-dono' : 'de-pe',
      donoAgora,
      nomeAgora: nomeDoProcesso(donoAgora),
      pidVivo: vivo(reg.pid),
    });
  }

  if (mudou && limpar) {
    try {
      gravar(dados, arquivo);
    } catch {
      // Registro que não dá para gravar não pode impedir a leitura de responder.
    }
  }

  return linhas.sort((a, b) => a.porta - b.porta);
}

// ---------------------------------------------------------------------------
// O texto

function desdeQuando(iso) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return 'há tempo indeterminado';
  const min = Math.round((Date.now() - t) / 60000);
  if (min < 1) return 'agora há pouco';
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 48) return `há ${h} h`;
  return `há ${Math.round(h / 24)} dias`;
}

function mesmoProjeto(reg, cwd) {
  if (!reg.projeto) return false;
  return path.resolve(reg.projeto).toLowerCase() === path.resolve(cwd).toLowerCase();
}

/**
 * As linhas em português, para o hook de sessão e para o comando `listar`.
 *
 * Só o que está DE PÉ vira texto: uma porta que fechou não é notícia, e um
 * relatório que lista o que já não existe é o que se aprende a ignorar.
 */
function resumo(linhas, cwd = process.cwd()) {
  const vivas = linhas.filter((l) => l.estado !== 'fechado');
  if (vivas.length === 0) return '';

  const texto = vivas.map((l) => {
    const dono = mesmoProjeto(l, cwd) ? 'deste projeto' : `do projeto ${path.basename(l.projeto || '?')}`;
    const quem =
      l.donoAgora != null
        ? ` — quem atende agora é o PID ${l.donoAgora}${l.nomeAgora ? ` (${l.nomeAgora})` : ''}`
        : ' — não consegui descobrir qual processo atende';

    if (l.estado === 'outro-dono') {
      return (
        `- **${l.porta}** está ocupada, mas NÃO pelo processo anotado ` +
        `(era o PID ${l.pid}, ${l.oQue} ${dono})${quem}. ` +
        'Trate como porta de estranho: se este projeto aponta para ela, o que ele encontrar não é o que a plataforma abriu.'
      );
    }
    return (
      `- **${l.porta}** — ${l.oQue} ${dono}, aberta ${desdeQuando(l.desde)}${quem}.` +
      (l.comando ? ` Foi aberta com: \`${l.comando}\`` : '')
    );
  });

  return [
    'Portas locais que a BridgeAI anotou nesta máquina e continuam de pé:',
    '',
    ...texto,
    '',
    'Antes de subir servidor ou túnel, use o que já está aqui em vez de abrir outra porta. ' +
      'Para encerrar alguma, confirme com o usuário e confira o PID que ESTÁ atendendo — ' +
      'nunca o anotado: o sistema recicla PID, e matar o número de ontem é matar um processo qualquer de hoje.',
  ].join('\n');
}

// ---------------------------------------------------------------------------
// CLI

function opcoes(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const [chave, valor] = a.includes('=') ? [a.slice(2, a.indexOf('=')), a.slice(a.indexOf('=') + 1)] : [a.slice(2), argv[++i]];
    o[chave] = valor;
  }
  return o;
}

async function cli(argv) {
  const comando = argv[0] && !argv[0].startsWith('--') ? argv[0] : 'listar';
  const o = opcoes(argv);

  if (comando === 'abrir') {
    const reg = anotarAbertura({
      porta: o.porta,
      oQue: o['o-que'],
      projeto: o.projeto,
      comando: o.comando,
      pid: o.pid,
    });
    console.log(`Anotado: porta ${o.porta} — ${reg.oQue} (${reg.projeto}).`);
    return 0;
  }

  if (comando === 'fechar') {
    const tinha = anotarFechamento(o.porta);
    console.log(
      tinha
        ? `Anotado: porta ${o.porta} liberada.`
        : `A porta ${o.porta} não estava anotada — nada a fazer.`,
    );
    return 0;
  }

  const linhas = await reconciliar();
  if (o.json !== undefined) {
    console.log(JSON.stringify(linhas, null, 2));
    return 0;
  }
  const texto = resumo(linhas);
  console.log(texto || 'Nenhuma porta anotada está de pé nesta máquina.');
  return 0;
}

module.exports = {
  REGISTRO,
  PASTA,
  ler,
  anotarAbertura,
  anotarFechamento,
  escutando,
  donoDaPorta,
  nomeDoProcesso,
  reconciliar,
  resumo,
};

if (require.main === module) {
  cli(process.argv.slice(2))
    .then((c) => process.exit(c))
    .catch(() => process.exit(0)); // falha aqui nunca pode atrapalhar quem está desenvolvendo
}
