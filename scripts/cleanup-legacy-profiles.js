#!/usr/bin/env node

/**
 * Migração pontual: tira do perfil público os dados privados que ainda lá estejam.
 *
 * Antes da separação entre `users` (perfil visível a toda a comunidade autenticada) e
 * `userAccounts` (dados privados da conta), o documento do perfil guardava o `email`, a última
 * entrada (`lastLoginAt`) e o `rememberSession` — legíveis por qualquer utilizador autenticado.
 *
 * A app já se limpa sozinha no login seguinte (ver src/auth/actions.ts), mas quem nunca mais
 * entrar fica com esses dados expostos. Este script trata dessas contas de uma vez: cria o
 * documento em `userAccounts` com o que encontrar e remove os campos privados do perfil.
 *
 * Uso:
 *   # 1. Consola Firebase > Definições do projeto > Contas de serviço > Gerar nova chave privada
 *   export GOOGLE_APPLICATION_CREDENTIALS=/caminho/para/chave.json
 *   # 2. Ver o que seria feito (não escreve nada):
 *   npm run cleanup:legacy-profiles
 *   # 3. Aplicar:
 *   npm run cleanup:legacy-profiles -- --apply
 *
 * Nota: se a chave não ficar no computador (boa prática), apaga-a no fim. O script usa o
 * firebase-admin, que passa por cima das regras de segurança — é por isso que só corre à mão.
 */
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const PRIVATE_FIELDS = ['email', 'lastLoginAt', 'rememberSession'];

function getProjectId() {
  const firebasercPath = path.join(__dirname, '..', '.firebaserc');
  return JSON.parse(fs.readFileSync(firebasercPath, 'utf8')).projects.default;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const projectId = getProjectId();

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error('Falta a credencial da conta de serviço.');
    console.error('Consola Firebase > Definições do projeto > Contas de serviço > Gerar nova chave privada,');
    console.error('e depois: GOOGLE_APPLICATION_CREDENTIALS=/caminho/para/chave.json npm run cleanup:legacy-profiles');
    process.exit(1);
  }

  admin.initializeApp({ projectId });
  const db = admin.firestore();

  // A coleção `users` é pequena (uma pessoa por conta) — uma leitura só é aceitável aqui.
  const snapshot = await db.collection('users').get();

  let encontrados = 0;
  let contasMigradas = 0;

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const legado = PRIVATE_FIELDS.filter((field) => data[field] !== undefined);
    if (legado.length === 0) continue;

    const accountRef = db.collection('userAccounts').doc(docSnap.id);
    const contaExiste = (await accountRef.get()).exists;
    const criarConta = !contaExiste && !!data.email;

    encontrados += 1;
    console.log(`\n${docSnap.id} — ${data.email ?? 'sem email no perfil'}`);
    console.log(`  campos privados a remover do perfil: ${legado.join(', ')}`);
    console.log(criarConta ? '  -> cria userAccounts com estes dados' : '  -> userAccounts já existe (ou não há email)');

    if (!apply) continue;

    const batch = db.batch();
    if (criarConta) {
      batch.set(accountRef, {
        email: data.email,
        role: data.role ?? null,
        lastLoginAt: data.lastLoginAt ?? null,
        rememberSession: data.rememberSession === true,
      });
      contasMigradas += 1;
    }

    batch.update(
      docSnap.ref,
      Object.fromEntries(legado.map((field) => [field, admin.firestore.FieldValue.delete()])),
    );
    await batch.commit();
  }

  console.log('');
  if (encontrados === 0) {
    console.log('Nada a fazer: nenhum perfil tem dados privados guardados.');
    return;
  }

  if (apply) {
    console.log(`Perfis limpos: ${encontrados} (contas criadas em userAccounts: ${contasMigradas}).`);
  } else {
    console.log(`Perfis a limpar: ${encontrados}. Nada foi escrito — corre outra vez com --apply.`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
