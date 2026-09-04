#!/usr/bin/env node
// Entra na BridgeAI: o passo que faz o `.mcp.json` deste plugin funcionar.
//
//   node login.js
//
// A pessoa vê um código de oito caracteres, o navegador abre sozinho, ela
// confirma no GitHub, e este script descobre o resto. Nenhum segredo é
// digitado, e — diferente do `npm run login` do servidor, de onde este arquivo
// foi portado — NENHUM É IMPRESSO.
//
// ⚠️ Quem roda este script é o Claude, pela ferramenta Bash, e o stdout dele
// vai para o chat. Um token impresso aqui fica no histórico da conversa para
// sempre: é a mesma lição do `new-app.sh`, que imprimia cinco senhas logo
// abaixo da frase "nunca para o chat". Por isso o token vai DIRETO para o
// ambiente da máquina — `setx` no Windows, o arquivo de perfil do shell nos
// outros — e o que sai na tela é só "entrou como fulano".
//
// O `.mcp.json` lê `${BRIDGEAI_TOKEN}` do ambiente quando o Claude Code sobe,
// então depois de entrar é preciso fechar e abrir o Claude Code. Não há como
// evitar: variável de ambiente é lida no arranque do processo.
//
// ⚠️ Zero dependência, de propósito — mesma regra do `tunnel.js`. `fetch` é
// global no Node 18+; o resto é `node:child_process` e `node:fs`.

const { spawn, execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const BASE = (process.env.BRIDGEAI_URL || 'https://mcp.bridgeaibrasil.com.br').replace(/\/+$/, '');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Abre o navegador. Se falhar, tudo bem: a URL já está impressa na tela. */
function abrirNavegador(url) {
  if (process.env.BRIDGEAI_LOGIN_SEM_NAVEGADOR) return;
  const [cmd, args] =
    process.platform === 'win32'
      ? ['cmd', ['/c', 'start', '', url]]
      : process.platform === 'darwin'
        ? ['open', [url]]
        : ['xdg-open', [url]];
  try {
    spawn(cmd, args, { detached: true, stdio: 'ignore' }).unref();
  } catch {
    /* segue sem navegador */
  }
}

async function post(caminho, body) {
  const res = await fetch(`${BASE}${caminho}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  return { status: res.status, data: await res.json().catch(() => ({})) };
}

/**
 * Guarda o token no ambiente da máquina, para o `.mcp.json` encontrar.
 *
 * Devolve a frase que diz ONDE ele ficou — e nunca o valor. No Windows,
 * `setx` grava a variável de usuário no registro; nos outros, a linha entra
 * no arquivo de perfil do shell da pessoa. Uma entrada anterior é
 * substituída, senão cada login novo deixaria a linha velha valendo por baixo.
 */
function guardar(token) {
  // O teste aponta para um arquivo descartável; sem isso, rodar a suíte no
  // Windows gravaria um token de mentira no registro de quem desenvolve.
  const destino = process.env.BRIDGEAI_LOGIN_DESTINO;

  if (!destino && process.platform === 'win32') {
    execFileSync('setx', ['BRIDGEAI_TOKEN', token], { stdio: 'ignore' });
    return 'Guardei o acesso nas variáveis de ambiente do Windows.';
  }

  const shell = path.basename(process.env.SHELL || '');
  const perfil =
    destino ||
    path.join(
      os.homedir(),
      shell === 'zsh' ? '.zshrc' : shell === 'fish' ? '.config/fish/config.fish' : '.bashrc',
    );
  const linha =
    shell === 'fish'
      ? `set -gx BRIDGEAI_TOKEN "${token}"`
      : `export BRIDGEAI_TOKEN="${token}"`;

  let atual = '';
  try {
    atual = fs.readFileSync(perfil, 'utf8');
  } catch {
    /* sem arquivo ainda */
  }
  const semAntigo = atual
    .split('\n')
    .filter((l) => !/^\s*(export\s+|set\s+-gx\s+)?BRIDGEAI_TOKEN\b/.test(l))
    .join('\n');
  const conteudo = `${semAntigo.replace(/\n*$/, '')}\n\n# BridgeAI — gravado por login.js\n${linha}\n`;
  fs.mkdirSync(path.dirname(perfil), { recursive: true });
  fs.writeFileSync(perfil, conteudo, { mode: 0o600 });
  return `Guardei o acesso em ${perfil}.`;
}

async function main() {
  console.log(`Entrando na BridgeAI em ${BASE}\n`);

  const inicio = await post('/auth/device');
  if (inicio.status !== 200) {
    console.error(inicio.data?.error || `A plataforma respondeu ${inicio.status}.`);
    process.exit(1);
  }

  console.log('  1. Vai abrir o GitHub no seu navegador.');
  console.log(`     Se não abrir, entre em ${inicio.data.verification_uri}`);
  console.log(`\n  2. Digite este código:  ${inicio.data.user_code}\n`);
  console.log('  3. Confirme, e volte para cá. Esperando...\n');

  abrirNavegador(inicio.data.verification_uri);

  // O intervalo vem do GitHub e pode aumentar no meio do caminho: `slow_down` é
  // ele pedindo calma, e desobedecer leva a bloqueio.
  let intervalo = Number(inicio.data.interval ?? 5);
  const limite = Date.now() + Number(inicio.data.expires_in ?? 900) * 1000;

  while (Date.now() < limite) {
    await sleep(intervalo * 1000);
    const volta = await post('/auth/device/token', { device_code: inicio.data.device_code });

    if (volta.status === 202) {
      if (volta.data.status === 'slow_down') intervalo = Number(volta.data.interval || intervalo + 5);
      continue;
    }

    if (volta.status !== 200) {
      console.error(`\n${volta.data?.error || `A plataforma respondeu ${volta.status}.`}`);
      process.exit(1);
    }

    const onde = guardar(String(volta.data.token));
    console.log(`Pronto. Você entrou como ${volta.data.owner}.`);
    console.log(`O acesso vale até ${new Date(volta.data.expires_at).toLocaleDateString('pt-BR')}.`);
    console.log(`${onde}\n`);
    console.log('Feche e abra o Claude Code para ele passar a enxergar a BridgeAI.');
    return;
  }

  console.error('O código expirou antes da confirmação. Rode o login de novo.');
  process.exit(1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
