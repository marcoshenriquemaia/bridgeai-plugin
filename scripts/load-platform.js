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

// Sem BRIDGEAI_TOKEN o `.mcp.json` não tem o que mandar no `Authorization`, e o
// Claude Code só diz que o servidor "bridgeai" falhou. Quem instalou e não
// entrou precisa ouvir o que fazer, e não um erro de conexão.
const SEM_TOKEN =
  '## Você ainda não está conectado à BridgeAI\n\n' +
  'Falta o acesso desta máquina: as ferramentas `mcp__bridgeai__*` não vão aparecer ' +
  'até o usuário entrar. Antes de qualquer coisa da plataforma, rode `/bridgeai:entrar` ' +
  'e siga o que ele diz. Não tente contornar, e não peça token nenhum no chat.';

try {
  const parts = [read('platform.md')];
  if (!(process.env.BRIDGEAI_TOKEN || '').trim()) parts.push(SEM_TOKEN);
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
