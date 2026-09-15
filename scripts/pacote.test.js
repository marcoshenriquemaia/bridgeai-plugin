// O pacote npm precisa levar tudo o que o comando chama.
//
// ## Por que este teste existe
//
// O `files` do `package.json` é uma lista escrita à mão, e é a doença que esta
// casa já registrou dezessete vezes: ela envelhece em silêncio. Um script novo
// em `bin/bridgeai.js` que ninguém acrescente ali funciona perfeitamente aqui —
// o repositório tem o arquivo — e **quebra só na máquina de quem instalou**,
// com um `Cannot find module` que fala de um caminho dentro de `node_modules`.
//
// Nenhuma rodada de teste comum pega isso, porque localmente nada falta.
//
// Então ele não confere uma lista contra outra lista: ele LÊ o despachante,
// descobre que scripts ele carrega, e exige cada um no pacote. Verbo novo
// nasce coberto.
//
//   node --test plugin/scripts/pacote.test.js

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.join(__dirname, '..');
const bin = fs.readFileSync(path.join(RAIZ, 'bin', 'bridgeai.js'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(RAIZ, 'package.json'), 'utf8'));

/** Todo `require(path.join(SCRIPTS, 'x.js'))` que o despachante contém. */
function scriptsQueOBinCarrega() {
  const achados = new Set();
  const padrao = /SCRIPTS,\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = padrao.exec(bin)) !== null) achados.add(m[1]);
  return [...achados];
}

test('o bin carrega pelo menos o túnel — senão este teste não mede nada', () => {
  const scripts = scriptsQueOBinCarrega();
  assert.ok(
    scripts.includes('tunnel.js'),
    `A varredura do bin achou ${JSON.stringify(scripts)}. Se ela parou de achar ` +
      'o túnel, o padrão da regex não casa mais com o código e as asserções ' +
      'abaixo passariam sobre uma lista vazia.',
  );
});

test('todo script que o comando chama entra no pacote publicado', () => {
  const files = pkg.files || [];

  for (const script of scriptsQueOBinCarrega()) {
    const caminho = `scripts/${script}`;
    const coberto = files.some((f) => f === caminho || (f.endsWith('/') && caminho.startsWith(f)));

    assert.ok(
      coberto,
      `"${caminho}" é carregado por bin/bridgeai.js e NÃO está em "files" do ` +
        'package.json. Ele funciona aqui e some no `npm install` de quem usar.',
    );
  }
});

test('o que o pacote promete levar existe mesmo no repositório', () => {
  for (const f of pkg.files || []) {
    assert.ok(
      fs.existsSync(path.join(RAIZ, f.replace(/\/$/, ''))),
      `"files" do package.json lista "${f}", que não existe no repositório.`,
    );
  }
});

test('o binário declarado aponta para um arquivo que existe', () => {
  const bins = Object.values(pkg.bin || {});
  assert.ok(bins.length > 0, 'O pacote precisa declarar um bin.');

  for (const b of bins) {
    const arquivo = path.join(RAIZ, b);
    assert.ok(fs.existsSync(arquivo), `O bin "${b}" não existe.`);

    const conteudo = fs.readFileSync(arquivo, 'utf8');
    const primeira = conteudo.split('\n')[0];

    assert.equal(
      primeira,
      '#!/usr/bin/env node',
      `O bin "${b}" precisa começar com a linha shebang, senão o npm o instala ` +
        'como um arquivo que o sistema não sabe executar.',
    );

    // ⚠️ A asserção acima é de IGUALDADE, e não `startsWith`, de propósito: com
    // CRLF a primeira linha é `#!/usr/bin/env node\r`, um `startsWith` passa, e
    // o Linux procura um interpretador chamado `node\r`. O comando morre em
    // `bad interpreter: node^M` na máquina de quem instalou — nunca na nossa.
    assert.ok(
      !conteudo.includes('\r'),
      `O bin "${b}" tem CRLF. O npm empacota o que está no disco, então ele ` +
        'seria publicado assim e quebraria em todo Linux e Mac. Confira o ' +
        '.gitattributes.',
    );
  }
});

test('o pacote continua sem dependência — é o que o faz baixar num segundo', () => {
  // Zero dependência também é segurança: é a mesma decisão do `agente/`, que
  // tem `dependencies: {}` porque toda biblioteca que ele carregasse seria uma
  // que, comprometida, alcança o banco de quem a roda.
  assert.deepEqual(pkg.dependencies ?? {}, {});
});

test('o túnel não manda mais rodar um script que só existe no plugin', () => {
  // ⚠️ A mensagem de "faltou o acesso" citava `CLAUDE_PLUGIN_ROOT/scripts/login.js`.
  // Quem chega pelo `npx` não tem plugin nenhum, e aquele caminho não existe:
  // a mensagem mandava a pessoa a um lugar onde ela não consegue chegar — que é
  // exatamente o defeito que ela já tinha tido uma vez, quando mandava rodar
  // `npm run login` do repositório privado.
  const tunnel = fs.readFileSync(path.join(RAIZ, 'scripts', 'tunnel.js'), 'utf8');
  const semAcesso = tunnel.slice(tunnel.indexOf('Faltou o acesso'), tunnel.indexOf('Faltou o acesso') + 700);

  assert.ok(semAcesso.length > 0, 'A mensagem de falta de acesso sumiu do túnel.');
  assert.doesNotMatch(
    semAcesso,
    /CLAUDE_PLUGIN_ROOT/,
    'A mensagem voltou a mandar rodar um script pelo caminho do plugin.',
  );
  assert.match(
    semAcesso,
    /npx bridgeai login/,
    'A mensagem precisa dar um caminho que funcione sem plugin.',
  );
});
