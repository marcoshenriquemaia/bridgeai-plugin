#!/usr/bin/env node
// Carrega as regras da plataforma no início de cada sessão.
//
// Mesma mecânica do guardrail: um CLAUDE.md na raiz de um plugin não vira
// contexto do projeto, então o que precisa valer desde a primeira mensagem
// entra por aqui, via `additionalContext` do hook SessionStart.
//
// A diferença é o perfil. O tom não é um plugin separado: é uma variável.
//   - rules/platform.md  -> sempre
//   - rules/guided.md    -> só quando o perfil é de quem não programa
//
// De onde vem o perfil, na ordem:
//   1. BRIDGEAI_PROFILE no ambiente         (escape hatch, e o que o CI usa)
//   2. ~/.bridgeai/profile.json             (gravado por /bridgeai:comecar,
//                                            atualizado pelo MCP ao conectar)
//   3. "guided"                             (padrão — errar para o lado de
//                                            explicar demais é mais barato do
//                                            que assumir que a pessoa sabe)
//
// Regra de ouro herdada do guardrail: hook que derruba a sessão é pior que
// hook nenhum. Qualquer falha aqui sai em silêncio.

const fs = require('fs');
const path = require('path');
const os = require('os');

const RULES = path.join(__dirname, '..', 'rules');
const PROFILES = new Set(['guided', 'technical']);

function readProfile() {
  const fromEnv = (process.env.BRIDGEAI_PROFILE || '').trim().toLowerCase();
  if (PROFILES.has(fromEnv)) return fromEnv;

  try {
    const file = path.join(os.homedir(), '.bridgeai', 'profile.json');
    const { profile } = JSON.parse(fs.readFileSync(file, 'utf8'));
    const normalized = String(profile || '').trim().toLowerCase();
    if (PROFILES.has(normalized)) return normalized;
  } catch {
    // sem arquivo, ilegível ou com valor estranho: cai no padrão
  }

  return 'guided';
}

function read(name) {
  try {
    return fs.readFileSync(path.join(RULES, name), 'utf8').trim();
  } catch {
    return '';
  }
}

// ⚠️ Aqui existia um aviso de "você ainda não entrou", disparado por
// `BRIDGEAI_TOKEN` estar vazia. Ele saiu em 04/09/2026, junto com a variável:
// quem entra pelo OAuth do Claude Code não tem variável de ambiente nenhuma, e o
// aviso passaria a aparecer em TODA sessão de quem já está dentro — um aviso que
// mente é pior que aviso nenhum.
//
// Quem diz o que fazer é o `platform.md`, e ele diz pelo sinal certo: se as
// ferramentas `mcp__bridgeai__*` não estiverem carregadas, o usuário não entrou.
try {
  const parts = [read('platform.md')];
  if (readProfile() === 'guided') parts.push(read('guided.md'));

  const text = parts.filter(Boolean).join('\n\n---\n\n');
  if (!text) process.exit(0);

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext: text,
    },
  }));
} catch {
  process.exit(0);
}
