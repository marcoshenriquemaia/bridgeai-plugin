---
description: Confere e conserta o ambiente quando algo parou de funcionar
---

Este é o comando de "não tá funcionando" — a frase que descreve dezenas de
problemas diferentes. Seu trabalho é descobrir qual deles é, **consertar o que der
para consertar sozinho**, e relatar em português o que sobrou.

Não pergunte ao usuário qual é o erro. Ele não sabe, e perguntar devolve para ele um
problema que é seu.

---

## Verifique nesta ordem

A ordem importa: cada item depende dos anteriores, e relatar o quinto quando o
primeiro está quebrado só confunde.

**1. Ferramentas** — `git`, `gh`, `node` existem e estão em versão compatível?
Instale ou atualize o que faltar, em silêncio.

**2. GitHub** — `gh auth status` responde? Se expirou, refaça o login pelo
navegador mostrando o código em destaque. É a falha mais comum depois de alguns
meses e não é erro de ninguém — diga isso.

**3. Pasta do projeto** — está em caminho sincronizado (OneDrive, Google Drive,
Dropbox, iCloud)? Se estiver, é provavelmente a causa raiz de erros estranhos de
arquivo travado ou repositório corrompido. Proponha mover para
`%USERPROFILE%\BridgeAI\` e faça a mudança se ele aceitar.

**4. Dependências** — `node_modules` existe e bate com o arquivo de lock? Na dúvida,
reinstale.

**5. Ambiente** — as variáveis do arquivo local batem com os recursos que existem
hoje na BridgeAI? Compare com `describe_app`. Recurso trocado ou recriado deixa
credencial velha para trás, e o sintoma é o app subir e não achar o banco. Corrija
com `dev_credentials`.

**6. Serviços** — `status` responde? Banco, armazenamento e servidor estão de pé?

**7. Servidor local** — está rodando? Responde na porta esperada? Se não subir,
olhe o log antes de tentar de novo — subir duas vezes só produz um erro de porta
ocupada em cima do erro real.

## Se o projeto for de app de celular

Aqui existem **dois canais independentes**, e confundi-los é a origem da maioria dos
relatos de "não atualizou". Teste os dois separadamente e diga qual caiu:

- **O empacotador**, que leva o *código* do computador dele para o aparelho. Se
  cair, o app segue rodando com a última versão que recebeu — ele mexe e nada muda
  na tela. Tente rede local primeiro; se falhar, ligue o túnel e **explique que
  ligou** em vez de deixar tudo mais lento sem motivo aparente.
- **A API**, que leva os *dados* da nuvem para o aparelho. Se cair, a tela atualiza
  normalmente mas dá erro ao carregar qualquer coisa.

## Como relatar

Uma linha por item verificado, com o que você fez:

> ✅ Ferramentas — ok
> ✅ GitHub — a conexão tinha expirado, já reconectei
> ✅ Projeto — estava no OneDrive, movi para a pasta certa
> ✅ Servidor — no ar em http://localhost:3000
>
> Estava tudo travando por causa do OneDrive. Já resolvido, pode continuar.

Se sobrou algo que só ele resolve, deixe por último, sozinho, com o passo a passo.

$ARGUMENTS
