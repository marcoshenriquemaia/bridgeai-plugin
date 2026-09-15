#!/usr/bin/env node
// As ferramentas locais da BridgeAI, num comando só.
//
//   npx bridgeai tunnel --dev        abre o túnel para o banco na nuvem
//   npx bridgeai portas              o que ficou de pé nesta máquina
//   npx bridgeai abrir <url>         abre uma página da plataforma
//   npx bridgeai login               entra sem OAuth (cliente MCP antigo)
//
// ## Por que este arquivo existe
//
// Até 15/09/2026 estes scripts só chegavam à máquina de quem instalasse o
// plugin do Claude Code — dois comandos de chat, um marketplace do GitHub, e
// um reinício em toda versão anterior à 2.1.221. O túnel é o único deles que
// NÃO tem substituto pelo servidor MCP: ele precisa abrir uma porta na máquina
// da pessoa, e um servidor remoto não faz isso.
//
// Enquanto ele morava só no plugin, "roda na sua máquina, sem Docker" — que o
// site promete em três páginas — valia apenas para o Claude Code com plugin.
// ⚠️ O Codex, que o site oferece no mesmo passo 1, **nunca teve túnel**, e
// ninguém tinha notado: o passo 5 manda "peça ao agente as credenciais e ele
// abre o túnel", e o `tunnel.js` não existe na máquina dele.
//
// Com `npx`, o mesmo script serve qualquer agente e não instala nada.
//
// ## Zero dependência, e aqui é produto e não estilo
//
// Um pacote sem `dependencies` baixa em um segundo e não pode ser
// comprometido pela cadeia de outra pessoa. É a mesma decisão do `agente/`,
// pela razão de lá: toda biblioteca que este processo carregasse seria uma
// que, comprometida, alcança o banco de desenvolvimento de quem a roda.

const path = require('node:path');

const SCRIPTS = path.join(__dirname, '..', 'scripts');

const AJUDA = `BridgeAI — as ferramentas locais.

  npx bridgeai tunnel --dev          o túnel para o banco de desenvolvimento
  npx bridgeai tunnel --app <id> --environment staging
  npx bridgeai portas                o que ficou de pé nesta máquina
  npx bridgeai abrir <url>           abre uma página da BridgeAI
  npx bridgeai login                 entra sem OAuth (cliente MCP antigo)

O túnel lê o acesso do .env do projeto, escrito pelo seu agente quando você
pede as credenciais de desenvolvimento. Não há chave para copiar.

  https://bridgeaibrasil.com.br/comecar`;

function main() {
  const verbo = process.argv[2];

  // ⚠️ O verbo é OBRIGATÓRIO, e um `--dev` solto não vira túnel por adivinhação.
  // O túnel é o comando mais provável, então a tentação é assumi-lo — e aí
  // `npx bridgeai --help` abriria uma porta. Quem errou recebe o comando certo
  // escrito, que é o que ele vai copiar de qualquer jeito.
  if (!verbo || verbo === '--help' || verbo === '-h' || verbo === 'help') {
    console.log(AJUDA);
    process.exit(verbo ? 0 : 1);
  }

  if (verbo.startsWith('-')) {
    console.error(
      `Faltou dizer o que fazer.\n\nVocê quis dizer:  npx bridgeai tunnel ${process.argv.slice(2).join(' ')}\n\n${AJUDA}`,
    );
    process.exit(1);
  }

  // Os scripts foram escritos como programas de linha de comando e leem
  // `process.argv` direto. Tirar o verbo daqui é o que os faz enxergar os
  // argumentos como se tivessem sido chamados sozinhos — e é por isso que
  // nenhum deles precisou mudar para virar subcomando.
  process.argv.splice(2, 1);

  if (verbo === 'tunnel' || verbo === 'tunel' || verbo === 'túnel') {
    require(path.join(SCRIPTS, 'tunnel.js'));
    return;
  }

  if (verbo === 'abrir') {
    require(path.join(SCRIPTS, 'abrir.js'));
    return;
  }

  if (verbo === 'login') {
    require(path.join(SCRIPTS, 'login.js'));
    return;
  }

  // `portas.js` guarda o CLI dele atrás de `require.main === module`, e daqui
  // quem é o módulo principal é este arquivo. Por isso ele é o único chamado
  // pela função exportada, em vez de executado pelo `require`.
  if (verbo === 'portas') {
    const portas = require(path.join(SCRIPTS, 'portas.js'));
    portas
      .cli(process.argv.slice(2))
      .then((c) => process.exit(c))
      .catch(() => process.exit(0)); // falha aqui nunca pode atrapalhar quem está desenvolvendo
    return;
  }

  console.error(`Não conheço o comando "${verbo}".\n\n${AJUDA}`);
  process.exit(1);
}

main();
