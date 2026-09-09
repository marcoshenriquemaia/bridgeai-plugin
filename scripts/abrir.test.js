/**
 * O abridor de páginas, e principalmente o que ele RECUSA.
 *
 * A metade que importa aqui é negativa. Este script roda na máquina do usuário
 * e o argumento pode chegar de um caminho que ninguém controla: o Claude lê log
 * de aplicação e resultado de consulta, e um "abra http://mal.test" numa linha
 * de log é texto escrito por um visitante do site do cliente. Um abridor
 * genérico executaria isso.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SCRIPT = fileURLToPath(new URL('./abrir.js', import.meta.url));

/** Roda o script e devolve `{ code, out, err }`, sem estourar no erro. */
function rodar(arg) {
  try {
    const out = execFileSync(process.execPath, arg === undefined ? [SCRIPT] : [SCRIPT, arg], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      // O navegador não abre num teste; o que se mede é a decisão, não o efeito.
      env: { ...process.env, PATH: '' },
    });
    return { code: 0, out, err: '' };
  } catch (e) {
    return { code: e.status ?? 1, out: e.stdout ?? '', err: e.stderr ?? '' };
  }
}

describe('abrir.js', () => {
  it('recusa host de fora, e diz de onde aquele endereço provavelmente veio', () => {
    const r = rodar('https://mal.test/urgente');
    assert.equal(r.code, 1);
    assert.match(r.err, /só abro páginas da BridgeAI|só abre páginas da BridgeAI/i);
    assert.match(r.err, /log|tabela|comentário/i);
    assert.doesNotMatch(r.out, /mal\.test/, 'nem imprimir o endereço recusado');
  });

  it('recusa host que só PARECE nosso', () => {
    // `startsWith` aceitaria os dois. A comparação é por segmento.
    for (const u of [
      'https://bridgeaibrasil.com.br.mal.test/x',
      'https://naobridgeaibrasil.com.br/x',
      'https://bridgeaibrasil.com.br@mal.test/x',
    ]) {
      assert.equal(rodar(u).code, 1, u);
    }
  });

  it('recusa esquema que não é http', () => {
    for (const u of ['file:///c:/senhas.txt', 'javascript:alert(1)']) {
      assert.equal(rodar(u).code, 1, u);
    }
  });

  it('aceita o painel e imprime o endereço ANTES de tentar abrir', () => {
    // O endereço impresso é o que sobra quando não há navegador — máquina sem
    // interface, sessão remota, permissão negada. Sem ele, uma falha de abrir
    // deixaria a pessoa sem nada.
    const r = rodar('https://painel.bridgeaibrasil.com.br/projeto/loja/configuracao#variaveis');
    assert.equal(r.code, 0);
    assert.match(r.out, /painel\.bridgeaibrasil\.com\.br\/projeto\/loja\/configuracao#variaveis/);
  });

  it('aceita o loopback, que é o painel em desenvolvimento', () => {
    assert.equal(rodar('http://localhost:5173/credito?recarregar=1').code, 0);
  });

  it('sem argumento, ensina o uso em vez de abrir alguma coisa', () => {
    const r = rodar(undefined);
    assert.equal(r.code, 1);
    assert.match(r.err, /uso:/);
  });
});
