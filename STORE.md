# Ficha das lojas — INOVAPP

O texto que vai para a App Store Connect e para a Google Play Console, com os limites de cada campo
já contados (o `scripts/check-store-limits.js` confere-os contra este ficheiro: `npm run store:check`).

**Os dois textos dizem a mesma coisa de duas maneiras** — a App Store aceita um texto mais cuidado e
a Play pede descrições curtas e objetivas —, mas há **uma regra que vale para os dois**: não se
prometem avisos no telemóvel. A app sabe recebê-los, mas ainda ninguém os envia (faltam as Cloud
Functions), e uma função anunciada que não acontece é o primeiro sítio onde a revisão da Apple
tropeça. O mesmo vale para "grátis": diz-se que não há compras dentro da app, que é verdade.

## Antes de submeter: três coisas que as lojas exigem

| | o que falta | onde |
|---|---|---|
| **URL da política de privacidade** | publicar o `PRIVACY.md` num endereço público | GitHub Pages do repositório (um clique em *Settings → Pages*) |
| **URL de suporte** | uma página onde se possa pedir ajuda (não serve `mailto:`) | a mesma página, com o email de contacto por baixo |
| **Conta de demonstração para a revisão** | a app só entra com email institucional e com o email confirmado — o revisor não tem como criar conta, e sem credenciais a revisão é recusada (diretriz 2.1) | criar em Firebase Auth uma conta `revisao@alunos.iseclisboa.pt`, com o email **confirmado**, uma palavra-passe simples, e um perfil completo (nome, curso, interesses) — e escrever as credenciais em *App Review Information* / *App access* |

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
leva os materiais contigo — tudo dentro do ISEC.
```

## Descrição (App Store, máx. 4000)

```
A INOVAPP liga quem quer aprender a quem pode ensinar, dentro do ISEC Lisboa.

Procurar quem te ajude numa disciplina não devia dar mais trabalho do que a própria disciplina.
Aqui, quem precisa de apoio encontra quem já passou pela mesma unidade curricular — colegas mais
avançados e docentes — e combina uma sessão em dois toques.

O QUE PODE FAZER

· Diz o que queres aprender e o que podes ensinar: a descoberta só te mostra quem procura o que tens
  para dar.
· Procura por disciplina, curso e disponibilidade, e vê o perfil de quem está por trás de cada nome.
· Pede conexão a um mentor ou tutor. Só se fala depois de o pedido ser aceite.
· Marca sessões de apoio com data, hora e modalidade — presencial ou online.
· Troca mensagens e deixa os materiais da sessão na conversa, para não se perderem.
· Acompanha o que tens marcado: sessões agendadas, dadas e recebidas.
· Avalia a sessão no fim. A avaliação é anónima.

PARA QUEM É

Para estudantes e docentes do ISEC Lisboa. Entra-se com o email institucional —
@alunos.iseclisboa.pt ou @iseclisboa.pt —, e a conta só fica ativa depois de confirmares esse email.
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
Aqui, quem precisa de apoio encontra quem já passou pela mesma unidade curricular — colegas mais
avançados e docentes — e combina uma sessão em dois toques.

O QUE PODE FAZER

· Diz o que queres aprender e o que podes ensinar: a descoberta só te mostra quem procura o que tens
  para dar.
· Procura por disciplina, curso e disponibilidade, e vê o perfil de quem está por trás de cada nome.
· Pede conexão a um mentor ou tutor. Só se fala depois de o pedido ser aceite.
· Marca sessões de apoio com data, hora e modalidade — presencial ou online.
· Troca mensagens e deixa os materiais da sessão na conversa, para não se perderem.
· Acompanha o que tens marcado: sessões agendadas, dadas e recebidas.
· Avalia a sessão no fim. A avaliação é anónima.

PARA QUEM É

Para estudantes e docentes do ISEC Lisboa. Entra-se com o email institucional —
@alunos.iseclisboa.pt ou @iseclisboa.pt —, e a conta só fica ativa depois de confirmares esse email.
Não há contas para pessoas de fora.

O QUE NÃO FAZ

Não é uma rede social: não tem publicações, nem seguidores, nem métricas de popularidade. Não recolhe
a tua localização e não pede acesso a contactos, câmara ou microfone. Não tem publicidade, não tem
compras dentro da app e não vende dados a ninguém.

EM PRIVACIDADE

Os dados são guardados no Firebase (Google) e as mensagens entre duas pessoas só são visíveis a
essas duas. O perfil (nome, fotografia, curso e interesses) é visível para quem tem sessão iniciada
na app. A política de privacidade completa está em: <URL DA POLÍTICA DE PRIVACIDADE>

Sem publicidade. Sem compras. Sem recolha de localização, contactos, câmara ou microfone.
```

E o formulário **Segurança dos dados** da Play Console (não é texto da descrição: é o inquérito
separado, e é onde as apps costumam mentir). Responde-se assim:

| categoria | o que se declara |
|---|---|
| Informações pessoais | nome e email — **recolhidos**, para gerir a conta; não partilhados; não vendidos |
| Fotos | fotografia de perfil — **recolhida**, para o perfil; visível a quem tem sessão iniciada |
| Mensagens | mensagens dentro da app — **recolhidas**, visíveis só a quem participa da conversa |
| Atividade na app | pedidos, sessões e avaliações — **recolhidos**; a avaliação é anónima por construção |
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
whoever needs support finds someone who has already been through the same course unit — students
ahead of them and lecturers — and books a session in two taps.

WHAT YOU CAN DO

· Say what you want to learn and what you can teach: discovery only shows you people looking for
  what you have to give.
· Search by subject, course and availability, and see the profile behind each name.
· Ask someone to connect. You only talk once the request is accepted.
· Book support sessions with a date, time and mode — in person or online.
· Exchange messages and keep the session materials in the conversation.
· Track what you have booked: scheduled, given and received sessions.
· Rate the session at the end. Ratings are anonymous.

WHO IT IS FOR

For students and lecturers at ISEC Lisboa. You sign in with your institutional email —
@alunos.iseclisboa.pt or @iseclisboa.pt — and the account only becomes active after you confirm
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
por link. Não é possível criar conta em revisão, por isso deixamos uma conta de demonstração já
confirmada e com perfil completo:

  email:    revisao@alunos.iseclisboa.pt
  palavra-passe: <a que ficar escrita aqui>

Como chegar a tudo o que a app faz, a partir dessa conta:

1. Início — o resumo da atividade e os atalhos.
2. Match — a lista de pessoas compatíveis; tocar num perfil mostra os detalhes e o botão de bloquear.
3. Chat — as conversas com quem está ligado, com os materiais partilhados.
4. Perfil — os dados da conta e as estatísticas de sessões; a roda dentada abre as Definições.
5. Perfil → Definições → Apagar conta — o caminho de eliminação de conta (diretriz 5.1.1(v)).
   Pede a palavra-passe antes de apagar, ou seja, a conta de demonstração pode ser usada para o
   fluxo todo sem ficar inutilizável (basta não confirmar o último passo).

Não há compras dentro da app e não há recolha de localização, contactos, câmara ou microfone.
```

**E a classificação etária:** no questionário da Apple e no IARC da Play, a app não tem conteúdo
gerado publicamente, nem jogos, nem publicidade — a única coisa a declarar é a **comunicação entre
utilizadores** (mensagens privadas entre duas pessoas que aceitaram ligar-se) e os **dados do
utilizador** (nome, fotografia, email). Responde-se, e não se declara "sem interação": é
exatamente esse o campo em que estas apps são apanhadas a mentir.

## Datas do lado da Play

Se a conta de programador for **pessoal** (criada depois de novembro de 2023), a produção só abre
depois de um teste fechado com **12 testadores durante 14 dias** — ou seja, há duas semanas entre o
primeiro `.aab` e o público, e os testadores têm de aceitar o convite. Contas de **organização**
(ISEC) não têm este requisito. Vale a pena confirmar qual é antes de contar com uma data.
