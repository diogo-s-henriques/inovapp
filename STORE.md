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
| **Conta de demonstração para a revisão** | a app só entra com email institucional e com o email confirmado - o revisor não tem como criar conta, e sem credenciais a revisão é recusada (diretriz 2.1) | **feita** (`npm run create:demo-account`): `aluno.demo@alunos.iseclisboa.pt` e `demo@iseclisboa.pt`, com o email confirmado e o perfil completo. Falta escrever as credenciais em *App Review Information* / *App access* |

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
INOVAPP: Mentorias ISEC
```

**Subtítulo (App Store, máx. 30)**

```
Mentorias no ISEC Lisboa
```

**Título (Google Play, máx. 30)**

```
INOVAPP: Mentorias ISEC
```

**Descrição breve (Google Play, máx. 80)**

```
Mentorias entre alunos e docentes do ISEC Lisboa.
```

**Categoria** Educação · **Classificação** 4+ (Apple) / *Todos* (Play) · **Idiomas** Português (pt-PT),
Inglês (en-US) · **Preço** grátis, sem compras dentro da app.

## Texto promocional (App Store, máx. 170)

```
Encontra quem te ajude na disciplina que te está a dar trabalho. Pede conexão, combina uma sessão e
leva os materiais contigo - tudo dentro do ISEC.
```

## Descrição (App Store, máx. 4000)

```
A INOVAPP liga quem quer aprender a quem pode ensinar, dentro do ISEC Lisboa.

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

Para estudantes e docentes do ISEC Lisboa. Entra-se com o email institucional -
@alunos.iseclisboa.pt ou @iseclisboa.pt -, e a conta só fica ativa depois de confirmares esse email.
Não há contas para pessoas de fora.

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
A INOVAPP liga quem quer aprender a quem pode ensinar, dentro do ISEC Lisboa.

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

Para estudantes e docentes do ISEC Lisboa. Entra-se com o email institucional -
@alunos.iseclisboa.pt ou @iseclisboa.pt -, e a conta só fica ativa depois de confirmares esse email.
Não há contas para pessoas de fora.

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
INOVAPP: ISEC Mentoring
```

**Subtitle (máx. 30)**

```
Mentoring at ISEC Lisboa
```

**Keywords (máx. 100)**

```
mentoring,tutor,ISEC,study help,peers,lecturers,sessions,subjects,campus,college
```

**Description (máx. 4000)**

```
INOVAPP connects people who want to learn with people who can teach, inside ISEC Lisboa.

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

For students and lecturers at ISEC Lisboa. You sign in with your institutional email -
@alunos.iseclisboa.pt or @iseclisboa.pt - and the account only becomes active after you confirm
that email.

WHAT IT DOES NOT DO

It is not a social network: no posts, no followers, no popularity metrics. It does not collect your
location and does not ask for contacts, camera or microphone. No ads, no in-app purchases, and no
data is sold to anyone.

You can delete your account inside the app, in Profile → Settings → Delete account.
```

## Notas para a revisão (App Review Information)

```
A app é para a comunidade do ISEC Lisboa e o registo exige um email institucional, que é confirmado
por link. Não é possível criar conta em revisão, por isso deixamos duas contas já confirmadas e com
perfil completo - uma de cada lado da app:

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

É uma conta de **docente**, e é isso que o revisor vê: no separador *Match* não há deck de
descoberta, porque um Tutor não procura mentores - quem procura são os Tutorandos, e são eles que
lhe chegam como pedidos. Se quiseres que a revisão veja os dois lados da app, faz uma segunda conta
de **aluno**, que tem o deck inteiro:

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
de login, e é possível que a correção do crash mude a avaliação sozinha. Se voltar a recusar, a
resposta é a **distribuição não listada** (*App Store Connect > Distribuição*): fica na App Store,
instala-se por link, não aparece em buscas - que é o que a Apple indica para este caso, e não obriga
a mexer na app.

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
