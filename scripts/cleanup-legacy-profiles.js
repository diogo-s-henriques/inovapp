#!/usr/bin/env node

/**
 * Migração pontual: tira do perfil público os dados privados que ainda lá estejam.
 *
 * Antes da separação entre `users` (perfil visível a toda a comunidade autenticada) e
 * `userAccounts` (dados privados da conta), o documento do perfil guardava o `email`, a última
 * entrada (`lastLoginAt`) e o `rememberSession` - legíveis por qualquer utilizador autenticado.
 *
 * A app já se limpa sozinha no login seguinte (ver src/auth/actions.ts), mas quem nunca mais
 * entrar fica com esses dados expostos. Este script trata dessas contas de uma vez: copia para
 * `userAccounts` o que ainda não esteja lá e remove os campos privados do perfil.
 *
 * Uso:
 *   # 1. Consola Firebase > Definições do projeto > Contas de serviço > Gerar nova chave privada
 *   export GOOGLE_APPLICATION_CREDENTIALS=/caminho/para/chave.json
 *   # 2. Ver o que seria feito (não escreve nada):
 *   npm run cleanup:legacy-profiles
 *   # 3. Aplicar:
 *   npm run cleanup:legacy-profiles -- --apply
 *
 * Para experimentar sem tocar em dados reais, corre contra o emulador (não precisa de chave,
 * porque não se autentica contra a nuvem):
 *   npx firebase-tools emulators:exec --only firestore "node scripts/cleanup-legacy-profiles.js --apply"
 *
 * Nota: se a chave não ficar no computador (boa prática), apaga-a no fim. O script usa o
 * firebase-admin, que passa por cima das regras de segurança - é por isso que só corre à mão.
 *
 * O firebase-admin v14 já não expõe a API de namespace (`admin.firestore()`), daí os imports
 * por subpath (`firebase-admin/firestore`).
 */
const fs = require('fs');
const path = require('path');
const { initializeApp } = require('firebase-admin/app');
const { FieldValue, getFirestore } = require('firebase-admin/firestore');

const PRIVATE_FIELDS = ['email', 'lastLoginAt', 'rememberSession'];

function getProjectId() {
  const firebasercPath = path.join(__dirname, '..', '.firebaserc');
  return JSON.parse(fs.readFileSync(firebasercPath, 'utf8')).projects.default;
}

/**
 * O que há para copiar do perfil para o documento privado: só os campos que ainda não existem
 * lá. O valor em `userAccounts` é sempre o mais recente (é lá que a app escreve a cada login),
 * por isso nunca se sobrepõe. Devolve o objecto a gravar (vazio se não há nada a copiar).
 */
function privateFieldsToMigrate(profile, account) {
  const toMigrate = {};

  if (profile.email !== undefined && account.email === undefined) {
    toMigrate.email = profile.email;
  }
  if (profile.role !== undefined && account.role === undefined) {
    toMigrate.role = profile.role;
  }
  if (profile.lastLoginAt !== undefined && account.lastLoginAt === undefined) {
    toMigrate.lastLoginAt = profile.lastLoginAt;
  }
  if (profile.rememberSession !== undefined && account.rememberSession === undefined) {
    toMigrate.rememberSession = profile.rememberSession === true;
  }

  return toMigrate;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const projectId = getProjectId();
  const usingEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

  if (!usingEmulator && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error('Falta a credencial da conta de serviço.');
    console.error('Consola Firebase > Definições do projeto > Contas de serviço > Gerar nova chave privada,');
    console.error('e depois: GOOGLE_APPLICATION_CREDENTIALS=/caminho/para/chave.json npm run cleanup:legacy-profiles');
    process.exit(1);
  }

  initializeApp({ projectId });
  const db = getFirestore();

  console.log(
    `Projeto: ${projectId}${usingEmulator ? ` (emulador ${process.env.FIRESTORE_EMULATOR_HOST})` : ''}`,
  );
  console.log(apply ? 'Modo: aplicar alterações.' : 'Modo: simulação (nada será escrito).');

  // A coleção `users` é pequena (uma pessoa por conta) - uma leitura só é aceitável aqui.
  const snapshot = await db.collection('users').get();

  let encontrados = 0;
  let contasCriadas = 0;
  let contasCompletadas = 0;

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const legado = PRIVATE_FIELDS.filter((field) => data[field] !== undefined);
    if (legado.length === 0) continue;

    const accountRef = db.collection('userAccounts').doc(docSnap.id);
    const accountSnap = await accountRef.get();
    const aMigrar = privateFieldsToMigrate(data, accountSnap.data() ?? {});
    const camposAMigrar = Object.keys(aMigrar);

    encontrados += 1;
    console.log(`\n${docSnap.id} - ${data.email ?? 'sem email no perfil'}`);
    console.log(`  campos privados a remover do perfil: ${legado.join(', ')}`);
    if (!accountSnap.exists) {
      console.log(`  -> cria userAccounts (${camposAMigrar.join(', ') || 'sem campos a copiar'})`);
      contasCriadas += 1;
    } else if (camposAMigrar.length > 0) {
      console.log(`  -> userAccounts já existe; completa com: ${camposAMigrar.join(', ')}`);
      contasCompletadas += 1;
    } else {
      console.log('  -> userAccounts já tem tudo o que é preciso');
    }

    if (!apply) continue;

    const batch = db.batch();
    // Só grava se houver mesmo algo a copiar: assim o documento privado nunca é criado vazio.
    if (camposAMigrar.length > 0) {
      batch.set(accountRef, aMigrar, { merge: true });
    }
    // Os campos só saem do perfil depois de garantidamente copiados acima (ou de já existirem
    // no documento privado) - nenhum dado privado se perde nesta migração.
    batch.update(
      docSnap.ref,
      Object.fromEntries(legado.map((field) => [field, FieldValue.delete()])),
    );
    await batch.commit();
  }

  console.log('');
  if (encontrados === 0) {
    console.log('Nada a fazer: nenhum perfil tem dados privados guardados.');
    return;
  }

  if (apply) {
    console.log(
      `Perfis limpos: ${encontrados} (contas criadas: ${contasCriadas}, completadas: ${contasCompletadas}).`,
    );
  } else {
    console.log(
      `Perfis a limpar: ${encontrados} (contas a criar: ${contasCriadas}, a completar: ${contasCompletadas}).`,
    );
    console.log('Nada foi escrito - corre outra vez com --apply.');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
