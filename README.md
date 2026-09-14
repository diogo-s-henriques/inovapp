## Setup

### Pré-requisitos

- Node.js e npm
- Uma conta/projeto [Firebase](https://console.firebase.google.com/) com **Authentication**
  (método Email/Password) e **Firestore Database** ativados
- Para publicar regras do Firestore: `npx firebase-tools` (não é preciso instalação global —
  ver [Firestore rules](#firestore-rules-e-segurança))

### Instalar e correr

```bash
npm install
# preenche o .env com os dados projeto Firebase
npx expo start
```

### Publicar as regras do Firestore

```bash
npx firebase-tools login
npx firebase-tools use <project-id>          # confere com .firebaserc
npx firebase-tools deploy --only firestore:rules --dry-run   # valida sem publicar
npx firebase-tools deploy --only firestore:rules
```

`.firebaserc` e `firebase.json` já apontam para o projeto do ISEC (`inovapp-68021`);

### Scripts

| comando | o que faz |
|---|---|
| `npm start` | inicia o Metro bundler (Expo) |
| `npm run android` / `ios` / `web` | inicia numa plataforma específica |
| `npm run lint` | `expo lint` (ESLint) |
| `npx tsc --noEmit` | verificação de tipos, sem gerar output |
| `npm run reset-project` | utilitário do template `create-expo-app`, não usado neste projeto |

Antes de dar como terminado qualquer trabalho: `npx tsc --noEmit` e `npm run lint` devem correr
sem erros.

## Estrutura do projeto

Rotas em `src/app/` (Expo Router, ficheiro = rota):

```
src/app/
  login.tsx, create-account.tsx      autenticação
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
  materials.tsx                      Materiais partilhados por disciplina
```

Resto do código-fonte:

```
src/auth/          estado de sessão (store Zustand, listener do Firebase Auth, ações)
src/lib/            acesso a dados — um ficheiro por domínio (chat.ts, sessions.ts,
                     requests.ts, matching.ts, materials.ts, ratings.ts), mais firebase.ts
                     (inicialização), storage.ts (fotos em base64), initials.ts, time.ts,
                     recent-searches.ts (AsyncStorage)
src/components/
  ui/                componentes genéricos reutilizáveis (Button, Checkbox, Pill, StarRating…)
  domain/            componentes específicos do domínio da app (NavBar, CalendarMonth,
                     EvaluationModal, RequestCard, ProfileSetup/…)
src/constants/       valores fixos (disciplinas, cursos, regras de email institucional, tema)
src/types/           tipos TypeScript partilhados
firestore.rules       regras de segurança do Firestore (fonte de verdade de autorização)
```

## Autenticação e papéis

Sem sistema de registo livre: o **papel do utilizador deriva sempre do domínio do email
institucional**, nunca de uma escolha manual (`src/constants/auth.ts`):

- `@alunos.iseclisboa.pt` → `student` (Tutorando)
- `@iseclisboa.pt` → `professor` (Mentor)

Um utilizador pode ainda escolher o seu `participationMode` no onboarding (`learn` / `teach` /
`both`) — é isto que decide se aparece como Tutorando, Mentor, ou ambos, dentro da app; ser
elegível a ensinar exige estar a partir do 2º ano (`isEligibleToTeach`).

## Funcionalidades

- **Pesquisa de mentores/tutorandos** — por disciplina, com filtros; sem leitura ao Firestore ao
  abrir o ecrã, só disparada por query de texto ou filtro ativo. Mostra "Pesquisas recentes"
  (guardadas em AsyncStorage) quando não há pesquisa ativa.
- **Matches / pedidos de conexão** — o Tutorando desliza e carrega em "Conectar", o que envia um
  **pedido de conexão** ao Mentor (não é match automático por like mútuo). Só o Tutorando inicia;
  o Mentor nunca envia pedido a um Tutorando.
- **Notificações in-app** — sino na Home com badge de contagem; ecrã dedicado
  (`notifications.tsx`) com pedidos de conexão e de sessão pendentes, Aceitar/Recusar.
- **Chat em tempo real** — só desbloqueado depois de um pedido de conexão aceite; mensagens via
  Firestore `onSnapshot` (`conversations/{id}/messages`).
- **Agenda / sessões** — calendário mensal + lista do dia; pedido de sessão
  (disciplina/data/hora/modalidade/mensagem) a partir do perfil do outro utilizador ou do chat.
  Ao contrário do pedido de conexão, o pedido de sessão pode partir de qualquer um dos dois lados
  de uma ligação já aceite.
- **Materiais** — mentores partilham um link externo (Google Drive, YouTube, etc.) por
  disciplina; lista filtrável por chips, em tempo real.
- **Avaliação por estrelas pós-sessão** — anónima, aparece automaticamente ao Tutorando quando
  uma sessão passada ainda não foi avaliada nem dispensada; 1 avaliação por sessão.

## Modelo de dados (Firestore)

| coleção | descrição |
|---|---|
| `users/{uid}` | perfil (nome, foto base64, role, participationMode, disciplinas, disponibilidade…) |
| `connectionRequests/{tutorandoUid_mentorUid}` | pedido de conexão Tutorando → Mentor; `status: pending\|accepted\|declined` |
| `sessionRequests/{id}` (ID automático) | pedido de sessão entre dois utilizadores já ligados; qualquer um dos dois pode iniciar |
| `sessions/{id}` | sessão agendada, criada ao aceitar um `sessionRequest`; guarda `sessionRequestId` para a regra de segurança conseguir validar a origem |
| `conversations/{uidA_uidB}` (ID ordenado alfabeticamente) | conversa 1-para-1, criada só ao aceitar um `connectionRequest` |
| `conversations/{id}/messages/{id}` | mensagens da conversa |
| `materials/{id}` | material partilhado (link externo), por disciplina |
| `ratings/{sessionId}` (ID = ID da sessão) | avaliação anónima pós-sessão; nunca guarda quem avaliou |

## Firestore rules e segurança

`firestore.rules` é a fonte de verdade da autorização — **nenhuma regra de negócio de segurança
depende só da UI**. Pontos a destacar:

- `users`: `create` valida que o `role` gravado bate com o domínio do email do token
  autenticado (impede um cliente feito à mão criar-se com `role` arbitrário).
- `connectionRequests`: só o Tutorando (`from`) cria; só o destinatário (`to`) aceita/recusa.
- `sessionRequests` / `conversations`: `create` exige um `connectionRequests` aceite entre as
  duas partes (verificado nos dois sentidos possíveis do ID, já que os dois documentos usam
  convenções de ID diferentes).
- `sessions`: `create` exige um `sessionRequests` aceite por trás (via `sessionRequestId`
  gravado na sessão) e que só o mentor que aceitou o pedido a possa criar.
- `ratings`: `create` confirma via `get()` que quem escreve é o `studentUid` da sessão, sem
  persistir essa relação no documento — garante o anonimato mesmo para quem lê a coleção depois.
- `materials`: `create` só permitido a quem tem `participationMode` `teach` ou `both`.

## Decisões tomadas

- **Materiais por link, não por upload de ficheiro** — o projeto não usa Firebase Storage
  (exige plano Blaze/pago); o mentor cola um link externo (Google Drive, YouTube…) e
  "Descarregar" abre esse link. Pela mesma razão, fotos de perfil são guardadas em base64
  diretamente no Firestore (`src/lib/storage.ts`).
- **Rating não está ligado aos perfis** — `PLACEHOLDER_RATING` em `src/lib/matching.ts`
  continua fixo; a avaliação por estrelas (pós-sessão) fica isolada em `ratings/{sessionId}` e
  não alimenta uma média visível no perfil do mentor. Ligar isto exigiria abrir uma exceção na
  regra de `users/{userId}` para deixar outra pessoa (o aluno) escrever no perfil do mentor —
  decisão de segurança deixada de fora por agora, propositadamente.
  "Entrar" (na agenda) é no-op — não há ainda infraestrutura de videochamada.
- **Sem Cloud Functions / cron** — "sessão já terminou" (para disparar o pedido de avaliação) é
  calculado no cliente, comparando data+hora da sessão com a hora atual.
- **`sessionRequests` com ID automático vs. `connectionRequests` com ID determinístico** — o
  mesmo par de utilizadores pode pedir várias sessões ao longo do tempo, por isso o ID não pode
  ser fixo como em `connectionRequests` (`tutorandoUid_mentorUid`, que só permite 1 pedido ativo
  de cada vez).
- **Sem apagar sessões/pedidos** — todas as coleções têm `allow delete: if false`; registos de
  teste ou dados obsoletos só se removem manualmente pela consola do Firebase.

## Contas de teste

Duas contas de teste existem no projeto Firebase real (não incluídas aqui por serem específicas
do ambiente de desenvolvimento) — perguntar a quem geriu o setup se forem necessárias para
validar fluxos ponta-a-ponta.
