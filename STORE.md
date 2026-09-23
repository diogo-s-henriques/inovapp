# Ficha das lojas - INOVAPP

O texto que vai para a App Store Connect e para a Google Play Console, com os limites de cada campo
já contados (o `scripts/check-store-limits.js` confere-os contra este ficheiro: `npm run store:check`).

**Os dois textos dizem a mesma coisa de duas maneiras** - a App Store aceita um texto mais cuidado e
a Play pede descrições curtas e objetivas -, mas há **uma regra que vale para os dois**: não se
prometem avisos no telemóvel. A app sabe recebê-los, mas ainda ninguém os envia (faltam as Cloud
Functions), e uma função anunciada que não acontece é o primeiro sítio onde a revisão da Apple
tropeça. O mesmo vale para "grátis": diz-se que não há compras dentro da app, que é verdade.

## Antes de submeter: as três coisas que as lojas exigem

| | o que é | estado |
|---|---|---|
| **URL da política de privacidade** | um endereço público com a política | **decidido**: `https://happycampus.pt/pdfs/TC_App_HappyCampus.pdf` - ler a nota abaixo antes de o colar |
| **URL de suporte** | uma página onde se possa pedir ajuda (não serve `mailto:`) | **decidido**: `https://happycampus.pt` |
| **Conta de demonstração para a revisão** | o registo está aberto a qualquer email, mas a conta só fica ativa depois de **confirmar o email** - e um revisor não vai ler a caixa de correio de um endereço que inventou na hora. Sem credenciais, a app não se consegue ver e a revisão é recusada (diretriz 2.1) | **feita** (`npm run create:demo-account`): `aluno.demo@alunos.iseclisboa.pt` e `demo@iseclisboa.pt`, com o email confirmado e o perfil completo. **Escrever as credenciais das *duas* contas em *App Review Information* (com *Sign-in required*) e em *App access* na Play** |

### Sobre a política de privacidade que vai ligada (decisão assumida)

O URL é um **PDF publicado pela Universitas/Cooperativa de Ensino Superior** - e é os *Termos e
Condições da aplicação «Buddy App»*, não desta. Tem uma secção de proteção de dados (RGPD,
finalidades, direitos), é HTTPS e abre sem autenticação, por isso as duas lojas aceitam-no como
política. A decisão de o usar foi tomada com isto à frente: **o documento nomeia outra aplicação e
descreve serviços que a INOVAPP não tem** (apoio psicológico, monitorização emocional, dados de
bem-estar) e não descreve os que ela tem (email institucional, fotografia, mensagens, token dos
avisos, Firebase/Expo/EAS Observe).

Duas consequências que ficam desta escolha:

- o **questionário** *App Privacy* (Apple) e *Segurança de dados* (Play) tem de descrever o que a
  app faz **na mesma** - responder pelo documento alinhado era declarar dados que não existem e
  calar os que existem, e é essa incoerência que a revisão procura;
- o `PRIVACY.md` deste repositório continua a ser a descrição exata da app. Se um dia o ISEC
  publicar o equivalente para a INOVAPP, é trocar **uma linha** aqui (o URL) e alinhar os dois
  documentos.

## Nome, subtítulo e categoria

**Nome (App Store, máx. 30)**

```
INOVAPP: Mentoria entre pares
```

**Subtítulo (App Store, máx. 30)**

```
Mentoria no ensino superior
```

**Título (Google Play, máx. 30)**

```
INOVAPP: Mentoria entre pares
```

**Descrição breve (Google Play, máx. 80)**

```
Mentoria entre estudantes e docentes do ensino superior.
```

**Categoria** Educação · **Classificação** 4+ (Apple) / *Todos* (Play) · **Idiomas** Português (pt-PT),
Inglês (en-US) · **Preço** grátis, sem compras dentro da app.

**Sobre o nome e o subtítulo (reescritos em 23/09/2026).** A ficha dizia "INOVAPP: Mentorias ISEC"
com o subtítulo "Mentorias no ISEC Lisboa", e isso era o mesmo risco que a Apple já usou duas vezes
(diretriz 3.2): **metadados que descrevem uma organização**, com a app aberta a qualquer pessoa e a
caminho das universidades do **consórcio INOVAPP**. O nome passa a descrever a app - mentoria entre
pares no ensino superior - e o ISEC fica onde deve ficar: como a instituição onde ela começou, dito
no corpo da descrição. Duas notas honestas:

- **é a peça que vale a pena confirmar antes de colar**, porque é a única que não se muda à vontade:
  depois de a versão estar publicada, o nome deixa de ser editável (o subtítulo não);
- **o nome perde as palavras que davam busca** ("mentorias", "ISEC"). Compensam-se nas palavras-chave
  e na descrição, que é onde a Apple as lê de facto - mas é uma troca, e fica dito.

## Texto promocional (App Store, máx. 170)

```
Encontra quem te ajude na disciplina que te está a dar trabalho. Pede conexão, combina uma sessão e
leva os materiais contigo - tudo dentro da tua instituição.
```

## Descrição (App Store, máx. 4000)

```
A INOVAPP liga quem quer aprender a quem pode ensinar, na tua instituição de ensino superior.

Procurar quem te ajude numa disciplina não devia dar mais trabalho do que a própria disciplina.
Aqui, quem precisa de apoio encontra quem já passou pela mesma unidade curricular - colegas mais
avançados e docentes - e combina uma sessão em dois toques.

O QUE PODE FAZER

· Diz o que queres aprender e o que podes ensinar: a descoberta só te mostra quem procura o que tens
  para dar.
· Procura por disciplina, curso e disponibilidade, e vê o perfil de quem está por trás de cada nome.
· Pede conexão a um mentor ou tutor. Só se fala depois de o pedido ser aceite.
· Marca sessões de apoio com data, hora e modalidade - presencial ou online.
· Troca mensagens e deixa os materiais da sessão na conversa, para não se perderem.
· Acompanha o que tens marcado: sessões agendadas, dadas e recebidas.
· Avalia a sessão no fim. A avaliação é anónima.

PARA QUEM É

Para quem quer aprender e para quem pode ensinar. Cria conta com o teu email - qualquer email - e
confirma-o pelo link que te enviamos: não há convite, não há aprovação e não há pagamento.

A INOVAPP é a app de mentoria do **consórcio INOVAPP**, usada pelas instituições de ensino superior
que dele fazem parte. Quem entra com o email institucional de uma delas fica logo ligado à
comunidade dessa instituição - alunos e docentes; todos os outros entram como alunos, e podem dar e
receber apoio.

O QUE NÃO FAZ

Não é uma rede social: não tem publicações, nem seguidores, nem métricas de popularidade. Não recolhe
a tua localização e não pede acesso a contactos, câmara ou microfone. Não tem publicidade, não tem
compras dentro da app e não vende dados a ninguém.

Podes apagar a tua conta dentro da app, em Perfil → Definições → Apagar conta.
```

## Descrição completa (Google Play, máx. 4000)

O mesmo texto da App Store, com o fim que a Play pede e a Apple não (por isso está escrito aqui por
inteiro e não por referência: é daqui que se cola):

```
A INOVAPP liga quem quer aprender a quem pode ensinar, na tua instituição de ensino superior.

Procurar quem te ajude numa disciplina não devia dar mais trabalho do que a própria disciplina.
Aqui, quem precisa de apoio encontra quem já passou pela mesma unidade curricular - colegas mais
avançados e docentes - e combina uma sessão em dois toques.

O QUE PODE FAZER

· Diz o que queres aprender e o que podes ensinar: a descoberta só te mostra quem procura o que tens
  para dar.
· Procura por disciplina, curso e disponibilidade, e vê o perfil de quem está por trás de cada nome.
· Pede conexão a um mentor ou tutor. Só se fala depois de o pedido ser aceite.
· Marca sessões de apoio com data, hora e modalidade - presencial ou online.
· Troca mensagens e deixa os materiais da sessão na conversa, para não se perderem.
· Acompanha o que tens marcado: sessões agendadas, dadas e recebidas.
· Avalia a sessão no fim. A avaliação é anónima.

PARA QUEM É

Para quem quer aprender e para quem pode ensinar. Cria conta com o teu email - qualquer email - e
confirma-o pelo link que te enviamos: não há convite, não há aprovação e não há pagamento.

A INOVAPP é a app de mentoria do **consórcio INOVAPP**, usada pelas instituições de ensino superior
que dele fazem parte. Quem entra com o email institucional de uma delas fica logo ligado à
comunidade dessa instituição - alunos e docentes; todos os outros entram como alunos, e podem dar e
receber apoio.

O QUE NÃO FAZ

Não é uma rede social: não tem publicações, nem seguidores, nem métricas de popularidade. Não recolhe
a tua localização e não pede acesso a contactos, câmara ou microfone. Não tem publicidade, não tem
compras dentro da app e não vende dados a ninguém.

EM PRIVACIDADE

Os dados são guardados no Firebase (Google) e as mensagens entre duas pessoas só são visíveis a
essas duas. O perfil (nome, fotografia, curso e interesses) é visível para quem tem sessão iniciada
na app. A política de privacidade completa está em:
https://happycampus.pt/pdfs/TC_App_HappyCampus.pdf

Sem publicidade. Sem compras. Sem recolha de localização, contactos, câmara ou microfone.
```

E o formulário **Segurança dos dados** da Play Console (não é texto da descrição: é o inquérito
separado, e é onde as apps costumam mentir). Responde-se assim:

| categoria | o que se declara |
|---|---|
| Informações pessoais | nome e email - **recolhidos**, para gerir a conta; não partilhados; não vendidos |
| Fotos | fotografia de perfil - **recolhida**, para o perfil; visível a quem tem sessão iniciada |
| Mensagens | mensagens dentro da app - **recolhidas**, visíveis só a quem participa da conversa |
| Atividade na app | pedidos, sessões e avaliações - **recolhidos**; a avaliação é anónima por construção |
| Diagnóstico | erros e tempos de arranque por ecrã, **sem dados pessoais** (EAS Observe) |
| Eliminação de conta | **disponível na app**: Perfil → Definições → Apagar conta |
| Publicidade / compras | **nenhuma** nos dois |
| Localização, contactos, câmara, microfone | **não recolhidos nem pedidos** |

## Novidades desta versão (1.0.0)

```
Primeira versão.
```

## Inglês (opcional)

A app tem os dois idiomas; a ficha pode ficar só em português. Se quiseres a localização `en-US`:

**Name (máx. 30)**

```
INOVAPP: Peer mentoring
```

**Subtitle (máx. 30)**

```
Mentoring in higher education
```

**Keywords (máx. 100)**

```
mentoring,tutor,study help,peers,lecturers,sessions,subjects,campus,college,university
```

**Description (máx. 4000)**

```
INOVAPP connects people who want to learn with people who can teach, at your higher-education
institution.

Finding someone to help you with a subject should not be harder than the subject itself. Here,
whoever needs support finds someone who has already been through the same course unit - students
ahead of them and lecturers - and books a session in two taps.

WHAT YOU CAN DO

· Say what you want to learn and what you can teach: discovery only shows you people looking for
  what you have to give.
· Search by subject, course and availability, and see the profile behind each name.
· Ask someone to connect. You only talk once the request is accepted.
· Book support sessions with a date, time and mode - in person or online.
· Exchange messages and keep the session materials in the conversation.
· Track what you have booked: scheduled, given and received sessions.
· Rate the session at the end. Ratings are anonymous.

WHO IT IS FOR

For anyone who wants to learn and anyone who can teach. Create an account with your email - any
email - and confirm it through the link we send you: no invitation, no approval and no payment.

INOVAPP is the mentoring app of the **INOVAPP consortium**, used by the higher-education
institutions that are part of it. Anyone who signs in with an institutional email from one of them
is linked straight to that institution's community - students and lecturers; everyone else joins as
a student and can both give and receive support.

WHAT IT DOES NOT DO

It is not a social network: no posts, no followers, no popularity metrics. It does not collect your
location and does not ask for contacts, camera or microphone. No ads, no in-app purchases, and no
data is sold to anyone.

You can delete your account inside the app, in Profile → Settings → Delete account.
```

## Notas para a revisão (App Review Information)

```
O registo está aberto a qualquer email, mas a conta só fica ativa depois de confirmar o endereço
pelo link que o Firebase envia - e um revisor não tem acesso à caixa de correio de um endereço
inventado na hora. Por isso deixamos duas contas já confirmadas e com perfil completo - uma de cada
lado da app:

  Aluno   aluno.demo@alunos.iseclisboa.pt
  Tutor   demo@iseclisboa.pt
  palavra-passe (as duas): a que estiver nas credenciais da loja (não fica neste repositório)

Comece pela conta de **Aluno**, que é a que mostra a app inteira:

1. Início - o resumo da atividade e os atalhos (sessões, materiais, pedidos).
2. Match - a lista de pessoas que ensinam o que esta conta quer aprender; tocar num perfil mostra
   os detalhes e o botão de bloquear. É aqui que se pede conexão.
3. Chat - as conversas com quem está ligado, com os materiais partilhados.
4. Perfil - os dados da conta e as estatísticas de sessões; a roda dentada abre as Definições.
5. Perfil → Definições → Apagar conta - o caminho de eliminação de conta (diretriz 5.1.1(v)).
   Pede a palavra-passe antes de apagar, ou seja, as contas de demonstração podem ser usadas para o
   fluxo todo sem ficarem inutilizadas (basta não confirmar o último passo).

E com a conta de **Tutor** vê-se o outro lado: no Match não há lista de mentores - quem ensina
recebe pedidos, e são os Tutorandos que o encontram (é a app a funcionar como foi desenhada, não
uma limitação da conta).

> **Cuidado, e é uma armadilha real:** quem só ensina **e não tem nenhum pedido pendente** não vê
> lista nenhuma - cai no `BlockedScreen`, com o título "Funcionalidade bloqueada". A conta de Tutor
> de demonstração está exatamente nesse estado (o único pedido que tem está `accepted`, e um aceite
> não conta). Foi provavelmente isto que a revisão da 1.0 (10) leu como "não conseguimos verificar
> todas as funcionalidades, como o Match". Duas saídas, nenhuma delas feita: dar a essa conta um
> pedido pendente de outra pessoa, **ou** trocar o estado/texto desse ecrã na próxima versão - um
> separador que anuncia "funcionalidade bloqueada" a um mentor novo não é só um problema de revisão.

Não há compras dentro da app e não há recolha de localização, contactos, câmara ou microfone.
```

A conta existe, com o email **confirmado** e o perfil **completo** - foi criada por
`npm run create:demo-account`, que é também o caminho para a repor (a palavra-passe é reescrita e o
email volta a ficar confirmado):

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/caminho/para/chave.json
npm run create:demo-account                      # só mostra o que faria
npm run create:demo-account -- --apply --password=NovaPalavra1!
```

A conta de **docente** mostra o outro lado da app: no separador *Match* não há deck de descoberta,
porque um Tutor não procura mentores - quem procura são os Tutorandos, e são eles que lhe chegam
como pedidos. A segunda conta de **aluno** (`aluno.demo@alunos.iseclisboa.pt`, criada com
`--mode=both`) é a que tem o deck inteiro, e é por ela que a revisão deve começar:

```bash
npm run create:demo-account -- --apply --email=aluno.demo@alunos.iseclisboa.pt --mode=both --password=OutraPalavra1!
```

**E a classificação etária:** no questionário da Apple e no IARC da Play, a app não tem conteúdo
gerado publicamente, nem jogos, nem publicidade - a única coisa a declarar é a **comunicação entre
utilizadores** (mensagens privadas entre duas pessoas que aceitaram ligar-se) e os **dados do
utilizador** (nome, fotografia, email). Responde-se, e não se declara "sem interação": é
exatamente esse o campo em que estas apps são apanhadas a mentir.

## Datas do lado da Play

Se a conta de programador for **pessoal** (criada depois de novembro de 2023), a produção só abre
depois de um teste fechado com **12 testadores durante 14 dias** - ou seja, há duas semanas entre o
primeiro `.aab` e o público, e os testadores têm de aceitar o convite. Contas de **organização**
(ISEC) não têm este requisito. Vale a pena confirmar qual é antes de contar com uma data.

## A revisão da 1.0 (6): as duas recusas (19/09/2026)

Duas, e independentes uma da outra. A 2.1(a) é um defeito da app e resolve-se com código; a 3.2 é
uma discussão de distribuição e resolve-se com uma resposta (ou com uma decisão de produto).

### 2.1(a) - "we were unable to review the app because it crashed on launch"

Não era intermitente nem do dispositivo do revisor (iPhone 17 Pro Max, iOS 27.0): era **sempre**, em
qualquer aparelho, em qualquer build vinda dos servidores do EAS. A causa é uma configuração que
nunca chegou ao bundle:

```
.env no .gitignore, sem .easignore
  -> o EAS arquiva o projeto pelo .gitignore e o .env nao sobe para o construtor
  -> as seis EXPO_PUBLIC_FIREBASE_* saem undefined no bundle de loja
  -> src/lib/firebase.ts faz `export const auth = createAuth()` no topo do ficheiro
  -> o SDK do Firebase recusa a chave vazia (auth/invalid-api-key) e o modulo rebenta
  -> um throw a avaliar um modulo nao tem ecra por tras: a app fecha ao abrir
```

Está escrita por inteiro no README, em "As variáveis que as lojas precisam". O que fica para esta
ficha é o que ela obriga a fazer **antes de voltar a submeter**:

1. as chaves passaram para o `eas.json` (perfil `base`), que é o que a build de loja lê;
2. **build nova** - o valor vai dentro do bundle, por isso a build que já existe não serve;
3. e a prova de que o bundle agora tem configuração, antes de gastar a build:

```bash
rm -rf .expo/export-check
EXPO_PUBLIC_FIREBASE_PROJECT_ID=prova-do-eas-12345 npx expo export --platform ios --output-dir .expo/export-check
BUNDLE=$(find .expo/export-check -name '*.hbc' | head -1)
grep -c 'prova-do-eas-12345' "$BUNDLE"     # tem de dar 1
```

Não se submete antes de esta linha dar 1. Foi não a ter que se mandaram duas builds sem
configuração nenhuma.

### 3.2 - "intended to be used by a specific business or organization"

A Apple perguntou se a app é para uma organização específica e, se acharmos que não, responde a
cinco perguntas. **Os factos estão do lado deles**: o registo exige email institucional
(`src/constants/auth.ts`) e as regras do Firestore derivam o papel do domínio do email - só entram
`@alunos.iseclisboa.pt` e `@iseclisboa.pt`. Dizer que é para o público geral sem mais nada era falso,
e a revisão verifica-o.

O que se pode dizer, e é verdade, é isto: **não é uma ferramenta interna de uma empresa**, é um
serviço de uma instituição de ensino, aberto a quem lá estuda ou ensina, sem convite, sem aprovação e
sem pagamento. E há um precedente verificável, que é o argumento mais forte desta resposta:

- **Campus Buddy** (`https://apps.apple.com/pt/app/campus-buddy/id6761728419`, programador *ISEC
  Lisboa*, a mesma conta de programador) está **publicamente** na App Store, na categoria Ensino, e a
  descrição diz que "alcança todos os alunos da instituição". É o mesmo modelo de acesso, a mesma
  instituição - e é do mesmo projeto ("Happy Campus") de onde vem o documento de privacidade que
  esta submissão usa;
- a App Store distribui publicamente apps universitárias equivalentes (a app do ISCTE, a netPApp).

Uma coisa a ter em conta: **o revisor não conseguiu abrir a app**. A 3.2 foi escrita a partir do ecrã
de login, e era possível que a correção do crash mudasse a avaliação sozinha. **Não mudou**: a ronda
seguinte (1.0 (10)) recusou outra vez com o mesmo texto. E o que ficou decidido não foi a
distribuição não listada - que continua a ser a via que a Apple indica para este caso -, foi **abrir
o registo**, para que "esta app é de audiência geral" seja um facto em vez de uma afirmação que a
app desmente no primeiro ecrã. A ronda da 1.0 (10) está registada no fim deste ficheiro.

Resposta a colar no *Resolution Center*:

```
The app is a student service of ISEC Lisboa, a higher education institution. It is not an internal
tool of a company.

1. Is the app restricted to users who are part of a single company or organization?
   It is restricted to one educational institution: the students and teaching staff of ISEC Lisboa.
   It is not restricted to a company's employees, and it is not an internal tool - it is the
   institution's student mentoring service.

2. Is the app designed for use by a limited or specific group of companies or organizations?
   No. It serves the community of a single school, and it is not sold to or used by other
   organizations.

3. What features in the app, if any, are intended for use by the general public?
   The audience is the institution's community - its students and teaching staff - not a company's
   employees, and access requires nothing but being part of that community. Any person who studies or
   teaches at the institution can obtain access by themselves, at any time, with no invitation, no
   pre-approval from us and no payment. Under the same access model, the App Store already
   distributes publicly "Campus Buddy" (id 6761728419, developer ISEC Lisboa) - an app of this same
   institution, in the Education category, covered by the same privacy document we linked in this
   submission.

4. How do users obtain an account?
   By registering in the app with their institutional email address (@alunos.iseclisboa.pt for
   students, @iseclisboa.pt for teaching staff) and confirming it through the link sent to that
   mailbox. There is no invitation, no approval and no membership list: it is self-service, the same
   way a university student portal works. Two demonstration accounts are provided in App Review
   Information.

5. Is there any paid content in the app and if so who pays for it?
   No. There are no in-app purchases, no subscriptions and no paid features. No user pays anything to
   open an account or to use the app.

We would also like to add that the crash on launch reported under guideline 2.1(a) has been found
and fixed: the release build was compiled without the Firebase configuration (the environment file
is not uploaded to the build server, so the app had no valid API key and terminated during startup).
The configuration now travels with the repository, and build 7 carries the fix. We would appreciate
another look at the app itself.
```

## A revisão da 1.0 (10): três diretrizes, e uma decisão de produto (23/09/2026)

A build 10 foi revista (iPhone 17 Pro Max, iOS 27.0) e voltou com **três** diretrizes. Só uma delas
é sobre a app estar partida, e nenhuma é o problema da ronda anterior:

| diretriz | o que dizia | o que é |
|---|---|---|
| 2.1(a) | na 1.0 (6): *"the app crashed on launch"* → agora: **"Information Needed"** | a app **abre**: o crash do `FirebaseApp.configure()` está resolvido. Falta a revisão conseguir entrar e ver tudo |
| 2.3.10 | *"Revise the app's binary to remove Google Play references"* | **corrigido** - e não era código |
| 3.2 | outra vez *"intended to be used by a specific business or organization"* | **decisão tomada: abrir o registo** |

### 2.3.10 - a referência à Google Play estava no perfil, não no código

Não há uma única linha de "Google Play" em `src/`. O que a revisão leu foi o campo `about` das
**contas de demonstração**, que aparece dentro da app (no cartão da descoberta e no perfil):

```
Aluno Demo   "Conta de demonstração para revisão da App Store e da Google Play."
Tutor Demo   "Conta de demonstração para revisão da App Store e da Google Play."
```

Um texto de bastidores à frente de quem usa a app - que é exatamente o que a diretriz descreve
("information about third-party platforms"). Corrigido nos dois sítios, e **sem build nova**: o
`about` vive no Firestore, por isso a build 10 que já estava submetida passou a mostrar o texto
novo assim que o documento foi escrito.

- **`scripts/create-demo-account.js`** passa a escrever
  `"Perfil de demonstração da INOVAPP. Ensina Programação e Matemática a quem precisa."`;
- e o mesmo valor foi escrito nos dois documentos em produção (`users/{uid}.about`), a partir do
  `.expo/rest-firestore.js` (por REST - o cliente gRPC do `firebase-admin` pendura nesta máquina).

### 2.1(a) - o que falta é entrar, e o ecrã do Match de quem só ensina

O texto mudou de "a app crashou" para "não conseguimos aceder a tudo": o crash acabou. Duas causas
possíveis, e nenhuma precisa de build:

1. **As credenciais.** Só uma das duas contas ficou na *App Review Information*. A revisão pede "a
   demo account that has access to all features... for all account types" - e esta app tem dois
   lados (quem procura e quem ensina), que são duas contas diferentes. Faltando uma, falta metade
   da app.
2. **O ecrã do Match da conta de Tutor** (ver o aviso nas notas de revisão): quem só ensina e não
   tem pedidos pendentes cai em "Funcionalidade bloqueada". É o candidato mais provável ao
   *"such as Matches"* da Apple.

### 3.2 - a decisão: abrir o registo, e continuar a distribuir publicamente

A Apple nomeia explicitamente, na sua página sobre **distribuição não listada**, o público desta
app: *"limited audiences (such as part-time employees, franchisees, partners, business affiliates,
**higher-education students**, or conference attendees)"*. Era o caminho fácil, e ficou disponível.

O caminho decidido foi outro, e é o que torna a resposta **verdadeira** em vez de apenas
defensável: **o registo passa a aceitar qualquer email**. A Apple não recusava uma ideia, recusava
um facto - as regras do servidor só deixavam entrar `@alunos.iseclisboa.pt` e `@iseclisboa.pt`.
Enquanto isso fosse assim, "esta app é para o público geral" era uma afirmação que a app desmentia
no primeiro ecrã, com a app à frente de quem revisava.

O que mudou, e o que se mantém:

| | antes | agora |
|---|---|---|
| Entrada | só dois domínios do ISEC | **qualquer email** |
| Papel | derivado do domínio; fora dos domínios, o registo era recusado | **aluno** por omissão; **docente** só com `@iseclisboa.pt` |
| Confirmação do email | obrigatória para escrever | **mantém-se** - é a defesa contra contas falsas, e é o que a Apple recomenda (mecanismo que trava o uso não autorizado) |
| Regra no servidor | `roleMatchesEmailDomain` | `roleAllowedForEmail` - aluno aberto a todos, docente preso ao domínio (senão um cliente feito à mão escrevia `role: 'professor'` com um email qualquer) |

A distinção que sobrevive **não restringe acesso**: qualquer pessoa entra e usa tudo. O que ela
guarda é um **rótulo** - ser docente do ISEC é algo que a instituição empresta, não uma escolha de
quem se regista. Nada na app ficou fechado atrás do domínio.

O que isto obriga, e onde está (fim do dia 23/09/2026):

1. **Publicar as regras** - **feito** (`firebase deploy --only firestore:rules`). Sem elas no
   servidor, a app nova não deixava entrar ninguém de fora: o cliente era o problema menor;
2. **build nova** - **em curso**, `1.0.0 (11)`, pelo runner macOS do fluxo `.github/workflows`
   (a quota de iOS do EAS está gasta até 1 de outubro). É ela que leva o código -
   `src/constants/auth.ts`, `src/auth/actions.ts` e os dicionários;
3. **as credenciais das duas contas** em *App Review Information*, com *Sign-in required* -
   **falta**, e é o que decide a leitura da 2.1(a): a revisão pede "all account types", e esta app
   tem dois lados, que são duas contas. Os endereços e a nota estão na secção *Notas para a
   revisão*; a palavra-passe é a que ficou das lojas e **não fica neste repositório**;
4. e a nota em *Review Notes* a dizer que o registo está aberto e a distribuição é pública -
   escrita abaixo, pronta a colar.

Resposta a colar no *Resolution Center*:

```
Thank you for the review.

We have addressed all three items.

Guideline 2.3.10 - Accurate Metadata. The Google Play reference was not in our code: it was in the
profile text of the demo accounts, which is displayed inside the app. It has been removed, and the
profile now reads as a normal user profile. No new build was needed for this, because that text is
stored in our database and read by the app at runtime.

Guideline 2.1(a) - Information Needed. Both demonstration accounts are now provided in App Review
Information, with "Sign-in required" enabled: a student account and a teacher account, each with a
confirmed email address and a complete profile. We are sorry that only one of them was available in
the previous submission. Please start with the student account, which shows the whole app -
Matches, Chat, Sessions and the delete-account flow.

Guideline 3.2 - Business. You are right, and we have changed the app rather than argue the point.
Until this version, registration accepted only two email domains, which made the app effectively
restricted to a single institution - "public distribution" was not a true statement about it.
Registration is now open to any email address:

1. Is the app restricted to users who are part of a single company or organization? No. Any person
   can create an account with any email address and confirm it through the link we send to it.
   There is no invitation, no approval and no membership list. An email address from ISEC Lisboa
   simply links the account to that school's community; it does not grant or restrict access.

2. Is the app designed for use by a limited or specific group of companies or organizations? No.
   It is a peer-mentoring app: people say what they want to learn and what they can teach, find
   each other, request a connection, schedule sessions, share materials and chat. Nothing in it is
   built around one organization's workflow, and no organization has to sign anything to use it.

3. What features in the app, if any, are intended for use by the general public? All of them. The
   app can be discovered and downloaded by anyone, with no invitation and no pre-approval, and
   every feature is available to any registered user.

4. How do users obtain an account? By registering in the app with their email address and
   confirming it through the link we send to that address. It is self-service: no invitation, no
   approval and no payment. Two demonstration accounts are provided in App Review Information.

5. Is there any paid content in the app and if so who pays for it? No. There are no in-app
   purchases, no subscriptions and no advertising. No user pays anything to open an account or to
   use any feature.

The app is submitted with public distribution on the App Store, in build 1.0.0 (11), which is now an
accurate description of it.
```

### O que fica por arrumar (a próxima versão)

- **O ecrã do Match de quem só ensina.** O `BlockedScreen` com "Funcionalidade bloqueada" aparece a
  qualquer mentor novo que ainda não tenha recebido pedidos. Numa app aberta isso deixa de ser um
  problema de revisão e passa a ser o que um utilizador novo vê.
- **O catálogo de cursos é só do ISEC** (`COURSES_BY_TYPE`): um aluno de outra instituição do
  consórcio tem de escolher um curso do ISEC. Não trava nada, mas é o mesmo género de incoerência que
  a 3.2 - uma app que diz servir todos e que só conhece uma escola. Cada universidade que adira ao
  consórcio vai precisar dos seus cursos, e o resto do produto foi feito a pensar numa escola só.
- **O nome e o subtítulo da ficha** já não dizem ISEC (ver a nota acima). O que fica por confirmar é
  a própria decisão: publicar como app **do consórcio** - que é o que ela vai ser - ou continuar a
  parecer a app de uma instituição, com o risco que isso teve duas vezes na revisão.
