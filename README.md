## Setup

### Pré-requisitos

- Node.js e npm
- Uma conta/projeto [Firebase](https://console.firebase.google.com/) com **Authentication**
  (método Email/Password) e **Firestore Database** ativados
- Para publicar regras e índices: `npx firebase-tools` (não é preciso instalação global — ver
  [Firestore rules](#firestore-rules-e-segurança))
- **Java**, só para correr os testes das regras: o emulador do Firestore é um processo Java

### Instalar e correr

```bash
npm install
cp .env.example .env     # .env.example lista as variáveis a preencher com os dados do Firebase
npx expo start
```

### Publicar as regras do Firestore

```bash
npx firebase-tools login
npx firebase-tools use <project-id>          # confere com .firebaserc
npx firebase-tools deploy --only firestore:rules --dry-run   # valida sem publicar
npx firebase-tools deploy --only firestore:rules
```

`.firebaserc` e `firebase.json` já apontam para o projeto do ISEC (`inovapp-68021`).

> **Ordem importa:** `users` e `userAccounts` são publicados em conjunto com o código que os
> escreve. Publicar as regras novas e continuar a correr um bundle antigo faz o registo e o
> login falharem (o bundle antigo grava campos privados dentro de `users`). Depois de publicar,
> reinicia o Metro com `npx expo start -c`.

### Índices do Firestore

`firestore.indexes.json` descreve os índices compostos que as consultas da app exigem (o
Firestore recusa consultas que misturam filtros e ordenação sem um índice). Alguns destes
índices foram criados a partir do link que o próprio erro da consola dá, e é isso que este
ficheiro vem corrigir: passa a haver um sítio onde estão declarados.

Antes do primeiro `deploy --only firestore:indexes`, corre `npx firebase-tools firestore:indexes`
para ver o que já está publicado no projeto. O deploy compara o ficheiro com o que existe e
**propõe apagar** os índices que não estejam no ficheiro — confirma antes de aceitar. Como
alternativa, cria só os que faltam no link que o erro da consola apresenta.

> **O emulador não valida isto.** Os testes de `tests/data` correm contra o emulador, que executa
> as consultas com `where` + `orderBy` mesmo sem índice nenhum. Em produção dariam
> `The query requires an index`. Por isso, quem mexer numa consulta que ordena por um campo
> diferente dos que filtra tem de confirmar à mão que o índice está declarado aqui.

### Scripts

| comando | o que faz |
|---|---|
| `npm start` | inicia o Metro bundler (Expo) |
| `npm run android` / `ios` / `web` | inicia numa plataforma específica |
| `npm run lint` | `expo lint` (ESLint) |
| `npx tsc --noEmit` | verificação de tipos da app, sem gerar output |
| `npm run typecheck:tests` | verificação de tipos dos testes (ambiente de Node, config própria) |
| `npm test` | corre as quatro suites abaixo, por esta ordem |
| `npm run test:lib` | testes da lógica pura de `src/lib` e do i18n (Node, sem emulador nem rede, ~150 ms) |
| `npm run test:components` | testes de render de componentes (Jest + Testing Library, ~2 s) |
| `npm run test:data` | testes da camada de dados contra os emuladores de Firestore e Auth (precisa de Java) |
| `npm run test:rules` | testes das regras do Firestore no emulador (precisa de Java) |
| `npm run logcat` | lê o logcat de um Android ligado por USB à procura da causa de um crash |
| `npm run cleanup:legacy-profiles` | migração pontual dos perfis antigos (ver [Migração](#migração)) |
| `npm run reset-project` | utilitário do template `create-expo-app`, não usado neste projeto |

Antes de dar como terminado qualquer trabalho: `npx tsc --noEmit`, `npm run lint`,
`npm run test:lib` e `npm run test:components` devem correr sem erros (nenhum dos dois últimos
precisa de emuladores). Se mexeste em `firestore.rules`, acrescenta `npm run test:rules`; se
mexeste na camada de dados, `npm run test:data`. O que continuar por cobrir são os ecrãs
inteiros e a navegação — para isso, testa no dispositivo.

> **Porque é que o `test:data` corre um ficheiro de cada vez** — os ficheiros de `tests/data/`
> partilham o mesmo par de emuladores e cada um chama `limparEmulador()` no início. Se corressem em
> paralelo, apagariam as contas uns dos outros a meio: o sintoma aparece longe da causa, como um
> `auth/email-already-in-use` a criar uma conta, ou um documento que desaparece debaixo de um
> teste. O `--test-concurrency=1` do script força a ordem.

> **Se a suite das regras falhar logo no início, com um único teste** — `test:data` e `test:rules`
> arrancam emuladores na mesma porta (8080) e, se o primeiro ainda estiver a desligar quando o
> segundo arranca, o `initializeTestEnvironment` do `before` não chega a ligar-se. O sintoma é
> "1 test, 1 fail" em vez de 69, sem nada de errado no `firestore.rules`. Corre outra vez; se
> persistir, confirma que não ficou nenhum emulador preso na porta antes de procurares mais longe.

> **Antes de testar no telemóvel, corre `npx expo install --check`.** O Expo Go da loja é
> compilado com os patches mais recentes do SDK, e um projeto atrasado em relação a eles não dá
> um erro legível: o Expo Go **fecha**. Custou uma sessão a perceber isso, quando o problema eram
> 20 pacotes desalinhados (entre eles o `react-native-worklets`, que é a parte nativa do
> reanimated). O `--check` lista-os e o `--fix` atualiza-os.
>
> Nada disto substitui uma build própria: o Expo Go só corre o SDK que traz, o que chega para
> desenvolvimento, mas não para publicar.

> **`npm audit` — não corras `npm audit fix --force`.** Reporta 25 avisos, todos em ferramentas de
> build (Metro, Babel, eslint, `@expo/config-plugins`) e nenhum enviado para o telemóvel. O
> `--force` propõe descer o `expo-splash-screen` para 55.x, o que desfaz o alinhamento com o SDK 57
> e traz de volta o fecho do Expo Go descrito acima. O `npm audit fix` normal também não é inócuo:
> mexe em 15 pacotes. Se o correres, confirma a seguir o `npx expo install --check` e a suite.

### Depurar um crash no telemóvel (Android)

Quando o Expo Go **fecha** em vez de mostrar o ecrã vermelho, não há erro de JavaScript nenhum: o
processo morreu. A causa está no `logcat` do Android, e é isso que o `npm run logcat` lê. Ele
limpa o buffer, dá-te 30 segundos para reproduzir o crash, e depois destaca o que interessa — o
stack trace de Java **inteiro** (não só a linha `FATAL EXCEPTION`), o tombstone de um crash nativo,
e o que o Hermes imprimiu — guardando sempre o dump completo em ficheiro, porque o contexto à volta
da linha que mata vale tanto como a linha.

```bash
npm run logcat                  # 30 segundos de captura
npm run logcat -- --seconds=60  # se precisares de mais tempo
```

As platform-tools do Android **não são uma dependência do projeto** e não ficam no PATH: o script
procura-as em `ADB`, depois no PATH, e por fim em `C:\Users\<utilizador>\platform-tools\`. Do lado
do telemóvel é preciso a **Depuração USB** ligada (Definições → Opções de programador) e o aviso
"Permitir depuração USB?" aceite uma vez.

## Estrutura do projeto

Rotas em `src/app/` (Expo Router, ficheiro = rota):

```
src/app/
  login.tsx, create-account.tsx      autenticação
  forgot-password.tsx                pedido de reposição de palavra-passe
  profile-setup.tsx                  onboarding obrigatório após 1º login
  (tabs)/                            navegação principal, 5 separadores
    index.tsx                        Home
    pesquisar.tsx                    Pesquisar mentores/tutorandos
    matches.tsx                      Swipe / pedidos de conexão
    chat.tsx                         Lista de conversas
    perfil.tsx                       Perfil próprio
  chat/[id].tsx                      Conversa individual
  profile/[id].tsx                   Perfil de outro utilizador
  profile-edit.tsx
  notifications.tsx                  Pedidos de conexão + de sessão pendentes
  sessions.tsx                       Agenda (calendário + lista)
  session-request.tsx                Formulário "Pedir sessão"
  materials.tsx                      Material (links) partilhado nas conversas
```

Resto do código-fonte:

```
src/auth/          estado de sessão (store Zustand, listener do Firebase Auth, ações)
src/lib/            acesso a dados — um ficheiro por domínio (chat.ts, sessions.ts,
                     requests.ts, matching.ts, materials.ts, ratings.ts, activity.ts),
                     mais firebase.ts (inicialização), storage.ts (fotos em base64),
                     initials.ts, time.ts, url.ts (validação de links), navigation.ts,
                     recent-searches.ts (AsyncStorage)
src/components/
  ui/                componentes genéricos reutilizáveis (Button, Checkbox, Pill, StarRating…)
  domain/            componentes específicos do domínio da app (NavBar, CalendarMonth,
                     EvaluationModal, RequestCard, ProfileSetup/…)
src/constants/       valores fixos (disciplinas, cursos, regras de email institucional, tema)
src/i18n/            traduções (pt, en), contrato `Translations` e store do idioma
src/types/           tipos TypeScript partilhados
tests/               testes automáticos, um diretório por suite (ver "Scripts"):
                       lib/         lógica pura e i18n (Node)
                       components/  render de componentes (Jest)
                       data/        camada de dados contra os emuladores
                       firestore-rules.test.mts   regras, no emulador
                     doubles/ e node-loader.mjs dão aos testes de Node o alias `@/` e
                     substitutos para o AsyncStorage e para a inicialização do Firebase
firestore.rules      regras de segurança do Firestore (fonte de verdade de autorização)
firestore.indexes.json   índices compostos exigidos pelas consultas
scripts/             utilitários (limpeza de perfis antigos, gerador de componentes)
```

## Autenticação e papéis

Sem sistema de registo livre: o **papel do utilizador deriva sempre do domínio do email
institucional**, nunca de uma escolha manual (`src/constants/auth.ts`):

- `@alunos.iseclisboa.pt` → `student` (Tutorando)
- `@iseclisboa.pt` → `professor` (Mentor)

Um utilizador pode ainda escolher o seu `participationMode` no onboarding (`learn` / `teach` /
`both`) — é isto que decide se aparece como Tutorando, Mentor, ou ambos, dentro da app; ser
elegível a ensinar exige estar a partir do 2º ano (`isEligibleToTeach`).

O idioma (PT/EN) é escolhido nos ecrãs de autenticação e fica guardado no dispositivo
(AsyncStorage), sendo retomado no arranque seguinte.

## Funcionalidades

- **Home com as duas listas de ligações aceites** — "Tutores para ti" para quem aprende
  (os mentores com quem já tem conexão aceite) e "Os teus tutorandos" para quem ensina (os
  alunos que aceitou). São simétricas e vêm do mesmo `connectionRequests`: como um pedido vai
  sempre do Tutorando (`from`) para o Mentor (`to`), a lista de tutorandos de um mentor são os
  `from` dos pedidos de que ele é `to` — ver `fetchConnectedMentors`/`fetchConnectedTutees` em
  `src/lib/matching.ts`. Sem a segunda, aceitar um pedido não dava ao mentor nenhum sítio onde
  voltasse a ver o aluno.
- **Pesquisa de mentores/tutorandos** — por disciplina, com filtros; sem leitura ao Firestore ao
  abrir o ecrã, só disparada por query de texto ou filtro ativo. Mostra "Pesquisas recentes"
  (guardadas em AsyncStorage) quando não há pesquisa ativa.
- **Matches / pedidos de conexão** — o Tutorando desliza e carrega em "Conectar", o que envia um
  **pedido de conexão** ao Mentor (não é match automático por like mútuo). Só o Tutorando inicia;
  o Mentor nunca envia pedido a um Tutorando. Os pedidos recebidos **decidem-se no topo deste
  ecrã**, com Aceitar/Recusar: quem só ensina não tem deck nenhum (não procura mentor, é
  encontrado), mas continua a ter aqui a lista do que tem para decidir.
- **Notificações in-app** — o sino da Home conta os pedidos de sessão e as conversas por ler, e
  cada separador com algo à espera tem a sua bolinha (Matches para pedidos de conexão, Chat para
  conversas por ler — ver `NavBar`). O ecrã dedicado (`notifications.tsx`) tem os pedidos de sessão
  com Aceitar/Recusar, **avisa** de cada pedido de conexão recebido (a decisão é nos Matches) e um
  histórico "Recentes" derivado de pedidos já aceites e sessões de amanhã.
- **Chat em tempo real** — só desbloqueado depois de um pedido de conexão aceite; mensagens via
  Firestore `onSnapshot` (`conversations/{id}/messages`). Abre com as últimas 50 mensagens e um
  botão para carregar as anteriores.
- **Agenda / sessões** — calendário mensal + lista do dia; pedido de sessão
  (disciplina/data/hora/modalidade/mensagem) a partir do perfil do outro utilizador ou do chat.
  Ao contrário do pedido de conexão, o pedido de sessão pode partir de qualquer um dos dois lados
  de uma ligação já aceite — e **quem aceita fica como Mentor dessa sessão**, sendo a única parte
  que a pode terminar (ver [Decisões tomadas](#decisões-tomadas)).
- **Materiais** — um material é um **link http/https partilhado dentro de uma conversa** (não há
  coleção `materials` nem upload de ficheiros). O ecrã de Materiais agrega, em tempo real, os
  anexos das conversas do utilizador, filtráveis por enviados/recebidos. O link é validado ao ser
  escrito e outra vez ao ser aberto (`src/lib/url.ts`), porque vem de outro utilizador.
- **Avaliação por estrelas pós-sessão** — anónima, aparece automaticamente ao Tutorando quando
  uma sessão passada ainda não foi avaliada nem dispensada; 1 avaliação por sessão.
- **Bloquear utilizadores** — a partir do perfil de outra pessoa, com confirmação. Um bloqueio
  corta a ligação nos dois sentidos: os dois deixam de se encontrar na descoberta, de se poder
  ligar ou pedir sessões, e a conversa que tivessem fica inacessível para ambos (o histórico não
  é apagado). Gerem-se em **Definições**, um ecrã sem separador próprio que se alcança por uma
  linha discreta no fim do Perfil, e que também tem o idioma e um contacto de ajuda.
- **Recuperação de palavra-passe** — botão nos ecrãs de autenticação; o Firebase envia o email
  com o link. A reposição acontece na página web do Firebase e a pessoa volta à app para entrar
  com a palavra-passe nova (não há deep link de regresso). A confirmação mostrada é sempre a
  mesma, exista ou não conta, para não permitir descobrir que emails estão registados.

## Modelo de dados (Firestore)

| coleção | descrição |
|---|---|
| `users/{uid}` | perfil **visível a quem tem sessão iniciada** (nome, foto base64, role, participationMode, disciplinas, disponibilidade…). Nunca contém dados privados da conta. |
| `userAccounts/{uid}` | dados **privados** da conta: `email`, `lastLoginAt`, `rememberSession`. Legível só pelo próprio. |
| `connectionRequests/{tutorandoUid_mentorUid}` | pedido de conexão Tutorando → Mentor; `status: pending\|accepted\|declined` |
| `sessionRequests/{id}` (ID automático) | pedido de sessão entre dois utilizadores já ligados; qualquer um dos dois pode iniciar |
| `sessions/{id}` | sessão agendada, criada ao aceitar um `sessionRequest`; guarda `sessionRequestId` para a regra de segurança conseguir validar a origem |
| `conversations/{uidA_uidB}` (ID ordenado alfabeticamente) | conversa 1-para-1, criada só ao aceitar um `connectionRequest` |
| `conversations/{id}/messages/{id}` | mensagens da conversa (e os anexos de links que alimentam os Materiais) |
| `ratings/{sessionId}` (ID = ID da sessão) | avaliação anónima pós-sessão; nunca guarda quem avaliou |
| `blocks/{blockerUid_blockedUid}` | bloqueio entre dois utilizadores; o documento tem um sentido, o efeito é simétrico (ver Decisões) |

Não existe coleção de notificações: o ecrã de Notificações deriva tudo do que já existe
(`src/lib/activity.ts`).

## Firestore rules e segurança

`firestore.rules` é a fonte de verdade da autorização — **nenhuma regra de negócio de segurança
depende só da UI**. Pontos a destacar:

- `users`: `create` valida que o `role` gravado bate com o domínio do email do token autenticado
  (impede um cliente feito à mão criar-se com `role` arbitrário) e recusa qualquer campo privado
  da conta; `update` nunca deixa mudar o `role`.
- `userAccounts`: só o próprio lê, e o `create` exige que o `email` gravado seja o do token.
  Foi esta a razão da separação: `users` é legível por toda a comunidade autenticada (a pesquisa
  e o matching precisam disso), portanto o email e a última entrada não podem viver lá.
- `connectionRequests`: só o Tutorando (`from`) cria; só o destinatário (`to`) aceita/recusa.
- `sessionRequests` / `conversations`: `create` exige um `connectionRequests` aceite entre as
  duas partes (verificado nos dois sentidos possíveis do ID, já que os dois documentos usam
  convenções de ID diferentes).
- `sessions`: `create` exige um `sessionRequests` aceite por trás (via `sessionRequestId`
  gravado na sessão) e que só o mentor que aceitou o pedido a possa criar. `update` só permite
  passar de `scheduled` para `completed`, e só pelo mentor — nenhum outro campo pode mudar.
- `ratings`: `create` confirma via `get()` que quem escreve é o `studentUid` da sessão, sem
  persistir essa relação no documento — garante o anonimato mesmo para quem lê a coleção depois.
- Nenhuma coleção permite `delete`.

Há testes destas invariantes em `tests/firestore-rules.test.mts`, que correm contra o emulador
com o mesmo `firestore.rules` que é publicado:

```bash
npm run test:rules        # arranca o emulador, corre os testes e desliga-o (precisa de Java)
```

## Migração dos perfis antigos

Antes da separação `users`/`userAccounts`, o perfil guardava `email`, `lastLoginAt` e
`rememberSession` — legíveis por qualquer utilizador autenticado. Duas coisas tratam disto:

- **No login seguinte**, a app limpa o próprio perfil e garante o documento em `userAccounts`
  (`signIn`, em `src/auth/actions.ts`). As regras toleram a presença desses campos antigos
  (para não bloquear a edição de perfil dessas contas) mas nunca deixam alterá-los.
- **Para quem nunca mais entrar**, há um script de uma vez só:

```bash
# Consola Firebase > Definições do projeto > Contas de serviço > Gerar nova chave privada
export GOOGLE_APPLICATION_CREDENTIALS=/caminho/para/chave.json
npm run cleanup:legacy-profiles              # só mostra o que faria
npm run cleanup:legacy-profiles -- --apply   # aplica (cria userAccounts e limpa o perfil)
```

Usa o `firebase-admin`, que passa por cima das regras — por isso é um script manual e não faz
parte da app.

## Decisões tomadas

- **Materiais por link, não por upload de ficheiro** — o projeto não usa Firebase Storage
  (exige plano Blaze/pago); um material é um link externo (Google Drive, YouTube…) partilhado
  numa conversa. Pela mesma razão, fotos de perfil são guardadas em base64 diretamente no
  Firestore, redimensionadas no dispositivo para 400px (`src/lib/storage.ts`).
- **Só links http/https** — `Linking.openURL` abre o que lhe derem, e o URL vem de outro
  utilizador; esquemas arbitrários (`intent://`, `file://`) seriam um caminho para lançar outra
  app. A validação está na escrita e na abertura.
- **Rating não está ligado aos perfis** — a avaliação por estrelas fica isolada em
  `ratings/{sessionId}` e não alimenta uma média visível no perfil do mentor. Ligar isto exigiria
  abrir uma exceção na regra de `users/{userId}` para deixar outra pessoa (o aluno) escrever no
  perfil do mentor — decisão de segurança deixada de fora, propositadamente.
- **Um pedido de conexão decide-se num sítio só** — aceitar/recusar vive nos Matches, e as
  Notificações limitam-se a avisar que chegou um pedido. Duas listas a decidir o mesmo pedido
  davam duas formas de o fechar, e duas oportunidades de o fechar sem querer (o mesmo raciocínio
  aplicado ao sino da Home, que deixou de contar pedidos de conexão para não apontar para um sítio
  onde já não se decide nada).
- **Quem já tem um pedido de conexão connosco desaparece da descoberta** (deck e pesquisa) — em
  qualquer sentido e em qualquer estado: pendente, aceite ou recusado. Excluir apenas o sentido
  "eu pedi" deixava o mesmo par em cima do Matches (o pedido) e em baixo (o candidato), com o
  "Conectar" a criar um segundo pedido entre as mesmas duas pessoas.
- **Quem aceita o pedido de sessão fica como Mentor dessa sessão** — o pedido pode partir de
  qualquer lado, mas só quem o aceita pode terminar a sessão e é essa parte que o ecrã de agenda
  apresenta como Mentor. Consequência a rever: se um professor pedir a sessão a um aluno, é o
  professor que aparece como "Tutorando" nessa sessão.
- **Limites nas leituras** — nenhuma lista da app lê uma coleção inteira: o chat abre com 50
  mensagens (com "carregar anteriores"), os Materiais leem as últimas 50 mensagens de cada
  conversa, o feed de notificações está limitado e ordenado no servidor, e o conjunto de
  candidatos de pesquisa/matches tem um tecto (`CANDIDATE_POOL_LIMIT`, em `src/lib/matching.ts`).
  Consequência conhecida: acima desse tecto, a pesquisa deixa de ver toda a gente, porque filtra
  no cliente. Passar a pesquisa para o servidor ficou por fazer de propósito (setembro de 2026), e
  há dois caminhos com custos muito diferentes: **só o filtro por disciplina** no servidor não
  precisa de nada novo (um índice, e o tecto desaparece para quem filtra), enquanto uma **pesquisa
  por nome a sério** obriga a guardar um campo com o nome normalizado no perfil — muda a escrita,
  as regras, e precisa de migrar os perfis que já existem.
- **Sem Cloud Functions / cron** — "sessão já terminou" (para disparar o pedido de avaliação) é
  calculado no cliente, comparando data+hora da sessão com a hora atual. A expiração da sessão
  (30 dias com "Lembrar", 1 dia sem) também: é uma decisão de UX, não uma fronteira de segurança
  — o refresh token do Firebase continua válido para um cliente modificado. Depende, no entanto,
  de a sessão estar mesmo guardada no dispositivo: no React Native o `getAuth()` do Firebase fica
  **só com persistência em memória** (o SDK avisa disso no terminal) e é preciso
  `initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })` — ver
  `src/lib/firebase.ts`. Sem isso o `lastLoginAt` desaparecia com o processo, a app pedia
  credenciais a cada arranque e estas expirações nunca chegavam a ser avaliadas.
- **"Lembrar-me" decide duas coisas diferentes** — quanto tempo a sessão dura (30 dias com,
  1 dia sem) e se o **email** fica guardado no dispositivo para o ecrã de entrada o voltar a
  preencher (`src/lib/remembered-email.ts`). Não significa "não me peças credenciais outra vez":
  o "Sair" apaga a sessão sempre — é uma decisão explícita da pessoa e nenhum flag a sobrepõe.
- **Bloqueio é simétrico, e só as regras o garantem** — o documento é criado num sentido só
  (`blocks/{blocker}_{blocked}`), mas basta existir um para o par deixar de poder ligar-se, falar
  ou pedir sessões. As regras avaliam-no com `exists()` (que corre com acesso total, não com as
  permissões de quem fez o pedido), por isso bloquear funciona sem revelar o bloqueio — quem foi
  bloqueado não consegue ler o documento. Consequência assumida: a coleção é legível **pelos dois
  lados** (é o que permite a cada um excluir o outro da descoberta sem falar com o servidor), o que
  quer dizer que um cliente modificado consegue descobrir quem o bloqueou; e a lista de
  *bloqueados* mostra só quem eu bloqueei, nunca quem me bloqueou.
- **A lista de conversas esconde o que as regras não podem filtrar** — *rules are not filters*: uma
  regra não consegue tirar linhas de uma query, por isso um bloqueio é aplicado nas regras
  (mensagens ilegíveis e impossíveis de escrever) **e** filtrado no cliente (a conversa sai da
  lista). O documento da conversa em si continua legível — só os participantes e datas, sem
  conteúdo.
- **Materiais, sessões e pedidos não se apagam** — todas as coleções têm `allow delete: if false`;
  registos de teste ou dados obsoletos só se removem manualmente pela consola do Firebase.
- **Sem modo escuro** — `useTheme()` devolve sempre a paleta clara e o `app.json` está em
  `userInterfaceStyle: light`. É intencional, não é esquecimento.
- **Limitações conhecidas** — as estatísticas do perfil (sessões dadas/recebidas) mostram 0 e
  `sessionsGiven`/`responseTime` dos cartões são placeholders; "Entrar" numa sessão é no-op, não
  há infraestrutura de videochamada; disciplinas, modalidades e períodos de disponibilidade são
  guardados no Firestore como texto em português, por isso não acompanham a mudança de idioma.

## Contas de teste

Duas contas de teste existem no projeto Firebase real (não incluídas aqui por serem específicas
do ambiente de desenvolvimento) — perguntar a quem geriu o setup se forem necessárias para
validar fluxos ponta-a-ponta.
