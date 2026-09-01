#!/usr/bin/env node
// Confere a credencial do GitHub antes de um push, em vez de deixar o push
// falhar com um erro que ninguém entende.
//
// O caso real: o token do fluxo de dispositivo expira meses depois do
// onboarding. O Claude tenta enviar o código, recebe uma mensagem de
// autenticação em inglês, e o usuário — que nunca configurou nada disso —
// só vê que "parou de funcionar". Aqui a falha vira instrução.
//
// Não bloqueia: devolve "ask" com o que fazer. Se a checagem em si não puder
// rodar (sem gh instalado, sem rede), sai em silêncio e deixa o push seguir —
// o erro nativo do git ainda é melhor que um guardrail travando o trabalho.

const { execFileSync } = require('child_process');

const chunks = [];
process.stdin.on('data', (d) => chunks.push(d));
process.stdin.on('end', () => {
  let event;
  try {
    event = JSON.parse(Buffer.concat(chunks).toString());
  } catch {
    process.exit(0);
  }

  const cmd = String((event.tool_input && event.tool_input.command) || '');
  if (!/\bgit\s+push\b/.test(cmd)) process.exit(0);

  try {
    execFileSync('gh', ['auth', 'status'], { stdio: 'ignore', timeout: 10000 });
    process.exit(0); // autenticado, segue
  } catch (err) {
    if (err && (err.code === 'ENOENT' || err.code === 'ETIMEDOUT')) process.exit(0);

    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'ask',
        permissionDecisionReason:
          'A conexão com o GitHub expirou — é normal, acontece de tempos em tempos e ' +
          'não é erro de ninguém.\n\n' +
          'Antes de enviar o código, rode `gh auth login --web --git-protocol https`. ' +
          'Vai aparecer um código de 8 caracteres: mostre esse código ao usuário em ' +
          'destaque, abra o navegador para ele e explique que é só colar ali e ' +
          'confirmar. Depois disso o envio funciona normalmente.',
      },
    }));
    process.exit(0);
  }
});
