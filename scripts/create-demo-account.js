#!/usr/bin/env node

/**
 * Cria a **conta de demonstração** que a revisão da Apple e a da Google usam.
 *
 * A app só entra com email institucional, e a conta só fica ativa depois de confirmar esse email
 * (ver firestore.rules, `isVerified()`). Um revisor não tem email do ISEC e não recebe link nenhum —
 * se não lhe dermos credenciais, a revisão é recusada com a diretriz 2.1 ("a app pede autenticação
 * e não foram fornecidas credenciais de demonstração"). É este script que faz essa conta, e fá-la
 * com o email **já confirmado** e o perfil **já completo**, para o revisor ver a app e não o
 * assistente de configuração.
 *
 * **Isto escreve em produção**, por cima das regras (o Admin SDK não lhes obedece) — daí ser
 * `--apply` explícito, como o `verify:legacy-accounts`. O script é idempotente: corrido duas vezes,
 * confirma a conta outra vez, repõe a palavra-passe e volta a escrever o perfil.
 *
 * Uso:
 *   # 1. Consola Firebase > Definições do projeto > Contas de serviço > Gerar nova chave privada
 *   export GOOGLE_APPLICATION_CREDENTIALS=/caminho/para/chave.json
 *   # 2. Ver o que faria (não escreve nada):
 *   npm run create:demo-account
 *   # 3. Criar mesmo (o email é o pedido; a palavra-passe é a que o revisor vai escrever):
 *   npm run create:demo-account -- --apply --password=Inovapp-Demo-2026!
 *
 * O `--email` só é preciso para fazer uma segunda conta (ex.: uma de aluno, que vê o deck de
 * descoberta que um Tutor não vê). O papel deriva do domínio, como em src/constants/auth.ts — um
 * endereço @alunos.iseclisboa.pt é Tutorando, um @iseclisboa.pt é Tutor. E o modo de participação
 * segue a regra da app: um docente ensina (`teach`), porque é isso que o assistente de perfil
 * escreve para ele (ver src/app/profile-setup.tsx).
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { FieldValue, getFirestore } = require('firebase-admin/firestore');

const EMAIL_PADRAO = 'demo@iseclisboa.pt';
const NOME_PADRAO = 'Conta de Demonstração';

function getProjectId() {
  const firebasercPath = path.join(__dirname, '..', '.firebaserc');
  return JSON.parse(fs.readFileSync(firebasercPath, 'utf8')).projects.default;
}

/** O mesmo que as regras do Firestore exigem: o papel vem do domínio, nunca de uma escolha. */
function papelDoEmail(email) {
  if (/^[^@]+@alunos\.iseclisboa\.pt$/i.test(email)) return 'student';
  if (/^[^@]+@iseclisboa\.pt$/i.test(email)) return 'professor';
  return null;
}

function argumento(nome) {
  const encontrado = process.argv.find((candidate) => candidate.startsWith(`--${nome}=`));
  return encontrado ? encontrado.slice(nome.length + 3) : null;
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
    about: 'Conta de demonstração para revisão da App Store e da Google Play.',
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
  if (!papel) {
    console.error(`"${email}" não é um email institucional (@alunos.iseclisboa.pt ou @iseclisboa.pt).`);
    process.exit(1);
  }

  // Um docente ensina, sempre: é o que a app escreve para ele. Um aluno pode aprender, ensinar ou
  // as duas coisas — e o modo 'both' é o que dá a um revisor o deck de descoberta inteiro.
  const modo = papel === 'professor' ? 'teach' : (argumento('mode') ?? 'both');
  const palavraPasse = argumento('password') ?? gerarPalavraPasse();
  const passouAPalavraPasse = argumento('password') !== null;

  const projectId = getProjectId();
  initializeApp({ projectId });
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
  console.log(`  conta      ${conta ? `já existe (${conta.uid}) — será atualizada` : 'nova'}`);

  if (!apply) {
    console.log('\nNada foi escrito. Corre outra vez com --apply (e com a palavra-passe que quiseres).');
    if (!passouAPalavraPasse) console.log(`Palavra-passe sugerida: ${palavraPasse}`);
    return;
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
  // perfil visível à comunidade e os dados privados. O `createdAt` só na primeira vez — reescrevê-lo
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
      '\n\nE lembrar que esta conta aparece na descoberta como qualquer outra — apaga-a quando a revisão acabar.',
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
