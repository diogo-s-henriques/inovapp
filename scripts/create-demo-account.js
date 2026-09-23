#!/usr/bin/env node

/**
 * Cria a **conta de demonstração**.
 *
 * O registo é aberto a qualquer email, mas a conta só fica ativa depois de confirmar esse email (ver
 * firestore.rules, `isVerified()`) - e um revisor não vai ler a caixa de correio de um endereço que
 * inventou na hora. Se não lhe dermos credenciais, a revisão é recusada com a diretriz 2.1 ("a app
 * pede autenticação e não foram fornecidas credenciais de demonstração"). É este script que faz essa conta, e fá-la
 * com o email **já confirmado** e o perfil **já completo**, para o revisor ver a app e não o
 * assistente de configuração.
 *
 * **Isto escreve em produção**, por cima das regras (o Admin SDK não lhes obedece) - daí ser
 * `--apply` explícito, como o `verify:legacy-accounts`. O script é idempotente: corrido duas vezes,
 * confirma a conta outra vez, repõe a palavra-passe e volta a escrever o perfil.
 *
 * Uso (a chave aceita-se de duas maneiras, porque quem corre isto tanto está em bash como em
 * PowerShell - e em PowerShell um `export` do bash simplesmente não existe):
 *   # 1. Consola Firebase > Definições do projeto > Contas de serviço > Gerar nova chave privada
 *   # 2a. Pelo ambiente:
 *   export GOOGLE_APPLICATION_CREDENTIALS=/caminho/para/chave.json        (bash)
 *   $env:GOOGLE_APPLICATION_CREDENTIALS="C:\caminho\para\chave.json"     (PowerShell)
 *   # 2b. Ou sem mexer no ambiente:
 *   npm run create:demo-account -- --apply --key=C:\caminho\para\chave.json
 *   # 3. Ver o que faria (não escreve nada, e nem precisa da chave):
 *   npm run create:demo-account
 *   # 4. Criar mesmo (a palavra-passe é a que o revisor vai escrever):
 *   npm run create:demo-account -- --apply --password=Inovapp-Demo-2026!
 *
 * O `--email` só é preciso para fazer uma segunda conta (ex.: uma de aluno, que vê o deck de
 * descoberta que um Tutor não vê). O papel deriva do domínio, como em src/constants/auth.ts - um
 * @iseclisboa.pt é Tutor, e **qualquer outro endereço é Tutorando**, que é o papel por omissão
 * desde que o registo abriu. E o modo de participação segue a regra da app: um docente ensina
 * (`teach`), porque é isso que o assistente de perfil escreve para ele (ver src/app/profile-setup.tsx).
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { cert, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { FieldValue, getFirestore } = require('firebase-admin/firestore');

const EMAIL_PADRAO = 'demo@iseclisboa.pt';
const NOME_PADRAO = 'Conta de Demonstração';

function getProjectId() {
  const firebasercPath = path.join(__dirname, '..', '.firebaserc');
  return JSON.parse(fs.readFileSync(firebasercPath, 'utf8')).projects.default;
}

/**
 * O mesmo que a app decide (ver `getAccountRole` em src/constants/auth.ts): só o **docente** é que o
 * domínio decide. Qualquer outro endereço é aluno, e é isso que o apresenta à revisão como uma app
 * aberta a quem quiser - era a restrição de domínio que a Apple recusava na diretriz 3.2 (ver
 * STORE.md).
 */
function papelDoEmail(email) {
  return /^[^@]+@iseclisboa\.pt$/i.test(email) ? 'professor' : 'student';
}

function argumento(nome) {
  const encontrado = process.argv.find((candidate) => candidate.startsWith(`--${nome}=`));
  return encontrado ? encontrado.slice(nome.length + 3) : null;
}

/**
 * O caminho da chave de serviço, ou `null`.
 *
 * Sem chave, o Admin SDK cai nas credenciais por omissão do Google - que num computador de
 * desenvolvimento não existem, e o erro que ele dá nesse caso («Could not load the default
 * credentials») fala de um ficheiro que ninguém sabe onde pôr. Daí este caminho ser lido **aqui**,
 * para o script poder dizer o que falta e como se resolve.
 */
function caminhoDaChave() {
  const caminho = argumento('key') ?? process.env.GOOGLE_APPLICATION_CREDENTIALS ?? null;
  return caminho && caminho.trim().length > 0 ? caminho.trim() : null;
}

function ensinarCredenciais() {
  return [
    'Não encontrei credenciais de administrador, e esta operação escreve em produção por cima das regras.',
    'A chave de serviço tira-se da consola: Definições do projeto > Contas de serviço > Gerar nova chave privada.',
    'Depois, uma destas:',
    '',
    '  bash        export GOOGLE_APPLICATION_CREDENTIALS=/caminho/para/chave.json',
    '  PowerShell  $env:GOOGLE_APPLICATION_CREDENTIALS="C:\\caminho\\para\\chave.json"',
    '  ou aqui     npm run create:demo-account -- --apply --key=C:\\caminho\\para\\chave.json',
  ].join('\n');
}

/** Uma palavra-passe que passa nas políticas do projeto sem ninguém ter de a inventar. */
function gerarPalavraPasse() {
  return `Inovapp-${crypto.randomBytes(6).toString('base64url')}1!`;
}

/**
 * O perfil que a app desenha: os mesmos campos que `completeProfileSetup` escreve (ver
 * src/types/profile.ts), com o `profileCompleted: true` que faz a app saltar o assistente.
 */
function perfil(email, papel, nome, modo, disciplinas) {
  const [firstName, ...resto] = nome.trim().split(' ');
  const ensina = modo === 'teach' || modo === 'both';
  const aprende = modo === 'learn' || modo === 'both';

  return {
    role: papel,
    profileCompleted: true,
    fullName: `${firstName}${resto.length > 0 ? ` ${resto.join(' ')}` : ''}`,
    // O `about` aparece **dentro da app** (o cartão da descoberta e o perfil), e o revisor lê-o.
    // Nomear as lojas aqui foi o que fez a revisão da 1.0 (10) tropeçar na diretriz 2.3.10
    // ("information about third-party platforms"): um texto de bastidores não tem nada que fazer
    // à frente de quem usa a app. Fica a dizer o mesmo sem nomear plataforma nenhuma.
    about: 'Perfil de demonstração da INOVAPP. Ensina Programação e Matemática a quem precisa.',
    // Um docente não tem curso nem ano (a app mostra "Docente ISEC Lisboa" no lugar disso).
    ...(papel === 'student' ? { course: { type: 'Licenciatura', name: 'Engenharia Informática' }, year: '3º ano' } : {}),
    participationMode: modo,
    teachingSubjects: ensina ? disciplinas : [],
    learningSubjects: aprende ? ['Inglês'] : [],
    availabilityPeriods: ['Tardes'],
    availabilityModality: ['Ambos'],
  };
}

async function main() {
  const apply = process.argv.includes('--apply');
  const email = (argumento('email') ?? EMAIL_PADRAO).trim().toLowerCase();
  const nome = argumento('name') ?? NOME_PADRAO;
  const disciplinas = (argumento('subjects') ?? 'Programação,Matemática').split(',').map((s) => s.trim());

  const papel = papelDoEmail(email);

  // Um docente ensina, sempre: é o que a app escreve para ele. Um aluno pode aprender, ensinar ou
  // as duas coisas - e o modo 'both' é o que dá a um revisor o deck de descoberta inteiro.
  const modo = papel === 'professor' ? 'teach' : (argumento('mode') ?? 'both');
  const palavraPasse = argumento('password') ?? gerarPalavraPasse();
  const passouAPalavraPasse = argumento('password') !== null;

  const projectId = getProjectId();
  const chave = caminhoDaChave();
  const temChave = chave !== null && fs.existsSync(chave);

  initializeApp(temChave ? { projectId, credential: cert(require(path.resolve(chave))) } : { projectId });
  const auth = getAuth();
  const db = getFirestore();

  let conta;
  let criada = false;
  try {
    conta = await auth.getUserByEmail(email);
  } catch {
    conta = null;
  }

  const dados = perfil(email, papel, nome, modo, disciplinas);

  console.log(`Projeto ${projectId}`);
  console.log(`  email      ${email}`);
  console.log(`  papel      ${papel} · modo ${modo}`);
  console.log(`  nome       ${dados.fullName}`);
  console.log(`  ensina     ${dados.teachingSubjects.join(', ') || '(nada)'}`);
  console.log(`  aprende    ${dados.learningSubjects.join(', ') || '(nada)'}`);
  console.log(`  conta      ${conta ? `já existe (${conta.uid}) - será atualizada` : 'nova'}`);

  if (!apply) {
    console.log('\nNada foi escrito. Corre outra vez com --apply (e com a palavra-passe que quiseres).');
    if (!passouAPalavraPasse) console.log(`Palavra-passe sugerida: ${palavraPasse}`);
    return;
  }

  // Antes de escrever, e não a meio: o erro do SDK para uma chave em falta não diz o que fazer.
  if (!temChave) {
    console.error(`\n${ensinarCredenciais()}`);
    process.exit(1);
  }

  if (conta) {
    await auth.updateUser(conta.uid, {
      emailVerified: true,
      password: palavraPasse,
      displayName: dados.fullName,
    });
  } else {
    conta = await auth.createUser({
      email,
      emailVerified: true,
      password: palavraPasse,
      displayName: dados.fullName,
    });
    criada = true;
  }

  // Os dois documentos da conta, como o registo os cria (ver `signUp` em src/auth/actions.ts): o
  // perfil visível à comunidade e os dados privados. O `createdAt` só na primeira vez - reescrevê-lo
  // a cada corrida fazia a conta parecer nova de cada vez que o script fosse corrido.
  await db
    .doc(`users/${conta.uid}`)
    .set({ ...dados, ...(criada ? { createdAt: FieldValue.serverTimestamp() } : {}) }, { merge: true });

  await db
    .doc(`userAccounts/${conta.uid}`)
    .set(
      {
        email,
        role: papel,
        lastLoginAt: FieldValue.serverTimestamp(),
        rememberSession: false,
      },
      { merge: true },
    );

  console.log(`\n✔ ${criada ? 'Conta criada' : 'Conta atualizada'}: ${email} (${conta.uid})`);
  console.log(`  email confirmado: sim · perfil completo: sim`);
  console.log(`  palavra-passe: ${passouAPalavraPasse ? 'a que foi passada em --password' : palavraPasse}`);
  console.log(
    '\nFalta pôr as credenciais onde os revisores as vão ler (não ficam no repositório):' +
      '\n  · App Store Connect → a versão → App Review Information → Sign-in required' +
      '\n  · Play Console → App content → App access → All functionality is available without special access: não' +
      '\n\nE lembrar que esta conta aparece na descoberta como qualquer outra - apaga-a quando a revisão acabar.',
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
