## Setup

### Pré-requisitos

- Node.js e npm
- Uma conta/projeto [Firebase](https://console.firebase.google.com/) com **Authentication**
  (método Email/Password) e **Firestore Database** ativados
- Para publicar regras e índices: `npx firebase-tools` (não é preciso instalação global - ver
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
**propõe apagar** os índices que não estejam no ficheiro - confirma antes de aceitar. Como
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
| `node scripts/png-transparent-background.js <entrada> <saída>` | tira o fundo branco de um logótipo PNG (ver [Imagens com fundo branco](#imagens-com-fundo-branco)) |
| `npm run cleanup:legacy-profiles` | migração pontual dos perfis antigos (ver [Migração](#migração)) |
| `npm run verify:legacy-accounts` | confirma à mão as contas anteriores à confirmação de email (ver [Confirmação de email](#confirmação-de-email)) |
| `npm run reset-project` | utilitário do template `create-expo-app`, não usado neste projeto |

Antes de dar como terminado qualquer trabalho: `npx tsc --noEmit`, `npm run lint`,
`npm run test:lib` e `npm run test:components` devem correr sem erros (nenhum dos dois últimos
precisa de emuladores). Se mexeste em `firestore.rules`, acrescenta `npm run test:rules`; se
mexeste na camada de dados, `npm run test:data`. O que continuar por cobrir são os ecrãs
inteiros e a navegação - para isso, testa no dispositivo.

**E o `.github/workflows/test.yml` corre tudo isso sozinho** em cada push para `main` e em cada
pull request: lint e tipos primeiro (é o que falha depressa), depois as quatro suites. Duas delas
precisam do emulador, que é um processo Java - daí o `setup-java` no workflow. Se uma suite passar
na tua máquina e falhar aqui, o mais provável é uma diferença de ambiente (versão do Node ou do
Java) e não o código; o workflow fixa as duas (Node 24, Java 21, as versões em que o projeto é
desenvolvido).

> **Porque é que o `test:data` corre um ficheiro de cada vez** - os ficheiros de `tests/data/`
> partilham o mesmo par de emuladores e cada um chama `limparEmulador()` no início. Se corressem em
> paralelo, apagariam as contas uns dos outros a meio: o sintoma aparece longe da causa, como um
> `auth/email-already-in-use` a criar uma conta, ou um documento que desaparece debaixo de um
> teste. O `--test-concurrency=1` do script força a ordem.

> **Se a suite das regras falhar logo no início, com um único teste** - `test:data` e `test:rules`
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

> **`npm audit` - não corras `npm audit fix --force`.** Reporta 25 avisos, todos em ferramentas de
> build (Metro, Babel, eslint, `@expo/config-plugins`) e nenhum enviado para o telemóvel. O
> `--force` propõe descer o `expo-splash-screen` para 55.x, o que desfaz o alinhamento com o SDK 57
> e traz de volta o fecho do Expo Go descrito acima. O `npm audit fix` normal também não é inócuo:
> mexe em 15 pacotes. Se o correres, confirma a seguir o `npx expo install --check` e a suite.

### Imagens com fundo branco

Os logótipos que recebemos chegam com o fundo branco colado, e sobre o cinzento dos ecrãs isso vê-se
como uma tarja. O `scripts/png-transparent-background.js` tira-o:

```bash
node scripts/png-transparent-background.js "assets/Parceiros/entrada.png" "assets/Parceiros/parceiros.png"
```

O que ele faz, e porque não é só "apagar o branco": começa nas **bordas** da imagem e alarga-se
apenas aos pixéis claros **ligados à borda**. É isso que distingue o fundo do branco *de dentro* do
logótipo - um "P" branco num quadrado azul é branco, mas não está ligado à borda, e fica onde está.
Apagar todos os pixéis brancos, em vez disto, abria buracos em todo o texto branco dos logótipos.
Nas bordas suavizadas o pixel sai com **alpha parcial**, o que evita o contorno duro à volta das
letras. Os limites são afinaláveis (`--floor=210`, `--white=245`) e o script diz o que fez, para se
poder ver se apanhou um logótipo claro por engano.

A faixa dos parceiros (`assets/Parceiros/parceiros.png`, 1093x131, mostrada a 42 px de altura no
`PartnersMarquee`) foi feita assim. O ficheiro que lá estava era um WebP **VP8 sem canal alfa** -
tinha o mesmo problema do fundo branco e ainda a perda de qualidade da compressão.

### Depurar um crash no telemóvel (Android)

Quando o Expo Go **fecha** em vez de mostrar o ecrã vermelho, não há erro de JavaScript nenhum: o
processo morreu. A causa está no `logcat` do Android, e é isso que o `npm run logcat` lê. Ele
limpa o buffer, dá-te 30 segundos para reproduzir o crash, e depois destaca o que interessa - o
stack trace de Java **inteiro** (não só a linha `FATAL EXCEPTION`), o tombstone de um crash nativo,
e o que o Hermes imprimiu - guardando sempre o dump completo em ficheiro, porque o contexto à volta
da linha que mata vale tanto como a linha.

```bash
npm run logcat                  # 30 segundos de captura
npm run logcat -- --seconds=60  # se precisares de mais tempo
```

As platform-tools do Android **não são uma dependência do projeto** e não ficam no PATH: o script
procura-as em `ADB`, depois no PATH, e por fim em `C:\Users\<utilizador>\platform-tools\`. Do lado
do telemóvel é preciso a **Depuração USB** ligada (Definições → Opções de programador) e o aviso
"Permitir depuração USB?" aceite uma vez.

### Builds e o fim do Expo Go

```bash
eas login                              # conta Expo (diyogo)
eas build --profile development --platform android   # development build (APK)
eas build --profile production --platform android    # build de produção
eas build --profile preview --platform android       # para partilhar, sem loja
```

**A app deixou de correr no Expo Go.** O `expo-observe` (erros em produção, ver abaixo) e o
`expo-dev-client` são módulos nativos que o Expo Go não traz: o primeiro rebentava ao ser importado,
**antes de haver ecrã** - a app abria e fechava-se logo a seguir, sem nada a dizer porquê (o
"Cannot find native module 'ExpoAppMetrics'"). Desde então o `expo-observe` é carregado de forma
tolerante (`src/lib/observe.ts`), por isso esse fecho já não acontece; o caminho continua a ser a
**development build**: instalada uma vez, `npx expo start` liga-se-lhe em vez de ao Expo Go (o QR
que aparece é o dela). Comandos que continuam a funcionar no Expo Go: não há - para testar no
telemóvel é preciso a build.

**Uma dependência nativa nova obriga a uma build nova.** Foi assim que o `expo-observe` entrou (o
`expo-app-metrics` vem com ele, como dependência transitiva): o JavaScript pode ser o mais recente
de todos, servido pelo Metro ou por um push, mas quem tem de estar **dentro do binário** é o módulo
nativo. Um development client de ontem a servir o código de hoje importa um módulo que não tem - e o
sintoma é a app a fechar ao abrir. Depois de mexer em módulos nativos, uma build nova **antes** de
testar: `npx eas-cli build --profile development --platform ios`.

- **Android**: nada de contas. A `development` sai como APK (distribuição interna), com a keystore
  gerada e guardada pelo EAS; instala-se pelo QR/link que a build devolve.
- **iOS**: precisa de conta Apple Developer e do **dispositivo registado** (`eas device:create`) -
  em distribuição interna a build só corre nos aparelhos cujo UDID está no perfil de
  aprovisionamento. O login na Apple é interativo (pede Apple ID e, normalmente, 2FA), por isso
  tem de ser a pessoa a correr `eas build --profile development --platform ios` no seu terminal.
- **`cli.appVersionSource: remote`** (no `eas.json`): o `versionCode`/`buildNumber` passaram a ser
  geridos pelo EAS e não no `app.json` (era o aviso que a CLI dava).
- **Identificadores**: `com.diyogo.inovapp` (Android `package` e iOS `bundleIdentifier`). É livre de
  mudar **até à primeira publicação numa loja**; se a app for publicada em nome do ISEC, o que faz
  sentido é `pt.iseclisboa.inovapp`.
- **`expo-notifications` é um módulo nativo**: uma build feita antes de ele entrar no `app.json`
  **não** tem avisos (o `ErrorScreen` continua a aparecer num aviso tocado, mas nada é registado) -
  é preciso uma build nova a partir deste commit, além das credenciais FCM (ver **Avisos no
  telemóvel**, acima).

### Publicar nas lojas (Apple e Google)

**O identificador é `com.diyogo.inovapp`** (Android `package` e iOS `bundleIdentifier`) e fica
assim: o primeiro envio grava-o e mudá-lo depois obriga a criar uma app nova nas duas lojas. Com
esta escolha, a app é publicada através da equipa Apple `UNIVERSITAS … (64ZH528SHV)` - a do ISEC -
com o registo a apontar para o nome que já lá está.

```bash
npx eas-cli build --profile production --platform android   # .aab, para o Play Console
npx eas-cli build --profile production --platform ios       # .ipa, para o TestFlight / App Store
```

O Android sai **sem interação** (a keystore já existe, da build de desenvolvimento). O iOS **exige
modo interativo na primeira vez**: o perfil de aprovisionamento de **distribuição** (App Store) para
`com.diyogo.inovapp` ainda não existe na conta Apple, e criá-lo precisa de autenticação - daí
`--non-interactive` falhar com `Credentials are not set up`. Respostas: reutilizar o certificado de
distribuição (**sim**, é da equipa e é o mesmo tipo de certificado que assina o `.ipa`), criar o
perfil novo (**sim**) e configurar as notificações (**sim** - é o que cria a chave APNs que falta
para o iPhone receber avisos).

```bash
npx eas-cli submit --platform ios --profile production      # precisa do registo da app no App Store Connect
npx eas-cli submit --platform android --profile production  # precisa da conta de serviço do Play
```

No iOS o `submit` pede a chave da App Store Connect API (Users and Access → Integrations) ou as
credenciais Apple; no Android, para a **primeira** versão o caminho simples é arrastar o `.aab` para
o Play Console à mão, e deixar o `submit` para as seguintes.

**O `submit` precisa de um perfil, e o `eas.json` é público.** O que ficou lá não tem segredo nenhum
dentro:

```json
"submit": {
  "production": {
    "ios": { "appleId": "info@iseclisboa.pt", "appleTeamId": "64ZH528SHV" }
  }
}
```

Com o `appleId`, o EAS autentica e **cria a app na App Store Connect se ela ainda não existir** -
`ascAppId` é opcional em modo interativo (só é obrigatório sem interação, onde não há quem responda
à pergunta). E o que **não** pode entrar no `eas.json` é a credencial de upload:

```
EXPO_APPLE_APP_SPECIFIC_PASSWORD                              # account.apple.com > Sign-In and Security
EXPO_ASC_API_KEY_PATH / EXPO_ASC_KEY_ID / EXPO_ASC_ISSUER_ID  # appstoreconnect.apple.com > Users and Access > Integrations
```

A chave da API é a melhor das duas - não depende da password da conta, não expira com ela e serve
para o CI; a app-specific password é mais rápida de criar e chega para uma submissão à mão. Em vez de
variáveis, o schema também aceita a sintaxe `$NOME` (ex.: `"ascApiKeyPath": "$ASC_API_KEY_PATH"`),
que lê o valor do ambiente no momento em que corre. O que não se faz é pôr qualquer delas no
repositório, que é público.

#### O primeiro envio no Play Console (e a chave de assinatura)

**A app já está criada na Play Console** (`INOVAPP`, gratuita, tipo *app*). O primeiro `.aab` sobe-se
à mão e o caminho mais curto é o **teste interno**: não espera revisão, valida o `.aab` contra as
verificações do Play (que apanham manifestos e `targetSdk` antes de qualquer lançamento a sério) e é
ele que cria a **chave de assinatura da Play** - que é precisamente a peça que falta ao App Check.
Outra razão para não deixar isto para o fim.

1. Play Console > **Teste e lançamento > Teste interno > Criar novo lançamento**; aceitar a
   **Play App Signing** quando pede (é o que gera a chave).
2. Arrastar o `.aab` (`npx eas-cli build --profile production --platform android`, ou o link da
   build no expo.dev). Notas do lançamento: uma linha chega.
3. **Guardar** > **Revisão do lançamento** > **Iniciar lançamento**.
4. **Teste e lançamento > Configuração > Chave de assinatura de app**: copiar a **SHA-256** do
   *certificado de assinatura de app* (**não** a de *upload* - com a Play App Signing é a da
   assinatura que vai no telemóvel, e é essa que o Play Integrity vê) e colar no formulário do Play
   Integrity na Consola Firebase, com a vida útil de **1 hora**.

O `versionCode` é do EAS (`cli.appVersionSource: remote` + `autoIncrement`), por isso cada `.aab`
novo entra com o seguinte e nunca há número repetido a resolver. E **um `.aab` que já existe na Play
não se apaga**: o que se sobe a seguir tem de ter número maior - é o que acontece por construção.

**É o ficheiro que diz o que lá está, e ele abre-se.** O EAS etiqueta cada build com o commit do
`HEAD` (`vcs/clients/git.js` só copia os ficheiros alterados *por cima* do clone raso, a não ser que
se ligue `requireCommit`), por isso a etiqueta **não** é o que a build levou - o que levou foi a
árvore de trabalho no instante em que foi lançada. A verificação que interessa é abrir o
artefacto:

```bash
unzip -q prod.ipa -d verif && ls verif/Payload/INOVAPP.app        # Info.plist, embedded.mobileprovision, main.jsbundle
grep -a "A carregar a fotografia" verif/Payload/INOVAPP.app/main.jsbundle   # uma string do código mais recente
unzip -q prod.aab -d verif-aab && grep -al "play.core.integrity" verif-aab/base/dex/*.dex
```

Foi assim que se confirmou que a `f3de75c0` (iOS, 1.0.0/4, perfil `*[expo] … AppStore` com
`appattest` `development` **e** `production` e `aps-environment production`) e a `9561fc9a`
(Android, `versionCode` 5, com as classes do Play Integrity e o `RNFBAppCheck` no dex) levam o
código atual - e não o que diz o commit etiquetado, que ficou para trás do trabalho feito a seguir
(são as últimas duas builds de produção e servem para o primeiro envio às duas lojas).

#### O que a ficha das lojas pede

| | o que é |
|---|---|
| Política de privacidade **num URL público** | usa-se o PDF que a Universitas publica (`https://happycampus.pt/pdfs/TC_App_HappyCampus.pdf`) - decisão tomada com os olhos abertos: é o TC de **outra** aplicação («Buddy App»), e o que isso implica está escrito em `STORE.md` e no topo do `PRIVACY.md` |
| URL de suporte | `https://happycampus.pt` |
| Capturas de ecrã | Apple: iPhone 6,7"; Play: 2 a 8 capturas **e** uma imagem de destaque 1024x500 |
| Segurança de dados (Play) e App Privacy (Apple) | o que é recolhido, para que serve e se é ligado à identidade - o `PRIVACY.md` é a fonte para responder a isto |
| Conta de demonstração | a app só aceita email institucional, por isso a **revisão não consegue entrar**. Feito: `npm run create:demo-account` cria `aluno.demo@alunos.iseclisboa.pt` (vê o deck inteiro) e `demo@iseclisboa.pt` (o lado do Tutor), com o email confirmado e o perfil completo - falta escrever as credenciais nas duas fichas |

Texto de partida para a ficha (nome, subtítulo e descrição), para não se escrever do zero:

```
Nome           INOVAPP
Subtítulo      Mentorias entre alunos e docentes do ISEC Lisboa (máx. 30 car.)

Descrição
A INOVAPP liga quem quer aprender a quem pode ensinar, dentro do ISEC Lisboa.

· Descobre mentores por disciplina, curso e disponibilidade
· Pede conexão e combina sessões de apoio em dois toques
· Fala com quem te acompanha, com os materiais todos no mesmo sítio
· Acompanha as tuas sessões (agendadas, dadas e recebidas)

Só entra quem tem email institucional (@alunos.iseclisboa.pt ou @iseclisboa.pt).
```

> **Não prometer avisos no telemóvel nesta descrição** enquanto não existirem as Cloud Functions
> que os enviam: a app já os sabe receber, mas ninguém os envia. É o primeiro sítio onde a revisão
> da Apple tropeça - uma função anunciada que não acontece.

#### O texto das lojas

Está escrito e pronto a colar em **`STORE.md`** (nome, subtítulo, descrições, palavras-chave, notas
para a revisão e o formulário de segurança de dados da Play), em português e em inglês. Os limites
de caracteres de cada campo são conferidos por `npm run store:check`, que lê o próprio ficheiro -
um subtítulo de 31 caracteres recusa o texto todo na loja e não se vê a olho.

#### Duas coisas a tratar antes de submeter

- **Eliminação de conta: feita dentro da app** (Definições → *Apagar conta*, ver "Apagar a conta"
  abaixo). Era o requisito da Apple que faltava - a diretriz 5.1.1(v) exige que quem pode criar
  uma conta a possa apagar no app. Do lado do Play, o formulário de *segurança de dados* pede
  também um **URL** para pedir a eliminação (além do caminho na app); o URL de suporte já escolhido
  serve para isso.
- **Contas no Play criadas como pessoais** só ganham acesso à produção depois de um teste fechado
  com **12 testadores durante 14 dias**. Contas de **organização** (ISEC) estão fora desta regra -
  vale a pena confirmar qual é a tua antes de contar com uma data.

### Erros em produção (EAS Observe)

O que a app faz hoje e onde está:

| | onde | o que faz |
|---|---|---|
| Limite de erro | `src/app/_layout.tsx` (`ErrorBoundary`, `unstable_settings`, `ObserveRoot`) | apanha o erro, mostra o `ErrorScreen` e mantém a navegação montada |
| Costura | `src/lib/error-reporting.ts` | normaliza o erro (contexto + stack) e manda-o |
| Ecrã | `src/components/domain/ErrorScreen` | diz o que aconteceu e dá uma segunda tentativa |

O serviço é o **EAS Observe** (`expo-observe`, SDK 57), ligado em `Observe.configure({...})`:
`'expo-router': true` dá métricas por ecrã e `filteredParams` tira do que é exportado os parâmetros
de rota que levam nomes e ids de pessoas. O `errorBoundaryFallback` do `ObserveRoot` fica com o
**último** limite de erro da app (o que apanha o que rebenta antes de haver ecrã para o mostrar) e é
o único que regista a stack de componentes React.

**`dispatchInDebug: true` está ligado para se verem os primeiros eventos na development build.**
Tirar antes de publicar: as medições de uma build de debug estão distorcidas. Os dados vêem-se em
`expo.dev` → projeto → **Observe** (página *Errors* para erros, *Navigation* para tempos por ecrã),
ou pela linha de comandos (`npx eas-cli observe:versions`, `observe:errors`…).

**Nada de dados pessoais no que é reportado** - o que entra num erro sai do dispositivo e fica
visível nesse painel. Um nome de utilizador ou um email no texto de um erro é uma fuga: o contexto
(`[chat]`) é o sítio, e o id não é preciso.

**O serviço é opcional, e a app não depende dele.** `src/lib/observe.ts` carrega o módulo à mão, com
a falha apanhada: sem ele `observe` é `null`, não há métricas nem erros reportados, e a app corre
como sempre (o `reportError` passa a escrever só no terminal, em desenvolvimento). A alternativa -
um `import` no topo do ficheiro - custava a app inteira: a falha acontece quando o ficheiro é
avaliado, e nessa altura ainda não há ecrã para a mostrar. `tests/components/observe-fallback.test.tsx`
fixa-o, com uma fábrica que lança exatamente o erro do módulo nativo em falta.

### Avisos no telemóvel (push)

**A metade feita é a de receber.** O telemóvel regista-se em `users/{uid}/devices/{id}` com o token
que a Expo emite (o `projectId` vem do `extra.eas.projectId` do `app.json`, escrito pelo `eas init`)
e o toque num aviso abre o ecrã que ele traz em `data.url` - ou as Notificações, quando não traz
nenhum. Vive em três peças:

| | onde | o que faz |
|---|---|---|
| Decisão e dados | `src/lib/push.ts` | registar / apagar / não fazer nada, e as escritas no Firestore - **sem** tocar no `expo-notifications`, o que a torna testável sem telemóvel (`tests/lib/push.test.mts`) |
| Lado nativo | `src/push/actions.ts` | permissões, canal Android, token da Expo |
| Arranque e toque | `src/push/listener.ts` | regista no arranque (com o perfil já completo) e trata do toque |

Três decisões que valem a pena saber:

- **O token nunca entra no perfil.** `users/{uid}` é legível por qualquer utilizador autenticado: um
  token lá dentro era uma forma de qualquer conta enviar avisos em nome da app a qualquer pessoa.
- **A permissão só é pedida depois do perfil completo**, e não no arranque - um pedido recusado não
  se repete, e vale a pena a pessoa já saber para que serve a app. O estado e o interruptor estão
  nas **Definições** (com um caminho para as definições do sistema quando a permissão foi recusada,
  que é o único caminho que resta nesse caso).
- **Desligar apaga o registo** em vez de o deixar parado (e o mesmo quando a permissão é recusada no
  sistema): continuar a enviar para quem já não quer avisos é o pior estado possível aqui.

**Falta a metade de enviar.** Um aviso a outra pessoa tem de sair de um sítio que corra **com a app
fechada**, e a decisão é **Cloud Functions a disparar no Firestore** (ao criar um `connectionRequest`
ou um `sessionRequest`) a chamar a Expo Push API com os tokens da subcoleção `devices`. Exige o plano
**Blaze** (basta associar um cartão; dentro dos limites gratuitos continua a não se pagar nada).
A alternativa - a app enviar diretamente - foi rejeitada de propósito: a API de envio da Expo **não
pede autenticação**, por isso quem envia tem de poder ler o token de quem recebe, e isso é dar a
qualquer conta autenticada o poder de enviar avisos a quem quiser.

Passos que dependem das contas (por fazer):

```bash
npx eas-cli credentials --platform android   # credenciais FCM V1 (conta Google) - sem elas não há token em Android
npx firebase-tools deploy --only firestore:rules   # as regras de users/{uid}/devices
```

O registo falhado **não rebenta a app**: sem token (credenciais em falta, por exemplo) fica só um
aviso na consola em desenvolvimento, a app continua a funcionar e as **Definições dizem que este
telemóvel não ficou registado** - a permissão dada não é mostrada como registo feito.

## Estrutura do projeto

Rotas em `src/app/` (Expo Router, ficheiro = rota):

```
src/app/
  login.tsx, create-account.tsx      autenticação
  forgot-password.tsx                pedido de reposição de palavra-passe
  verify-email.tsx                   confirmação do email institucional (antes do perfil)
  profile-setup.tsx                  onboarding obrigatório após 1º login
  (tabs)/                            navegação principal, 5 separadores
    index.tsx                        Home
    pesquisar.tsx                    Pesquisar mentores/tutorandos
    matches.tsx                      Descoberta (lista) + pedidos de conexão
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
src/lib/            acesso a dados - um ficheiro por domínio (chat.ts, sessions.ts,
                     requests.ts, matching.ts, materials.ts, ratings.ts, activity.ts),
                     mais firebase.ts (inicialização), storage.ts (fotos em base64),
                     initials.ts, time.ts, url.ts (validação de links), navigation.ts,
                     recent-searches.ts (AsyncStorage)
                     live-query.ts (leitura viva partilhada por vários ecrãs),
                     error-reporting.ts (por onde passam os erros apanhados)
src/components/
  ui/                componentes genéricos reutilizáveis (Button, Checkbox, Pill, StarRating…)
  domain/            componentes específicos do domínio da app (NavBar, CalendarMonth,
                     EvaluationModal, RequestCard, ProfileSetup/, ScreenHero - o bloco de
                     cabeçalho comum aos cinco separadores -, StackHeader - o dos ecrãs
                     empilhados, com o BackButton -, ErrorScreen…)
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
.github/workflows/test.yml   lint, tipos e as quatro suites, em cada push e em cada pull request
```

## Autenticação e papéis

Sem sistema de registo livre: o **papel do utilizador deriva sempre do domínio do email
institucional**, nunca de uma escolha manual (`src/constants/auth.ts`):

- `@alunos.iseclisboa.pt` → `student` (Tutorando)
- `@iseclisboa.pt` → `professor` (Mentor)

Um utilizador pode ainda escolher o seu `participationMode` no onboarding (`learn` / `teach` /
`both`) - é isto que decide se aparece como Tutorando, Mentor, ou ambos, dentro da app; ser
elegível a ensinar exige estar a partir do 2º ano (`isEligibleToTeach`).

O idioma (PT/EN) é escolhido nos ecrãs de autenticação e fica guardado no dispositivo
(AsyncStorage), sendo retomado no arranque seguinte.

## Funcionalidades

- **Home: um bloco de identidade e o que é acionável** - abre com um cabeçalho em gradiente
  claro (`HomeHeader`, o `heroTop`/`heroBottom` da paleta), mais claro que o fundo do ecrã: a fotografia (quadrada de cantos arredondados, 80 px), a identidade em três
  linhas - a saudação (bom dia / boa tarde / boa noite, `greetingPeriod` em `src/lib/home.ts`), o
  **nome completo** e o **papel** (`roleLabel`, em `src/lib/roles.ts`) - e o sino no canto
  superior direito, alinhado com as três. Os **números da agenda saíram daqui**: são do Perfil, e
  repetir "agendadas / dadas / recebidas" a dois centímetros dos mesmos números não era
  informação; o que sobra no cabeçalho é quem és, e o `summarizeSessions` continua a contar para
  quem o mostra (o Perfil, por `subscribeToSessionStats`). O gradiente chega ao topo do ecrã, por
  isso o `SafeAreaView` do ecrã **não** trata da barra de estado nas bordas de cima - o espaço é
  dado ao cabeçalho, que sabe quanto é - e os ícones da barra passam a **escuros** enquanto este
  ecrã está à frente (por foco: aplicado uma vez, ficava a valer nos outros separadores).
- **Puxar a Home para baixo** relê **se há** ligações aceites (`hasConnections`) - é essa pergunta
  de sim/não que decide se a Home ainda está vazia, porque as listas saíram daqui. Chegou a ser
  respondida lendo as duas listas completas (duas consultas, um perfil por linha e os dois pares
  de bloqueios); agora são dois documentos (`limit(1)` de cada lado) - e, no caso raro de o único
  documento encontrado ser de alguém bloqueado, recua para a leitura completa em vez de responder
  "não tens ligações" ao lado de outra que existe. O indicador aparece sobre a cor do
  cabeçalho, e não sobre branco: a cor da própria lista é a do topo do gradiente (`styles.scroll`)
  e o conteúdo dela é claro (`styles.content`), que é o que faz a faixa revelada ao puxar ter a cor
  do cabeçalho. O resto do ecrã não é relido ao puxar porque não precisa: as sessões, os pedidos e as
  conversas são subscrições ao vivo.
- **Home: as secções** - por baixo do cabeçalho, por ordem: a secção **"Novidades"** com o que
  espera resposta (pedidos de conexão, pedidos de sessão, mensagens por ler) e a contagem no
  título, o **calendário da agenda** (o mês com um ponto nos dias que têm sessão; tocar num dia
  empilha a Agenda já nesse dia - ver `AgendaCard`) e o atalho dos **Materiais**. Uma regra decidiu
  o que está aqui: **cabe no ecrã sem rolar**. Foi por isso que quatro coisas saíram, cada uma com
  a sua razão - a **próxima sessão** em destaque (o *quando* das sessões passou a ser o calendário,
  que o diz sem uma linha de texto, e a lista do dia é a Agenda), as **listas
  de ligações** (quem está ligado a quem está no Chat, onde as conversas são exactamente essas
  pessoas, e é lá que se pede uma sessão a quem já se conhece - `ChatSessionRequestCard`), os
  atalhos das **Mensagens** e da **Pesquisa** (são dois dos cinco separadores da barra de baixo, e
  um segundo caminho para eles no meio da Home era espaço gasto onde ele é mais curto) e os
  **números da agenda** ("0 agendadas", que são do Perfil). O que fica é o que a Home faz melhor do
  que qualquer outro ecrã: quem és, o que espera por ti e quando tens sessões. A **descoberta** de
  quem ainda não conheces vive nos Matches e na pesquisa e o **histórico** nas Notificações:
  chegaram a estar também aqui, em resumo, e eram duas cópias do mesmo em três ecrãs.
- **A conta de «cabe num ecrã»** - para um telemóvel de 844 pt de altura (iPhone 14) com a barra de
  baixo a 80 pt do fundo, sobram **764 pt** de área visível, contra **183** do cabeçalho (barra de
  estado, 32 de folga, fotografia de 80 e 24 em baixo), **24** de intervalo, **126** da secção
  "Novidades" com uma pendência, **24**, **282** do calendário (cabeçalho do mês, dias da semana,
  as cinco semanas de um mês normal e 32 de margem), **24** e **72** do atalho dos Materiais:
  **747**. Os três passos que deram essa folga estão nas peças, e não no ecrã: o **círculo do dia**
  desceu de 32 para 28 px (com `hitSlop`, para o alvo do toque não encolher com ele), a margem do
  **`AgendaCard`** de 20 para 16 e as linhas da secção "Novidades" de 56 para 48 px (176 em vez de
  216 quando os três tipos estão à espera ao mesmo tempo). **A conta muda com o que está no ecrã, e
  isso é o que se sabe e não se esconde:** com duas ou mais pendências, num mês de seis semanas
  (agosto de 2026, por exemplo) ou num ecrã pequeno - um iPhone SE tem 587 pt visíveis - continua a
  haver deslize. É por isso que a Home continua a ser uma `ScrollView`: a conta diz o que se espera,
  e a lista garante que nada fica cortado quando a conta não bate certo. O guia de primeiros passos
  é a peça que mais pesa nessa margem (≈200 px), por ser texto.
- **A Home quando não há nada** - **cada bloco só se desenha quando tem conteúdo**: uma lista vazia
  é indistinguível de uma leitura que falhou, e era isso que fazia a Home parecer um ecrã em branco
  para quem ainda não tinha nada. Quando não há mesmo nada - sem sessões, sem ligações e sem
  pendências (`isHomeEmpty`, em `src/lib/home.ts`) - aparece um guia de primeiros passos; para quem
  só ensina, o guia diz que são os tutorandos que o vêm procurar a ele, em vez de apontar para os
  Matches (fechados nesse caso). O guia **não aparece quando a leitura das ligações falhou**: das
  duas, "não tenho ligações" e "não sei as minhas ligações", só a primeira é que se pode dizer.
- **As duas listas de ligações aceites** - "Tutores para ti" para quem aprende (os mentores com
  quem já tem conexão aceite) e "Os teus tutorandos" para quem ensina (os alunos que aceitou).
  Viveram na Home e **saíram dela** (ver a conta de "cabe num ecrã"); o que ficou é a leitura que as
  alimentava, usada agora para decidir se a Home está vazia. São simétricas e vêm do mesmo
  `connectionRequests`: como um pedido vai sempre do Tutorando (`from`) para o Mentor (`to`), a
  lista de tutorandos de um mentor são os `from` dos pedidos de que ele é `to` - ver
  `fetchConnectedMentors`/`fetchConnectedTutees` em `src/lib/matching.ts`. O sítio onde o mentor
  revê o aluno que aceitou passou a ser o **Chat**, que tem uma conversa por cada ligação aceite
  (ver `connections` na entrada das secções da Home).
- **Pesquisa de mentores/tutorandos** - por disciplina, com filtros; sem leitura ao Firestore ao
  abrir o ecrã, só disparada por query de texto ou filtro ativo. Mostra "Pesquisas recentes"
  (guardadas em AsyncStorage) quando não há pesquisa ativa.
- **Matches / pedidos de conexão** - uma **lista** de candidatos (o mesmo cartão dos resultados da
  pesquisa, com as duas decisões dentro de cada linha: "Passar" e "Conectar"); "Conectar" envia um
  **pedido de conexão** ao Mentor (não é match automático por like mútuo). Só o Tutorando inicia; o
  Mentor nunca envia pedido a um Tutorando. Os pedidos recebidos **decidem-se no topo deste ecrã**,
  com Aceitar/Recusar: quem só ensina não tem lista de candidatos (não procura mentor, é
  encontrado), mas continua a ter aqui o que tem para decidir. Chegou a ser um cartão de ecrã
  inteiro que se vira, com uma bandeja de botões fixa em baixo - nenhum outro ecrã da app se parecia
  com aquilo, e o que esse cartão mostrava a mais (descrição e disponibilidade) vive no perfil de
  cada candidato, a um toque de distância.
- **Notificações in-app** - o sino da Home conta os pedidos de sessão e as conversas por ler, e
  cada separador com algo à espera tem a sua bolinha (Matches para pedidos de conexão, Chat para
  conversas por ler - ver `NavBar`). O ecrã dedicado (`notifications.tsx`) tem os pedidos de sessão
  com Aceitar/Recusar, **avisa** de cada pedido de conexão recebido (e abre o ecrã dos pedidos, onde
  a decisão se toma), um
  histórico "Recentes" derivado de pedidos já aceites e sessões de amanhã, e - no fim, porque é o
  menos urgente - até três **sugestões** do mesmo conjunto da descoberta
  (`fetchExcludedCandidateIds` + `fetchMentorCandidates`), com "Ver todos" para os Matches. É o
  único ecrã que faz a leitura do conjunto de candidatos por si (tecto de `CANDIDATE_POOL_LIMIT`
  perfis), e uma falha ali só faz desaparecer o bloco.
- **Chat em tempo real** - só desbloqueado depois de um pedido de conexão aceite; mensagens via
  Firestore `onSnapshot` (`conversations/{id}/messages`). Abre com as últimas 50 mensagens e um
  botão para carregar as anteriores.
- **Agenda / sessões** - calendário mensal + lista do dia; pedido de sessão
  (disciplina/data/hora/modalidade/mensagem) a partir do perfil do outro utilizador ou do chat.
  Ao contrário do pedido de conexão, o pedido de sessão pode partir de qualquer um dos dois lados
  de uma ligação já aceite - e **quem aceita fica como Mentor dessa sessão**, sendo a única parte
  que a pode terminar (ver [Decisões tomadas](#decisões-tomadas)).
- **Materiais** - um material é um **link http/https partilhado dentro de uma conversa** (não há
  coleção `materials` nem upload de ficheiros). O ecrã de Materiais agrega, em tempo real, os
  anexos das conversas do utilizador, filtráveis por enviados/recebidos. O link é validado ao ser
  escrito e outra vez ao ser aberto (`src/lib/url.ts`), porque vem de outro utilizador.
- **Avaliação por estrelas pós-sessão** - anónima, aparece automaticamente ao Tutorando quando
  uma sessão passada ainda não foi avaliada nem dispensada; 1 avaliação por sessão.
- **Bloquear utilizadores** - a partir do perfil de outra pessoa, com confirmação. Um bloqueio
  corta a ligação nos dois sentidos: os dois deixam de se encontrar na descoberta, de se poder
  ligar ou pedir sessões, e a conversa que tivessem fica inacessível para ambos (o histórico não
  é apagado). Gerem-se em **Definições**, um ecrã sem separador próprio que se alcança por uma
  linha discreta no fim do Perfil, e que também tem o idioma, os **avisos no telemóvel** (estado,
  ligar/desligar e, quando a permissão foi recusada, o atalho para as definições do sistema), um
  contacto de ajuda e o **apagar a conta** (ver [Apagar a conta](#apagar-a-conta)).
- **Recuperação de palavra-passe** - botão nos ecrãs de autenticação; o Firebase envia o email
  com o link. A reposição acontece na página web do Firebase e a pessoa volta à app para entrar
  com a palavra-passe nova (não há deep link de regresso). A confirmação mostrada é sempre a
  mesma, exista ou não conta, para não permitir descobrir que emails estão registados.

## Modelo de dados (Firestore)

| coleção | descrição |
|---|---|
| `users/{uid}` | perfil **visível a quem tem sessão iniciada** (nome, foto base64, role, participationMode, disciplinas, disponibilidade…). Nunca contém dados privados da conta nem o token dos avisos. |
| `users/{uid}/devices/{id}` | registo de **avisos push** deste dispositivo (`token`, `platform`, `updatedAt`); legível e escrevível **só pelo próprio** (ver "Avisos no telemóvel") |
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

`firestore.rules` é a fonte de verdade da autorização - **nenhuma regra de negócio de segurança
depende só da UI**. Pontos a destacar:

- `isVerified()` - a política transversal: sem o email institucional confirmado (`email_verified`
  no token) não se lê nem se escreve nada, com as duas exceções contadas descritas em
  [Confirmação de email](#confirmação-de-email). É esta a peça que o domínio do email não dá.
- `users`: `create` valida que o `role` gravado bate com o domínio do email do token autenticado
  (impede um cliente feito à mão criar-se com `role` arbitrário) e recusa qualquer campo privado
  da conta; `update` nunca deixa mudar o `role` e exige o email confirmado.
- `userAccounts`: só o próprio lê, e o `create` exige que o `email` gravado seja o do token.
  Foi esta a razão da separação: `users` é legível por toda a comunidade autenticada (a pesquisa
  e o matching precisam disso), portanto o email e a última entrada não podem viver lá.
- `connectionRequests`: só o Tutorando (`from`) cria; só o destinatário (`to`) aceita/recusa.
- `sessionRequests` / `conversations`: `create` exige um `connectionRequests` aceite entre as
  duas partes (verificado nos dois sentidos possíveis do ID, já que os dois documentos usam
  convenções de ID diferentes).
- `sessions`: `create` exige um `sessionRequests` aceite por trás (via `sessionRequestId`
  gravado na sessão) e que só o mentor que aceitou o pedido a possa criar. `update` só permite
  passar de `scheduled` para `completed`, e só pelo mentor - nenhum outro campo pode mudar.
- `ratings`: `create` confirma via `get()` que quem escreve é o `studentUid` da sessão, sem
  persistir essa relação no documento - garante o anonimato mesmo para quem lê a coleção depois.
- `users/{uid}/devices`: `read`/`delete` só pelo próprio e `create`/`update` com validação mínima
  (token não vazio, plataforma conhecida, `userId` igual ao do caminho). É a única razão de o token
  dos avisos não viver no documento do perfil: `users/{uid}` é legível por toda a comunidade
  autenticada, e com o token de outra pessoa qualquer conta podia enviar-lhe avisos.
- `delete` existe em **dois contextos, e só nesses**: o **próprio** (`users/{uid}`,
  `userAccounts/{uid}`, `users/{uid}/devices/{id}`, os bloqueios que fez, e as mensagens que
  escreveu) e **apagar a conta**, onde quem participa de um pedido, de uma sessão ou de uma conversa
  a leva consigo. É o que a diretriz 5.1.1(v) da Apple obriga a existir dentro da app, e está
  fechado por identidade em todos os casos: ninguém apaga o perfil, os dados privados, o bloqueio ou
  a mensagem de outra pessoa. As **avaliações** continuam sem `delete` - se um mentor as pudesse
  apagar, o anonimato não valia nada (ver "Apagar a conta").

Há testes destas invariantes em `tests/firestore-rules.test.mts`, que correm contra o emulador
com o mesmo `firestore.rules` que é publicado:

```bash
npm run test:rules        # arranca o emulador, corre os testes e desliga-o (precisa de Java)
```

### A chave de API do Firebase está no repositório, e é para estar

O GitHub sinalizou uma **Google API Key** em `google-services.json` (é de lá que o Android a lê,
via `android.googleServicesFile` no `app.json`). Não é um segredo, e a documentação da Google diz
isso por palavras: as chaves de API do Firebase são **públicas por desenho** - identificam o
projeto, não autorizam nada, e quem autoriza são as regras (acima) e o App Check. A chave viaja
dentro de cada APK, e a chave *browser* (`EXPO_PUBLIC_FIREBASE_API_KEY`) viaja dentro do bundle
JavaScript: no momento em que a app é compilada, já não há segredo nenhum para guardar.

Por isso **não se roda**: uma chave nova seria igualmente pública. E o custo de a desativar é real -
a chave antiga está dentro de cada app já instalada, e essas apps ficariam sem autenticação nem
leitura de dados até sair uma build nova (a Google avisa para não mexer em restrições de chaves que
apps em produção usam). O que este alerta pede, em vez de uma rotação, é confirmar as restrições:

- a chave **Android** (a de `google-services.json`) tem de ter, em *API restrictions*, **só APIs do
  Firebase** - e nada mais. Uma chave do Firebase com a Places API ou a Generative Language API na
  lista passa a ser usável por qualquer pessoa, e a quota é do projeto;
- a chave **iOS** (a do `GoogleService-Info.plist`, linha 6, a chave `API_KEY`) - foi o **segundo**
  alerta do GitHub e é o mesmo caso: viaja dentro de cada IPA;
- o mesmo para a chave *browser* (`EXPO_PUBLIC_FIREBASE_API_KEY`), que é a que fica no bundle.

**Isto foi verificado, e não ficou pela consola.** Dá para perguntar às próprias chaves: um pedido a
uma API que a app não usa (das que gastam dinheiro) tem de ser recusado **pela camada da chave**, e
não por a API estar desligada - é a diferença entre `API_KEY_SERVICE_BLOCKED` (restrição) e
`SERVICE_DISABLED` (API desligada no projeto), que a resposta traz em `error.details`:

```
Generative Language (Gemini)  ->  403  API_KEY_SERVICE_BLOCKED                   (as três chaves)
Places / Cloud Translation    ->  403  API_KEY_SERVICE_BLOCKED
Firestore (sem autenticação)  ->  403  "Missing or insufficient permissions."   <- a chave passou
```

A última linha prova a outra metade: a chave **atravessa** a camada de restrição até chegar ao
Firestore - e é lá que as regras a recusam, por não haver utilizador. Ou seja, a restrição que a
documentação do Firebase exige para tratar estas chaves como não-secretas **está feita**; e mudá-la
continua a ser em **Google Cloud > APIs e serviços > Credenciais**.

Enquanto isso for verdade, o alerta do GitHub é ruído, e é tratado como ruído:
`.github/secret_scanning.yml` fecha-o (e a push protection) para os **dois** ficheiros, com a razão
escrita lá dentro. A documentação do GitHub diz que estas exclusões **fecham** os alertas
correspondentes, com o estado *ignored by configuration* - e o aviso do `plist` chegou porque a
exclusão entrou no **mesmo commit** que o ficheiro: o alerta nasce no push, antes de a configuração
valer. Se algum deles continuar aberto, o que resta é dispensá-lo à mão (*Security > Secret
scanning > Dismiss*, motivo **Won't fix**, com a razão escrita).

**O que falta ali é o App Check.** As regras dizem *quem* pode ler e escrever; não dizem que o
pedido vem da app. Com a chave pública, quem tiver o `projectId` e a chave pode criar contas contra
o projeto e consumir quota (as regras continuam a impedir que leia ou escreva dados de outras
pessoas). Ligar o App Check é o que fecha isso - é o próximo trabalho de segurança a sério nesta
app, mais do que qualquer rotação de chave. Está escrito abaixo.

### App Check (o código está pronto, o serviço ainda não está ligado)

O App Check agarra uma atestação do dispositivo - **Play Integrity** no Android, **App Attest** (com
DeviceCheck por baixo) no iOS - a cada pedido ao Firestore e à Auth. Quem não a apresentar não é
atendido, mas só **quando a fiscalização estiver ligada no console**: até lá o que existe é o token
nas chamadas, e nada a verificá-lo.

**Duas metades, porque são dois SDKs.** A atestação nativa não existe no SDK JavaScript do Firebase:
quem a sabe produzir é o SDK nativo, e quem o expõe ao JavaScript é o
`@react-native-firebase/app-check`. Só que esta app fala com o Firestore e a Auth pelo **SDK
JavaScript** (ver `src/lib/firebase.ts`) - dois SDKs, com registos de apps diferentes, um não sabe
do outro. Por isso o `src/lib/app-check.ts` faz as duas coisas:

1. configura o atestador (Play Integrity / App Attest) no SDK **nativo**, no app do RNFB - é daqui
   que sai o token de App Check;
2. entrega esse token ao SDK **JavaScript**, no *nosso* `app`, através de um `CustomProvider` - é
   esta metade que faz o token ser usado, porque é o SDK JavaScript que o cola a cada leitura.

Faltando qualquer das metades não há erro nenhum: existe um token e ele não vai em pedido nenhum.
(O atestador do próprio RNFB não pode ser entregue ao SDK JavaScript: o `getToken()` dele lança -
quem responde é o módulo nativo, através do `getToken()` do RNFB.)

O módulo é carregado à mão, como o `expo-observe` (ver "O EAS Observe não pode ser uma porta de
sentido único"): numa build que não o tenha, não há atestação e todo o resto corre.

**Feito:** a app iOS está registada no Firebase (`1:1008777430223:ios:8bac5797d554fd0dd0e3ba`), o
`GoogleService-Info.plist` está no repositório (público por desenho, como o `google-services.json`),
os dois pacotes estão instalados e o `app.json` tem os plugins - com uma **ordem que não é
decorativa**:

```json
"plugins": [
  "@react-native-firebase/app-check",
  ["@react-native-firebase/app", { "ios": { "disableSPM": true } }]
]
```

O plugin do `app` escreve `FirebaseApp.configure()` no `AppDelegate`, e o do `app-check` tem de
registar o módulo **antes** disso - é o próprio código do plugin que o diz. Pela ordem inversa (a do
exemplo de instalação do RNFB), o `app-check` encontra o bloco já escrito, acrescenta o seu *depois*
-e fica com `configure()` duas vezes, a segunda depois do registo. Nesta ordem, o plugin do `app`
reconhece o `configure()` do `app-check` e não repete nada.

Do lado do iOS há ainda uma decisão de ferramentas: o RNFB resolve o Firebase por **Swift Package
Manager**, que pede frameworks dinâmicos, enquanto o Expo 57 traz o React Native **pré-compilado**,
que é estático. Ficou no caminho estático - `disableSPM: true` e, pelo `expo-build-properties`,
`useFrameworks: "static"` com os dois pods do RNFB em `forceStaticLinking` - que é o que a
documentação do RNFB indica para o núcleo pré-compilado.

**O iOS também precisa de uma linha no `app.json`, e ficou lá:** o direito de App Attest
(`com.apple.developer.devicecheck.appattest-environment: development`). É ele que autoriza o
dispositivo a falar com o serviço de atestação da Apple; sem a linha, o `appAttest` falha mesmo com
tudo o resto certo. Quem o põe no perfil de provisionamento é a build — mais uma razão para ser
nova. **O valor é `production`**, desde que a build de loja ficou a caminho. Ele segue **o perfil que assina
a build**, não a app: um perfil de desenvolvimento ou ad hoc quer `development`, e o de distribuição
(App Store / TestFlight) quer `production` - com o valor trocado, a atestação falha de um lado ou do
outro. Ficou `production` porque é a de loja que está a ser feita; uma build `preview` para testar a
atestação antes disso quer `development` outra vez.

**Um perfil de aprovisionamento não ganha capacidades novas — tem de nascer depois do direito.** O
build iOS de desenvolvimento falhou no arquivo do Xcode, com isto:

```
Provisioning Profile "*[expo] com.diyogo.inovapp AdHoc 1789493976588" does not support the App Attest capability
Entitlements file defines the value "com.apple.developer.devicecheck.appattest-environment"
  which is not registered for profile
```

Não é um erro de configuração do `app.json` — o direito está certo e o `prebuild` gerou o ficheiro de
direitos com ele (é isso que a segunda linha diz). Duas coisas do `eas-cli` explicam o resto:

1. **O EAS não compara direitos com o perfil.** O `validateProvisioningProfile` confirma só o
   certificado de distribuição, o bundle identifier, a validade e o estado do perfil na Apple
   (`eas-cli/build/credentials/ios/validators/validateProvisioningProfile.js`) - nunca os direitos.
   Um perfil sem o App Attest passa essa validação inteira e só rebenta no `xcodebuild`; nada a
   jusante o apanha antes.
2. **O perfil antigo nunca se atualiza sozinho.** Na distribuição interna o EAS pede à Apple para
   *criar ou reutilizar* o perfil ad hoc e, se o que existe já serve (os dispositivos registados são
   os mesmos), escreve `Used existing profile` - e um perfil criado antes do direito existir não
   passa a ter o direito depois.

A ordem que resolve é **capacidade no App ID primeiro, perfil novo depois**:

1. **Ligar a capacidade no App ID** (developer.apple.com > Certificates, Identifiers & Profiles >
   Identifiers > `com.diyogo.inovapp` > *App Attest* > Save). O EAS também a sincroniza sozinho a
   partir dos direitos (está em `capabilityList.js`, como `CapabilityType.APP_ATTEST`, e aparece no
   log como `Synced capabilities: Enabled: App Attest`), mas a consola é verificável e são 30
   segundos.
2. **Descartar o perfil antigo** (Apple > Profiles > apagar `*[expo] com.diyogo.inovapp AdHoc …`; ou
   `npx eas-cli credentials -p ios` > perfil de build > *Provisioning Profile* > Remove). É isto que
   obriga o EAS a criar um novo em vez de reutilizar o que não serve.
3. **Build outra vez**, e confirmar a linha `Created new profile: …`.

O mesmo vai ser preciso no perfil de **distribuição** (App Store) quando o App Attest entrar numa
build de produção: um perfil criado antes do direito falha da mesma maneira. Alternativa que dispensa
perfis: trocar o atestador do iOS por **DeviceCheck** (tirar o direito do `app.json`, pôr
`provider: 'deviceCheck'` e carregar uma chave DeviceCheck no Firebase, como a de APNs) - atestação
mais fraca, mas sem direitos nem perfis pelo caminho.

**O registo no console:** a conta de serviço não conseguia ativar a API do App Check (só o
utilizador o pode fazer — feito na consola), mas com a API ativa regista sozinha o que não depende
de impressões digitais: o **App Attest do iOS ficou registado por REST** (TTL de 7 dias). O **Play
Integrity do Android** pede a impressão digital SHA-256 da **chave de assinatura da Play** (com a
Play App Signing, é ela quem assina o que as pessoas instalam — não a keystore do EAS): copia-se em
*Play Console > Teste e lançamento > Configuração > Chave de assinatura de app*.

**A impressão digital não vive onde se poderia esperar.** Confirmei-o na API: o
`PlayIntegrityConfig` **não tem campo para ela** (só `tokenTtl`, `appIntegrity`, `deviceIntegrity`,
`accountDetails`) - o formulário da consola escreve-a nas **impressões digitais da app Android** nas
definições do projeto, e ali está vazia:

```
GET firebase.googleapis.com/v1beta1/projects/inovapp-68021/androidApps/1:...:android:768f.../sha
  -> 200  {}          # nenhuma impressão registada (google-services.json também traz "nenhum")
GET .../androidApps/1:...:android:768f.../playIntegrityConfig
  -> 200  { tokenTtl: "3600s", deviceIntegrity: { minDeviceRecognitionLevel: "NO_INTEGRITY" } }
```

Esse `3600s` é o valor **por omissão** (o mesmo que a API devolve para serviços que nunca foram
configurados - no iOS é o `604800s` que eu escrevi que se distingue do resto). Ou seja: o Android
não está registado até alguém colar a impressão digital.

**E há um passo antes disso, que a documentação põe em primeiro lugar e ainda não estava feito:**
ligar o projeto à Play Console. Em *Play Console > Lançamento > Integridade da app*, na secção da
API Play Integrity, **Link Cloud project** > `inovapp-68021` (exige ser *Owner* do projeto - és).
Sem a ligação, o Play Integrity **não emite tokens** e o Android fica sem atestação nenhuma, por
muito correta que a impressão digital esteja.

**A vida útil do token:** a documentação dá o intervalo de **30 minutos a 7 dias** e diz que **1
hora (o valor por omissão) é razoável para a maioria das apps**. Fica a de 1 hora no Android - a
escolha de 7 dias que tinha sugerido era para o iOS, e não é preciso trazê-la para aqui: quanto mais
longa, maior a janela em que um token apanhado serve a quem o apanhou.

**Uma consequência a saber, escrita na mesma página:** o App Check exige por omissão a etiqueta
`PLAY_RECOGNIZED`, e *apps que não estejam publicadas na Play não a podem receber*. Um APK de
desenvolvimento instalado à mão nunca a recebe - é exactamente por isso que o atestador em
desenvolvimento é o de depuração (abaixo), e não o Play Integrity.

**O que falta, e não é código:**

| passo | onde | porquê |
|---|---|---|
| 1. ~~ativar a API do App Check~~ **feito** | — | a conta de serviço não podia ativar serviços; ficou ativa na consola |
| 2. ~~ligar o projeto à Play Console~~ **feito** (`1008777430223`, *Application integrity* On com `PLAY_RECOGNIZED` nas etiquetas) | Play Console | sem a ligação o Play Integrity **não emite tokens** - era o passo que faltava e não estava em lado nenhum |
| 3. registar o atestador por plataforma | Consola Firebase > App Check > Apps | **App Attest (iOS): feito** por REST, TTL 7 dias. **Play Integrity (Android): falta a impressão digital SHA-256 da chave de assinatura da Play** (Play Console > Teste e lançamento > Configuração) - e a chave só existe depois do **primeiro AAB subido** à Play. Registar por REST é possível (`projects.androidApps` > `sha.create`), mas o formulário da consola faz as duas coisas de uma vez: acrescenta a impressão digital **e** marca a app como registada no atestador |
| 4. iOS: o direito de App Attest **já está no `app.json`**, mas o **perfil tem de ser regenerado** (capacidade no App ID + apagar o perfil antigo - ver acima); alternativa é uma **chave de DeviceCheck** no Firebase (como a de APNs) | — | sem uma das duas o iOS fica sem atestação: o código pede `appAttestWithDeviceCheckFallback`, e sem direito nem chave falham os dois |
| 5. build nova, de desenvolvimento e de produção | `npx eas-cli build` | **módulo nativo novo = build nova** (a lição do EAS Observe) |
| 6. confirmar que os pedidos chegam atestados | App Check > Firestore | antes de fechar a porta, ver quem lá entra: o painel mostra a percentagem de pedidos verificados |
| 7. **só então** ligar a fiscalização (Firestore, Auth) | App Check > APIs | com ela ligada antes de os dois telemóveis mandarem atestação, a app fica sem ler nem escrever - e o sintoma é um `permission-denied`, igual ao de uma regra mal escrita |

Três decisões que ficaram tomadas no código, para não se perderem no meio dos passos:

- **Em desenvolvimento o atestador é o de depuração** (Play Integrity e App Attest não emitem tokens
  para uma build de desenvolvimento ou um emulador). O segredo de depuração é gerado pelo próprio
  atestador e escrito no log do dispositivo - regista-se no console em *App Check > Apps > gerir
  tokens de depuração*. **Não vem de `EXPO_PUBLIC_*`**: essas variáveis ficam escritas dentro do
  bundle de **todas** as builds, incluindo as de produção, e um token de depuração lá dentro é uma
  porta aberta no App Check que se está a montar (há um teste que fixa exatamente isso).
- **A renovação automática do token está ligada** (`isTokenAutoRefreshEnabled`), porque o primeiro
  ecrã da app já lê o Firestore: sem token pronto, essa leitura saía sem atestação.
- **A validade do token é assumida curta** (5 minutos). O resultado do RNFB traz o token mas não a
  validade, e é ela que diz ao SDK JavaScript quando pedir outro: assumi-la por cima arriscava
  servir um token já caducado (um `permission-denied` sem explicação), e assumi-la por baixo só
  custa uma ida à cache do lado nativo, que é quem renova o token a sério.

## Confirmação de email

O papel de cada pessoa (Tutorando/Tutor) deriva do **domínio** do email institucional, e isso não
prova que o email seja de quem o escreveu: qualquer pessoa podia criar conta com
`professor.x@iseclisboa.pt` e ficar com um perfil em nome dela. O que fecha isso é o link que o
Firebase manda para a caixa de correio - que só quem a lê pode abrir.

Está em **três sítios**, e os três são precisos:

| | onde | o que faz |
|---|---|---|
| Ecrã | `src/app/verify-email.tsx` | explica o que falta, reenvia o email e pergunta ao Firebase se já foi confirmado |
| Decisão | `src/lib/auth-gate.ts` | quem não confirmou fica nesse ecrã, **antes** do perfil e antes de qualquer escrita |
| Garantia | `firestore.rules` (`isVerified()`) | o servidor recusa quem não confirmou - um cliente feito à mão não passa por aqui |

Só a terceira é segurança; as duas primeiras são o que faz a coisa ser usável. E é o mesmo
princípio escrito em [Firestore rules e segurança](#firestore-rules-e-segurança): nenhuma regra de
negócio depende só do que o ecrã mostra.

**Duas exceções contadas**, ambas desenhadas para a app conseguir arrancar:

- o **próprio documento** (`users/{uid}` e `userAccounts/{uid}`) continua legível por quem não
  confirmou - é essa leitura que diz à app que o perfil ainda não está feito, e sem ela ficava
  presa num carregamento infinito, sem nunca chegar ao ecrã que explica o que falta;
- o `create` de `users/{uid}` no registo (que acontece antes de haver confirmação nenhuma) está
  aberto **só à forma exata que o registo escreve** (`role`, `profileCompleted: false`, `createdAt`).
  Sem essa restrição, quem se registasse com o email de outra pessoa escrevia logo um perfil
  completo com o nome dela - o caso que isto existe para travar.

O link abre no **browser**, e o token que está no telemóvel continua a dizer
`email_verified: false` durante até uma hora: são as regras que leem o token, não o objeto local.
Por isso o ecrã força um token novo (`getIdToken(true)`) quando a confirmação se dá, e verifica
sozinho de cada vez que a app volta a ficar à frente - sair do browser do email e voltar é
exatamente esse momento.

### O envio dos emails

O email não é escrito pela app: quem o escreve é o Firebase, a partir de um **modelo do projeto**.
A app só escolhe duas coisas - o idioma (`auth.languageCode`, com o idioma da app: `pt-PT` ou `en`,
ver `src/auth/actions.ts`) e o nome que aparece como `%APP_NAME%` (o campo *Public-facing name* do
projeto, hoje `INOVAPP`).

O que está medido no projeto (`inovapp-68021`), para não se adivinhar:

| | estado |
|---|---|
| Serviço de envio | `DEFAULT` (o do Firebase) - remetente `noreply@inovapp-68021.firebaseapp.com`, sem SMTP próprio |
| Idioma por omissão | `en` - verificado no próprio link que o Firebase gera (`lang=en`); sem a linha da app, um aluno do ISEC recebia um email em inglês de uma app que fala português |
| Política de palavras-passe | `ENFORCE`: 8+, maiúscula, minúscula, número e símbolo - `auth/password-does-not-meet-requirements` é o erro que daí vem, e está traduzido |
| Privacidade do email | `enableImprovedEmailPrivacy`: os erros deixam de distinguir "não existe" de "palavra-passe errada", e o ecrã de reposição não serve para descobrir quem tem conta |
| Limites diários (plano Spark) | 1000 emails de confirmação/dia e **150 de reposição/dia** - o segundo é o que aperta numa escola inteira |

**Três coisas que continuam por configurar**, por ordem de quanto se nota:

- **Entregabilidade.** Correio vindo de `firebaseapp.com` cai frequentemente em spam nas caixas
  institucionais. É a causa provável de um "não recebi o email" e resolve-se com SMTP próprio e um
  domínio verificado - configuração de infraestrutura, não código.
- **O link não volta à app.** Sem `ActionCodeSettings` (`continueUrl`/`handleCodeInApp`), quem abre
  o link aterra na página do Firebase, em inglês, e tem de voltar ao telemóvel à mão. O ecrã já
  cobre isso (verifica sozinho quando a app volta à frente), mas o caminho tem uma página morta no
  meio; ligá-lo à app pede domínios associados (iOS) e App Links com as impressões digitais do
  certificado (Android) - não é uma linha, é uma volta.
- **O idioma é pedido, não imposto.** Há relatos de o `languageCode` do cliente não vencer sempre o
  idioma escolhido no modelo (firebase-js-sdk#5846). Quem decide de facto é o idioma do modelo em
  *Authentication → Templates*, e é lá - com um email real, nos dois idiomas - que se confirma.

### Contas anteriores à confirmação

Quem já tinha conta e nunca confirmou deixa de poder ler ou escrever quando estas regras forem
publicadas. O caminho normal é abrir o link (o ecrã reenvia-o) - e o email de reposição de
palavra-passe continua a funcionar, o que também resolve o caso de alguém ter criado conta com o
email de outra pessoa: o dono verdadeiro pede uma palavra-passe nova, entra e confirma.

Para os casos em que o email já não é acessível, há o script de administrador:

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/caminho/para/chave.json
npm run verify:legacy-accounts                                   # só mostra quem está por confirmar
npm run verify:legacy-accounts -- --apply --email=alguem@iseclisboa.pt
npm run verify:legacy-accounts -- --apply                        # todas de uma vez
```

**Ordem de publicação:** primeiro a app (com o ecrã da confirmação a correr), só depois o
`npx firebase-tools deploy --only firestore:rules`. Ao contrário, quem estivesse com a app antiga
perdia acesso sem perceber porquê. E vale a pena confirmar a própria conta antes disso - a conta de
quem publica é a primeira que corre o risco de ficar de fora.

## Apagar a conta

Em **Definições → Apagar conta**. A Apple exige-o (diretriz 5.1.1(v): quem pode criar conta tem de
poder apagá-la dentro da app) e o Play pede o mesmo, e a alternativa era um pedido por email que
ninguém cumpre sozinho às 3 da manhã. São três peças:

| | onde | o que faz |
|---|---|---|
| Ecrã | `src/app/settings.tsx` | o aviso, a confirmação e a pergunta da palavra-passe (dois modais, dois passos) |
| Dados | `src/lib/account.ts` | o plano: onde a conta aparece, por que ordem se apaga, em que lotes |
| Conta | `src/auth/actions.ts` | reautentica, apaga os dados e só no fim apaga a conta do Auth |

**A ordem é a parte que importa**, e não é indiferente: apagada primeiro a conta do Firebase Auth, o
token desaparece e o cliente perde o direito de apagar o resto - o que sobrasse ficava órfão e sem
ninguém que o pudesse remover (as regras decidem pelo token). Ao contrário, apagados os dados e
falhando a conta, repetir a operação acaba o trabalho: todos os passos são idempotentes.

**A palavra-passe é pedida sempre, e verificada antes de se apagar seja o que for.** O Firebase só
se queixa de uma sessão antiga (`auth/requires-recent-login`) no momento de apagar a conta - ou
seja, depois de os dados já terem ido. Reautenticar primeiro faz com que uma palavra-passe errada
não deixe nada a meio, e há um teste que o fixa (`tests/data/account.test.mts`).

O que **sai** com a conta: o perfil, os dados privados da conta, os registos dos avisos, os
bloqueios que ela fez, os pedidos de conexão e de sessão, as sessões, as conversas e as mensagens que
escreveu. O que **fica**: o bloqueio que outra pessoa lhe fez (é dela, e uma referência a um UID não
é dado pessoal), as mensagens que a outra pessoa escreveu (não são dela, e ficam inalcançáveis assim
que a conversa desaparece - as regras exigem a conversa para se ler lá dentro) e as **avaliações**,
que continuam sem `delete` de propósito: abertas, davam a um mentor a forma de deitar fora as notas
más que recebeu. Sem a sessão nenhuma para as mostrar, ficam inertes.

O `delete` continua fechado por identidade em todo o lado - ninguém apaga o perfil, os dados, o
bloqueio ou a mensagem de outra pessoa (ver [Firestore rules e segurança](#firestore-rules-e-segurança)).

Uma consequência assumida: apagar a conta leva a conversa **para os dois lados**. Não há forma de
partir um `delete` ao meio por regra - o documento da conversa tem os dois participantes - e a
alternativa (deixá-lo) era a lista de quem fica a mostrar uma conversa com alguém que já não existe.

## Migração dos perfis antigos

Antes da separação `users`/`userAccounts`, o perfil guardava `email`, `lastLoginAt` e
`rememberSession` - legíveis por qualquer utilizador autenticado. Duas coisas tratam disto:

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

Usa o `firebase-admin`, que passa por cima das regras - por isso é um script manual e não faz
parte da app.

## Decisões tomadas

- **Entrar tem de ser um `fade` com os dois ecrãs à vista - e isso dependia de não desmontar a
  navegação.** Entre o `signIn` e a resposta sobre o perfil há uma espera, e ela era `loading` - o
  mesmo estágio do arranque. Só que `loading` põe o `isReady` a falso, e `isReady` a falso quer dizer
  que o `<Stack>` **não existe**: o ecrã de entrada era apagado, ficava o fundo à mostra até a leitura
  responder, e a Home montava de fresco - um corte seco, e a opção `animation: 'fade'` que já lá
  estava nunca chegava a correr, porque não houve navegação nenhuma para animar. Passou a haver um
  estágio próprio, **`signing-in`**: o `Stack` fica de pé, quem está lá dentro é o formulário de
  entrada (com o botão em "A entrar…"), e é ele que se dissolve quando a Home chega. A espera do
  arranque continua a ser `loading`, atrás do splash - a diferença entre as duas está no
  `bootstrapped` da loja de autenticação, escrito pelo `useAuthSync` quando a primeira resposta
  chega. E o clarão que se seguiu a isto: com o `fade` a correr, os dois ecrãs estão translúcidos ao
  mesmo tempo, e por trás deles não havia nada opaco - via-se o fundo da janela, que é branco. O
  `GestureHandlerRootView`, o `View` que envolve a navegação e o `contentStyle` do `Stack` passaram
  a levar a cor de fundo dos ecrãs (`theme.background`), e o que se vê durante a transição é a
  mesma superfície dos ecrãs que a atravessam. A segunda metade do mesmo problema era o teclado:
  fechava-se quando o ecrã mudava, e a janela a redimensionar por baixo de uma transição a meio é
  um tremor que se soma ao clarão. Passou a fechar-se no toque em "Entrar" (ver o `handleSubmit`
  em src/app/login.tsx), com a espera do "A entrar…" a dar-lhe tempo para acabar antes de a Home
  chegar.
- **O cartão dos primeiros passos espera pela resposta.** A Home perguntava "tens ligações?" e a
  resposta começava em `false` - indistinguível de "ainda não sei": quem já tinha ligações via o
  guia de boas-vindas (um cartão grande, no meio do ecrã) aparecer e desaparecer no instante a
  seguir à entrada. `hasAnyConnection` passou a `boolean | null`, e o guia só aparece quando a
  resposta chegou e é mesmo "nenhuma ligação" - a mesma distinção que já se fazia com
  `connectionsError` entre "não tenho" e "não sei".
- **A fotografia prepara-se na escolha, não na gravação.** O seletor do sistema devolve a fotografia
  original (12 megapixels numa câmara de telemóvel), e havia trabalho de imagem a acontecer toda do
  lado errado do toque: a pré-visualização desenhava o original num quadrado de ~340 px (caro, e
  exatamente no instante em que se quer ver a resposta ao toque) e o redimensionamento com o base64
  ficavam para o "Guardar", que era quem demorava. Passou para o momento da escolha
  (`pickPreparedProfilePhoto` em src/lib/storage.ts): a vista aparece no mesmo instante e gravar é só
  escrever.
- **Escolher fotografia é um toque, uma ação.** O toque no avatar abria a fotografia **em grande**,
  e era o botão "Alterar" dentro dessa vista que ia ao seletor. Custava um toque a mais - trocar de
  fotografia é o que se quer fazer quase sempre - e, pior, custava tempo: o seletor da galeria é uma
  apresentação nativa por cima de tudo, e não pode arrancar enquanto um modal nosso estiver a
  desaparecer (o iOS larga a apresentação em silêncio, e o botão parece morto). Andaram aqui uma
  espera fixa de 350 ms e depois o `onDismiss` do modal a tentar acertar no instante certo - tudo
  isso era o preço de ter um modal pelo caminho. A vista em grande saiu, o toque passou a ser o
  seletor, e com ela saíram o modal, o temporizador, o `onDismiss` e duas chaves de tradução
  (`common.viewPhoto` e `common.change`).
- **A espera pela fotografia anuncia-se, mas só quando é longa.** Tirar o modal tornou o toque
  imediato, mas não tornou a galeria mais rápida: abri-la é do sistema, e a primeira vez em cada
  arranque obriga o iOS a levantar a extensão das fotografias - segundos em que a app ficava parada,
  sem sinal nenhum, e que se lêem como um botão avariado. Agora o avatar mostra que a fotografia
  está a caminho (indicador no lugar do conteúdo e a legenda "A carregar a fotografia..."), e o
  `onPress` do `PhotoPicker` passou a poder devolver promessa: é o ecrã que diz quando acabou,
  porque é ele que abre o seletor **e** prepara a imagem escolhida - a espera visível cobre as duas
  metades, em vez de terminar quando a pessoa escolhe e deixar a preparação escondida. Duas
  condições acompanham isto: só se mostra ao fim de `BUSY_SHOW_DELAY_MS` (300 ms - um indicador a
  piscar não informa ninguém e chama a atenção para uma espera que não existiu), e o travão do
  segundo toque é do **pedido** (`requestingRef`) e não do indicador, senão os primeiros 300 ms
  ficavam desprotegidos e um toque repetido abria duas galerias. Uma leitura que falhe é relatada
  (`reportError(…, 'fotografia')`) e o avatar volta ao que estava.
- **`require` com o nome escrito no ficheiro, ou o bundle de produção não passa** - o `observe.ts` e o
  `app-check.ts` carregam módulos nativos à mão (dentro de um `try`) para que a falta deles não deite a
  app abaixo. No `observe.ts` o `require` tem o nome literal; no `app-check.ts` chegou a ser uma função
  que recebia o nome - e o Metro **não resolve** isso: recolhe as dependências a ler o código, e um
  `require(variável)` não lhe diz o que empacotar. Em desenvolvimento limita-se a avisar e tudo passa
  (app, testes, typecheck); no bundle de produção recusa o ficheiro inteiro, com
  `Invalid call at line 78: require(name)`. O erro só apareceu na fase `EAGER_BUNDLE` da primeira AAB
  de produção, porque o Metro de desenvolvimento aceita o que o de produção recusa. Ficaram os dois
  `require` literais e um teste que faz a pergunta que faltava - `tests/lib/bundle-requires.test.mts`
  varre o `src` à procura de `require` que o Metro não possa resolver sozinho.
- **Um só cabeçalho para os cinco separadores** (`ScreenHero`) - o bloco em gradiente que abre a
  Home, o Matches, o Chat, o Pesquisar e o Perfil. Antes havia cinco cabeçalhos diferentes: a Home
  com identidade e sino, o Chat e o Pesquisar com o título e o campo de pesquisa, o Matches com um
  título só, o Perfil com o título e a roda dentada do lado oposto. O bloco rola com a lista (é o
  primeiro elemento dela) - um cabeçalho preso ao topo é o que fica a comer o ecrã enquanto o
  conteúdo anda. Cada separador põe o tom do bloco por trás da lista (`style` com `heroTop`) e o claro
  por cima (`contentContainerStyle` com `background`): é o que faz a faixa revelada ao puxar para
  baixo ter a cor do bloco em vez de branco.
- **Cada separador leva no bloco só o que é dele** - a Home leva a **identidade** (saudação, nome,
  papel) e o sino; o Perfil leva **a mesma identidade** (nome, curso, e o botão de editar por baixo
  das linhas) e a roda dentada; o **Matches, o Chat e o Pesquisar levam só o título**. Chegaram a
  levar também a identidade (e o sino) de quem já está a ver a app, e não ficou: o mesmo nome
  repetido em três separadores não diz nada de novo, e um bloco de 150 px só para dizer "Chat" é
  altura que sai da lista. O sino leva ponto de notificações **só na Home** - o número vem de
  subscrições (pedidos de sessão, conversas por ler) que só a Home tem, e repeti-las em quatro
  ecrãs era pagar leituras a mais por um ponto.
- **A identidade do Perfil é a da Home** - e não uma parecida. O Perfil chegou a trazer o seu
  próprio bloco de identidade (`ProfileHeader`, apagado) com a fotografia de 96, o nome de 20 e o
  curso em cinzento, ao lado dos 80, 22 e quase-preto da Home: duas cópias da mesma peça, que
  divergiram por si (foram desenhadas em voltas diferentes). O que sobrou foi **a única coisa que
  era mesmo diferente** - o que fica por baixo das linhas, que no Perfil é o botão de editar
  (`identityExtra`, ver `Profile/EditButton`) -, e o resto é o mesmo código e os mesmos números
  (`HERO_AVATAR_SIZE`, 80). O **título "Perfil" também saiu** do bloco: o nome do ecrã repetido por
  baixo do nome de quem lá está não diz nada de novo, e o separador da barra de baixo já se chama
  Perfil. A segunda linha distingue os dois: na Home é o **papel** (o que se pode fazer), no Perfil
  é o **curso com o ano** (o que se estuda) - e é por isso que lá cabe em duas linhas
  (`subtitleLines`) e na Home numa só.
- **Um só cabeçalho para os ecrãs empilhados** (`StackHeader`, com o `BackButton` dentro) - os seis
  ecrãs que abrem por cima dos separadores (Notificações, Sessões, Materiais, Definições, pedidos
  de conexão, pedido de sessão) tinham a mesma linha copiada com uma diferença aqui e outra ali: o
  `gap` era 12 num e 16 no outro, o título tinha `flex: 1` em dois e não nos restantes, e o botão
  de voltar aparecia em **três** tamanhos - um chevron nu de 22 px, um círculo de 36 com contorno
  (Definições) e um círculo de 36 sobre a fotografia (perfil de outra pessoa). Nada disso era
  intenção; era terem sido escritos em alturas diferentes. Ficou um só, com o botão num tamanho só
  (`BackButton`, 36 px - e `variant="surface"` para quando assenta sobre uma fotografia), e o
  teste mede-o, porque um botão estreito continua a voltar para trás. Uma mudança que veio atrás:
  o título do Definições deixou de ser exceção (`textTransform: 'none'`) e passa a maiúsculas como
  todos os outros. **Não é o `ScreenHero`**: esse vive *dentro* da lista, rola com ela e leva a
  identidade; este fica preso ao topo e é só a seta e o nome do ecrã.
- **O que rebenta a desenhar tem um ecrã** (`ErrorBoundary` + `ErrorScreen`) - sem isto, uma
  exceção num render, em produção, **fecha a app**: a pessoa fica sem o ecrã e sem aviso nenhum.
  Há dois limites em `src/app/_layout.tsx`: um na **raiz** (para o que falha no próprio layout) e
  um por **ecrã** (`unstable_settings.screenErrorBoundary`), que mantém a navegação montada - um
  erro dentro do Definições desenha o aviso no lugar do ecrã e deixa o gesto de voltar funcionar,
  em vez de fechar tudo. A mensagem técnica do erro aparece só em desenvolvimento; em produção não
  serve a quem usa a app e pode conter dados internos. **O que ainda não existe é o serviço de
  erros em produção** - há um só sítio por onde passam (`src/lib/error-reporting.ts`), hoje a
  escrever na consola em desenvolvimento e a não fazer nada em produção, à espera da decisão (ver
  "Limitações conhecidas").
- **A app não faz chamadas** - a linha de sessão da Agenda tinha um botão "Entrar" que abria um
  aviso a dizer que a funcionalidade não existia: uma promessa que se desmentia a si mesma. O
  botão saiu (com ele, as chaves `common.callUnavailable*` e `sessions.join`). A modalidade
  **"Online" continua a existir** - é como a sessão é combinada - e o sítio onde se combina é o
  chat, que é onde a conversa já está.

- **Base cinzenta, um acento só como sinal** - o fundo dos ecrãs é um cinzento muito claro
  (`background`, #F4F5F7) e as superfícies são brancas. Chegou a ser ao contrário (fundo azulado
  com cartões brancos) e a cor do fundo pintava o ecrã todo, tirando força à cor onde ela significa
  alguma coisa: a **ação principal** (botão primário), o **estado escolhido** (chip selecionado,
  dia do calendário, separador ativo da barra de baixo), **números que contam**, os **títulos de
  secção** e a **caixa dos ícones**. Estes dois últimos são a parte que foi espalhada numa volta
  seguinte, a pedido de quem desenha o produto: os títulos de secção são **nomes** (não corpo de
  texto) e as caixas de ícone são os sítios onde se toca - a cor é o que diz "isto é um sítio" antes
  de o dedo chegar lá. O que continua sem acento nenhum: o fundo dos ecrãs, os cartões e o corpo do
  texto. O bloco que abre os separadores é o
  **único fundo com cor** que existe (`heroTop`/`heroBottom`, um quase-branco com um resto de
  ameixa a descer para o tom dos chips). Os cartões de pedido de conexão/sessão eram coloridos e
  são agora **brancos como todos os outros** - eram os únicos cartões com cor, e num ecrã feito
  sobretudo deles (as Notificações) dava a impressão de que aquele ecrã tinha outro fundo. Quem
  marca um pedido como "algo a decidir" é a pastilha de estado e o botão de aceitar, não a cor do
  cartão.
- **O acento é uma ameixa (roxo), e o azul da marca foi eliminado** - a app nasceu com o azul do
  `colors.txt` dos mockups (`#0085CA`) e a troca foi decidida por quem desenha o produto. A razão
  técnica para ter parado no **roxo**, e não noutra cor: as cores de **estado** já ocupam o verde
  (sucesso), o vermelho (erro) e o âmbar (aviso), e o acento tem de ser reconhecível ao lado delas
  - um laranja confundia-se com o aviso, um vinho com o erro, um verde com o sucesso. O roxo é a
  única família que sobra. O acento (`primary`) passa 6,9:1 de contraste com o branco (chega para
  texto branco por cima) e a sua tinta (`primaryDark`, 11:1) faz os dois papéis que pareciam
  opostos: fundo para texto branco e texto sobre branco.
- **Os botões são pretos na decisão, com o acento na promoção** - "Aceitar"/"Recusar" de um pedido
  levam o **tom neutro** do `Button` (`tone="neutral"`: contorno e cheio a quase-preto), porque as
  duas decisões são simétricas e nenhuma delas é "a ação da app"; os botões que a app promove
  (entrar, concluir, marcar sessão) levam o acento. Os quadrados dos ícones **não** são pretos:
  chegaram a ser (preto cheio com o ícone a branco) e não ficou - o que diz que uma coisa se toca
  não é uma mancha preta no meio de um cartão claro.
- **Um só tamanho de ícone na interface** (`IconSize.ui`, 22) - os ícones eram desenhados a 14, 16,
  18, 20, 22 e 24 conforme quem os escreveu, e via-se nas páginas com mais do que um: o sino de 22
  ao lado de um chevron de 16, o lápis de 14 ao lado da roda dentada de 20. Duas exceções: o ícone
  grande sozinho dentro de um círculo de estado (`IconSize.state`, 28 - é a ilustração daquele
  estado) e os sinais **dentro** de um controlo pequeno (o visto da caixa de seleção, de 18 px e
  com um visto de 14: a 22 não cabia, e isso é um controlo partido, não um estilo).
- **Ícones de contorno** - todos os ícones da app são lineares (`-outline` do Ionicons, que é o que
  há instalado: o conjunto de ícones é uma decisão de dependência e não foi trocado). O sinal vive
  na **caixa**: um quadrado de ameixa suave (`primarySoft`) com o ícone na cor do acento
  (`primary`, 4,9:1 sobre a caixa - acima dos 3:1 que um símbolo precisa). É o mesmo em todo o
  lado: atalhos, linhas "Novidades", os materiais, o histórico das notificações e o sino do
  cabeçalho. Três exceções, cada uma com a sua razão: ícones sobre um **cheio colorido** (botão
  primário, pastilha sobre fotografia, badge da câmara) vão a branco, senão desapareciam; os de
  **estado** mantêm a cor que é o estado (estrelas da avaliação, visto verde, ponto vermelho de
  aviso - e as duas entradas do histórico que são "aconteceu", a conexão e a sessão aceites); e os
  que vivem **dentro de uma ação colorida** seguem a cor dessa ação.
- **A fotografia de perfil tem contorno** (`photoBorder`, um preto quase transparente) nas duas
  que são grandes - a do cabeçalho da Home e a do Perfil. Sobre o tom claro do bloco e sobre o
  cinzento do ecrã, uma cara sem contorno não tinha onde acabar. As fotografias pequenas das
  listas **não** o levam: a 32 px um aro ocupa mais do que a cara que emoldura.
- **Um só tamanho de quadrado para os ícones** (`IconBoxSize`, 40, com o ícone de 22 lá dentro) - os
  cartões com ícone (`IconTextCard`/`ExtraCard`) e as linhas "Novidades" da Home (`AttentionCard`)
  andaram a 34 e a 40 px no mesmo ecrã, a duas secções de distância, e o ícone dos pedidos de
  conexão lia-se como um ícone mal desenhado. O sino do cabeçalho assenta no mesmo quadrado - de
  ameixa suave, como os outros, e não mais uma bola branca só dele. O ponto das notificações por ler
  é da **cor do cabeçalho** (`heroBottom`) e não vermelho: é uma escolha de quem desenha o ecrã, e
  vale a pena saber o que custa - um ponto claro sobre um quadrado claro quase não se vê (1,19:1),
  por isso ele informa muito menos do que informava a vermelho. O quadrado, esse, ganhou com a
  troca: sobre o cabeçalho, a ameixa suave separa-se mais (1,19:1) do que o cinzento que lá estava
  (1,05:1).
- **Materiais por link, não por upload de ficheiro** - o projeto não usa Firebase Storage
  (exige plano Blaze/pago); um material é um link externo (Google Drive, YouTube…) partilhado
  numa conversa. Pela mesma razão, fotos de perfil são guardadas em base64 diretamente no
  Firestore, redimensionadas no dispositivo para 400px (`src/lib/storage.ts`).
- **Só links http/https** - `Linking.openURL` abre o que lhe derem, e o URL vem de outro
  utilizador; esquemas arbitrários (`intent://`, `file://`) seriam um caminho para lançar outra
  app. A validação está na escrita e na abertura.
- **Rating não está ligado aos perfis** - a avaliação por estrelas fica isolada em
  `ratings/{sessionId}` e não alimenta uma média visível no perfil do mentor. Ligar isto exigiria
  abrir uma exceção na regra de `users/{userId}` para deixar outra pessoa (o aluno) escrever no
  perfil do mentor - decisão de segurança deixada de fora, propositadamente.
- **Um pedido de conexão decide-se num sítio só** - aceitar/recusar vive numa lista, e as
  Notificações limitam-se a avisar que chegou um pedido (o mesmo raciocínio aplicado ao sino da
  Home, que deixou de contar pedidos de conexão para não apontar para um sítio onde já não se
  decide nada). Essa lista tem dois anfitriões e um comportamento só: a secção dos Matches e o
  ecrã `connection-requests`, que renderizam o **mesmo componente** - não há duas versões de
  aceitar um pedido, só duas portas para a mesma sala.
- **Os toques da Home e das Notificações abrem a aba dos Matches** - e não o ecrã
  `connection-requests`. Numa primeira versão era o contrário, e a razão era o gesto de voltar:
  mudar de separador não empilha ecrã nenhum, e o pedido ficava num beco sem saída. A razão estava
  certa e a escolha não: quem toca numa linha "N pedidos de conexão" vai **decidir** (aceitar ou
  recusar), e é nos Matches que a decisão aparece com o que a rodeia - o cabeçalho do ecrã e, por
  baixo dos pedidos, quem mais se pode encontrar. O ecrã empilhado continua a existir e a render a
  mesma lista, como destino de um link (o `url` de um aviso, ver src/push/listener.ts), onde o
  gesto de voltar continua a fazer falta.
- **Quem já tem um pedido de conexão connosco desaparece da descoberta** (lista dos Matches e
  pesquisa) - em
  qualquer sentido e em qualquer estado: pendente, aceite ou recusado. Excluir apenas o sentido
  "eu pedi" deixava o mesmo par em cima do Matches (o pedido) e em baixo (o candidato), com o
  "Conectar" a criar um segundo pedido entre as mesmas duas pessoas.
- **Quem aceita o pedido de sessão fica como Mentor dessa sessão** - o pedido pode partir de
  qualquer lado, mas só quem o aceita pode terminar a sessão e é essa parte que o ecrã de agenda
  apresenta como Mentor. Consequência a rever: se um professor pedir a sessão a um aluno, é o
  professor que aparece como "Tutorando" nessa sessão.
- **Limites nas leituras** - nenhuma lista da app lê uma coleção inteira: o chat abre com 50
  mensagens (com "carregar anteriores"), os Materiais leem as últimas 50 mensagens de cada
  conversa, o feed de notificações está limitado e ordenado no servidor, e o conjunto de
  candidatos de pesquisa/matches tem um tecto (`CANDIDATE_POOL_LIMIT`, em `src/lib/matching.ts`).
- **Uma leitura que falha diz que falhou** - a Home, os Matches e a pesquisa liam os dados com
  `.then` e **sem `.catch`**, e o desfecho era o pior de todos: a lista ficava vazia, ou o
  indicador rodava para sempre, e nenhum dos dois casos se distingue de "não há mesmo nada". Foi
  assim que um deploy de regras em atraso se apresentou como "a app não tem dados" em vez de se
  ver na consola. Os três ecrãs têm agora um estado de erro explícito com "Tentar novamente"
  (`loadError`), e as chaves `search.error`/`search.retry` - que estavam escritas e nunca eram
  usadas - passaram a servir para isso.
- **As subscrições ao vivo também têm erro (e uma só por pergunta)** - o mesmo problema, no canal
  que faltava. Um `onSnapshot(query, onNext)` sem terceiro argumento não tem onde pôr um erro: uma
  leitura negada pelas regras não era um estado, era uma lista que ficava como estava - e uma
  lista vazia é indistinguível de "não há pedidos". Os **pedidos de conexão** (a bolinha da barra
  de baixo, a contagem da Home, a lista dos Matches, as Notificações e o ecrã próprio) e os
  **pedidos de sessão** (Home e Notificações)  passaram a correr sobre uma **leitura viva
  partilhada** (`src/lib/live-query.ts`): a pergunta é feita **uma vez** à base de dados, quem
  chega depois recebe o que já se sabe, o último a sair fecha-a, e o erro é um campo do estado.
  As **conversas** juntaram-se a esta lista na volta seguinte (a bolinha do separador do Chat, a
  contagem da Home, a lista do Chat e as Notificações eram quatro subscrições à mesma pergunta -
  ver `useConversations`).
  Cada ecrã mostra-o com o mesmo aviso (`RetryNotice`, com "Tentar outra vez" - um `onSnapshot`
  que falha não volta sozinho, por isso a segunda tentativa fecha e abre outra). Antes da
  partilha, três separadores abertos ao mesmo tempo faziam a mesma pergunta três vezes, e cada
  alteração era contada (e paga) três vezes.
- **Quem envia um pedido vê a resposta ao vivo** - a app só ouvia o que **chega** (`to == eu`), por
  isso quem pedia só sabia da resposta quando algum ecrã voltasse a ler (o puxar da Home, o abrir
  da Agenda). O histórico "Recentes" das Notificações passou a ter também uma subscrição dos
  pedidos **aceites que eu enviei** (`subscribeToAcceptedConnectionRequests`), e a mesma entrada
  pode vir das duas leituras com o mesmo id (`connection-{id}`), por isso o ecrã junta-as por id e
  fica com uma só. Os dois contratos ficam escritos: **só os aceites** geram aviso (um recusado é
  uma decisão do outro, e a app não persegue ninguém com ela) e **só para quem pediu** (quem
  aceitou já sabe o que fez) - os dois fixados em `tests/data/activity.test.mts` e
  `tests/data/flows.test.mts`.
  Nota que já era ao vivo e não mudou: a conversa criada ao aceitar aparece na hora no Chat e na
  bolinha do separador - o que mudou foi onde essa leitura vive (uma só, partilhada), não o facto
  de ser ao vivo. A troca fica escrita: os perfis de quem participa numa conversa são resolvidos
  com uma cache que dura o que durar a subscrição, e como ela agora pode viver a sessão inteira
  (a barra de baixo está sempre montada), um nome ou uma fotografia editados por outra pessoa
  podem não aparecer até se entrar de novo. É mais barato e menos fresco, de propósito.
  Consequência conhecida: acima desse tecto, a pesquisa deixa de ver toda a gente, porque filtra
  no cliente. Passar a pesquisa para o servidor ficou por fazer de propósito (setembro de 2026), e
  há dois caminhos com custos muito diferentes: **só o filtro por disciplina** no servidor não
  precisa de nada novo (um índice, e o tecto desaparece para quem filtra), enquanto uma **pesquisa
  por nome a sério** obriga a guardar um campo com o nome normalizado no perfil - muda a escrita,
  as regras, e precisa de migrar os perfis que já existem.
- **Sem Cloud Functions / cron** - "sessão já terminou" (para disparar o pedido de avaliação) é
  calculado no cliente, comparando data+hora da sessão com a hora atual. A expiração da sessão
  (30 dias com "Lembrar", 1 dia sem) também: é uma decisão de UX, não uma fronteira de segurança
  - o refresh token do Firebase continua válido para um cliente modificado. Depende, no entanto,
  de a sessão estar mesmo guardada no dispositivo: no React Native o `getAuth()` do Firebase fica
  **só com persistência em memória** (o SDK avisa disso no terminal) e é preciso
  `initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })` - ver
  `src/lib/firebase.ts`. Sem isso o `lastLoginAt` desaparecia com o processo, a app pedia
  credenciais a cada arranque e estas expirações nunca chegavam a ser avaliadas.
- **"Lembrar-me" decide duas coisas diferentes** - quanto tempo a sessão dura (30 dias com,
  1 dia sem) e se o **email** fica guardado no dispositivo para o ecrã de entrada o voltar a
  preencher (`src/lib/remembered-email.ts`). Não significa "não me peças credenciais outra vez":
  o "Sair" apaga a sessão sempre - é uma decisão explícita da pessoa e nenhum flag a sobrepõe.
- **Bloqueio é simétrico, e só as regras o garantem** - o documento é criado num sentido só
  (`blocks/{blocker}_{blocked}`), mas basta existir um para o par deixar de poder ligar-se, falar
  ou pedir sessões. As regras avaliam-no com `exists()` (que corre com acesso total, não com as
  permissões de quem fez o pedido), por isso bloquear funciona sem revelar o bloqueio - quem foi
  bloqueado não consegue ler o documento. Consequência assumida: a coleção é legível **pelos dois
  lados** (é o que permite a cada um excluir o outro da descoberta sem falar com o servidor), o que
  quer dizer que um cliente modificado consegue descobrir quem o bloqueou; e a lista de
  *bloqueados* mostra só quem eu bloqueei, nunca quem me bloqueou.
- **A lista de conversas esconde o que as regras não podem filtrar** - *rules are not filters*: uma
  regra não consegue tirar linhas de uma query, por isso um bloqueio é aplicado nas regras
  (mensagens ilegíveis e impossíveis de escrever) **e** filtrado no cliente (a conversa sai da
  lista). O documento da conversa em si continua legível - só os participantes e datas, sem
  conteúdo.
- **O histórico não se apaga a não ser com a conta** - o `delete` existe para a eliminação da
  conta e para o que é estritamente do próprio (desbloquear, esquecer um registo de avisos, apagar
  uma mensagem que ele escreveu). Passada a conta, não há forma de apagar uma sessão, um pedido ou
  uma conversa avulso: registos de teste ou dados obsoletos removem-se pela consola do Firebase.
- **Sem modo escuro** - `useTheme()` devolve sempre a paleta clara e o `app.json` está em
  `userInterfaceStyle: light`. É intencional, não é esquecimento.
- **Falta o push (avisos fora da app)** - hoje um pedido de conexão ou de sessão só se vê quando
  alguém abre a app e olha para a bolinha: toda a mecânica da app depende de o outro lado abrir a
  app por acaso. É o maior buraco de produto que resta. A decisão está tomada quanto ao serviço -
  **`expo-notifications` + Expo Push Service** (do próprio Expo, sem plano pago: é o push que
  dispensa as Cloud Functions, que exigiriam o plano Blaze) - e já não depende de nada que falte:
  a development build existe (ver "Builds e o fim do Expo Go"), e o EAS Observe já usa a mesma
  camada nativa. O que falta é o trabalho: guardar o token do dispositivo no Firestore (campo novo,
  com regras novas) e chamar a API do Expo Push quando o pedido nasce.
  Detalhe que decide a arquitetura: **sem servidor, quem envia é o cliente**. O emissor chama a API
  do Expo Push diretamente - é o caminho que não exige plano pago, com a consequência de a
  credencial viver no cliente; a alternativa (uma função de servidor, ou um serviço de orquestração
  como o Knock) resolve isso e traz uma conta e um preço a mais para gerir.
- **A galeria não pede permissão nenhuma** - quem escolhe é o seletor do sistema, que devolve uma
  cópia do ficheiro escolhido e não dá acesso à biblioteca, por isso não há nada para pedir. O
  pedido que ali estava custava duas coisas: um diálogo do sistema antes de a galeria abrir (o
  atraso que se sentia no toque) e, a quem já o tivesse recusado, um toque que não fazia nada - o
  seletor nunca abria e não havia mensagem nem caminho para as definições do telemóvel.
- **A fotografia de perfil não abre em grande** - o toque no avatar **é** o seletor. Chegou a haver
  a vista da fotografia do tamanho do cartão com o botão "Alterar" por baixo (um ícone de máquina
  fotográfica dentro do avatar apontava para um botão que não existia, e a fotografia a 96 px
  mostrava pouco) e foi retirada: trocar de fotografia é o que se quer fazer quase sempre, e o
  modal era um toque a mais **e** uma espera - o seletor do sistema apresenta-se por cima de tudo e
  não arranca enquanto um modal nosso estiver a desaparecer, o que obrigava a adivinhar o instante
  (a decisão que ficou está na entrada **Escolher fotografia é um toque, uma ação**, mais acima).
- **O microfone não é pedido** - o plugin do `expo-image-picker` liga
  `android.permission.RECORD_AUDIO` por omissão (o seletor de imagens também sabe captar vídeo),
  e a app só escolhe uma fotografia da galeria. Ficou `microphonePermission: false` no `app.json`,
  que a bloqueia no Android e tira a descrição de uso no iOS - uma permissão a mais na ficha da
  loja é uma pergunta a mais a quem instala.
- **Limitações conhecidas** - no **teu** perfil, as sessões dadas/recebidas/agendadas são contadas
  a partir de `sessions` (ver `subscribeToSessionStats`), mas no perfil de **outra pessoa** a linha
  das sessões continua a ser um placeholder (`sessionsGiven` em `matching.ts`): contá-la exigiria
  ler as sessões de quem não é parte delas, e a regra só as deixa ler a quem participou. Fazer isto
  a sério é um contador no próprio perfil, escrito pelo mentor quando fecha a sessão.
  `responseTime` dos cartões também é um placeholder; a app **não** faz videochamadas (a
  modalidade "Online" é só como a sessão é combinada, e o chat é onde se combina); disciplinas,
  modalidades e períodos de disponibilidade são guardados no Firestore como texto em português,
  por isso não acompanham a mudança de idioma.
- **O EAS Observe não pode ser uma porta de sentido único** - o `expo-observe` é um módulo nativo,
  e um `import` no topo do ficheiro faz a app **fechar-se no arranque** quando a build não o tem
  (Expo Go, ou um binário anterior ao pacote entrar no projeto). Aconteceu, e o sintoma - a app abre
  e fecha logo a seguir, sem ecrã nenhum - é dos piores para diagnosticar. O serviço de diagnóstico
  passou a ser carregado em `src/lib/observe.ts` com a falha apanhada: sem módulo, não há métricas
  nem erros reportados e todo o resto funciona (ver **Erros em produção**).
- **Tocar fora de um campo fecha o teclado, mas não com um `Touchable` à volta da app** - esteve
  assim, à volta de tudo, e foi retirado. Um `Touchable` não se limita a ouvir o toque: fica com ele
  (a `Pressability` reivindica todos os que lhe chegam) e, ao recebê-los, pede ao sistema para
  bloquear os gestos nativos do que está por dentro (`blockNativeResponder`; no Android é um
  `requestDisallowInterceptTouchEvent`, que é exatamente o que impede um `ScrollView` de apanhar o
  arrastar). Passou para onde faz falta: os ecrãs **sem lista** - entrar, criar conta, esqueceu-se da
  palavra-passe - levam `keyboardDismissProps` (`components/ui/KeyboardDismiss`), que reivindica o
  toque mas não pede bloqueio nenhum, e os que rolam levam `keyboardShouldPersistTaps="handled"`,
  que é o comportamento nativo (um toque que um botão não trata fecha o teclado; um arrastar
  continua a ser um arrastar). **Nota honesta**: no iOS, o Fabric recebe o `blockNativeResponder` e
  ignora-o (`RCTMountingManager.mm` só chama `setIsJSResponder`), por isso esta mudança **não**
  explica uma lentidão de scroll sentida no iPhone - o que ela corrige é o Android, onde o bloqueio
  é mesmo aplicado. Uma lentidão que se sinta nos dois merece ser medida antes de mexer: a app já
  publica o `tti` por ecrã no EAS Observe (integração `'expo-router'`).
- **`__DEV__` não se escreve a direito fora do React Native** - é uma global do Metro, e num
  processo de Node (os testes `test:lib` e `test:data`) não existe: um `if (__DEV__)` ali é um
  `ReferenceError` no momento em que a linha corre. Passou a haver `isDev()` em `src/lib/dev.ts`, que
  responde a mesma pergunta onde quer que corra. O que o trouxe à superfície foi o App Check: a partir
  do momento em que o `src/lib/firebase.ts` passou a importar o serviço de erros, o `observe.ts`
  entrou no grafo dos testes da camada de dados - e o aviso "sem módulo nativo" rebentava
  precisamente quando o módulo nativo não existia, que em Node é sempre.

## Contas de teste

A app só entra com email institucional, e uma revisão precisa de credenciais (a diretriz 2.1 da
Apple recusa uma app que pede autenticação sem as fornecer). Existem duas contas **no projeto
Firebase real**, criadas pelo `npm run create:demo-account`, já com o **email confirmado** e o
**perfil completo** - para o revisor ver a app e não o assistente de configuração:

| conta | papel | o que mostra |
|---|---|---|
| `demo@iseclisboa.pt` | **Tutor** (`professor`, modo `teach`) | o lado de quem ensina: tutorandos para si, pedidos de conexão a chegar, sessões |
| `aluno.demo@alunos.iseclisboa.pt` | **Tutorando** (`student`, modo `both`) | o deck de descoberta inteiro, e as duas metades (aprende e ensina) |

**A palavra-passe não está aqui, e não pode estar**: este repositório é público. É a que foi passada
em `--password` no dia em que cada conta nasceu, e escreve-se nos dois sítios onde os revisores a vão
ler (esses sim, privados):

- **App Store Connect** → a versão → *App Review Information* → *Sign-in required*;
- **Play Console** → *App content* → *App access* → *All functionality is available without special
  access*: **não**, com as credenciais.

O script é idempotente - corrido outra vez confirma a conta, repõe a palavra-passe e reescreve o
perfil -, e é assim que se garante que as duas continuam a entrar:

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/caminho/para/a/chave.json
npm run create:demo-account -- --apply --password=<escolhida>
npm run create:demo-account -- --apply --email=aluno.demo@alunos.iseclisboa.pt --mode=both --password=<escolhida>
```

São contas como as outras: aparecem na descoberta dos outros utilizadores, por isso vale a pena
apagá-las quando a revisão acabar.
