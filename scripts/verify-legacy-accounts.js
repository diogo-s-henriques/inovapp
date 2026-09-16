#!/usr/bin/env node

/**
 * Confirma, à mão, as contas que já existiam antes de a app passar a exigir confirmação de email.
 *
 * A partir do momento em que as regras passam a exigir `email_verified` (ver `isVerified()` em
 * firestore.rules), quem já tinha conta e nunca confirmou nada **deixa de conseguir ler ou
 * escrever** — e isso é a intenção: um email institucional que ninguém provou ser seu não devia
 * estar a ver o perfil de ninguém. O caminho normal para ficar bem é abrir o link que o Firebase
 * mandou ao email (o ecrã da confirmação reenvia-o).
 *
 * Este script existe para o caso em que esse caminho não chega: contas antigas cujo email já não
 * se recebe (quem saiu da escola, um endereço que foi mudado de dono) ou um filtro de spam que
 * engole tudo o que vem do Firebase. Aqui, quem decide é uma pessoa, conta a conta.
 *
 * **Isto não é um perdão geral.** É o contrário de uma tolerância escrita nas regras: uma regra do
 * tipo "enquanto ninguém confirmar, deixa passar" valia também para as contas **novas** (bastava
 * não confirmar), e é isso que a confirmação existe para travar. Aqui o que se faz é marcar como
 * confirmadas as contas que **já existiam**, uma vez, com quem as conhece à frente.
 *
 * Uso:
 *   # 1. Consola Firebase > Definições do projeto > Contas de serviço > Gerar nova chave privada
 *   export GOOGLE_APPLICATION_CREDENTIALS=/caminho/para/chave.json
 *   # 2. Ver quem está por confirmar (não escreve nada):
 *   npm run verify:legacy-accounts
 *   # 3. Confirmar uma conta de cada vez (o mais seguro):
 *   npm run verify:legacy-accounts -- --apply --email=alguem@iseclisboa.pt
 *   # 4. Ou todas as que faltam, de uma vez:
 *   npm run verify:legacy-accounts -- --apply
 *
 * Nota: o `firebase-admin` passa por cima das regras de segurança — é por isso que só corre à mão.
 * Se a chave não ficar no computador (boa prática), apaga-a no fim.
 */
const fs = require('fs');
const path = require('path');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

function getProjectId() {
  const firebasercPath = path.join(__dirname, '..', '.firebaserc');
  return JSON.parse(fs.readFileSync(firebasercPath, 'utf8')).projects.default;
}

/** Todas as contas do Auth, já paginadas (o `listUsers` devolve 1000 de cada vez). */
async function listarTodasAsContas(auth) {
  const contas = [];
  let pagina = await auth.listUsers(1000);

  for (;;) {
    contas.push(...pagina.users);
    if (!pagina.pageToken) return contas;
    pagina = await auth.listUsers(1000, pagina.pageToken);
  }
}

function formatarData(conta) {
  const milissegundos = conta.metadata?.creationTime ? Date.parse(conta.metadata.creationTime) : NaN;
  return Number.isNaN(milissegundos) ? '(sem data)' : new Date(milissegundos).toISOString().slice(0, 10);
}

async function main() {
  const apply = process.argv.includes('--apply');
  const emailArgumento = process.argv.find((argumento) => argumento.startsWith('--email='));
  const emailAlvo = emailArgumento ? emailArgumento.split('=')[1].trim().toLowerCase() : null;

  const projectId = getProjectId();
  initializeApp({ projectId });
  const auth = getAuth();

  const contas = await listarTodasAsContas(auth);
  const porConfirmar = contas.filter((conta) => !conta.emailVerified);
  const alvo = emailAlvo ? porConfirmar.filter((conta) => (conta.email ?? '').toLowerCase() === emailAlvo) : porConfirmar;

  console.log(`Projeto ${projectId} · ${contas.length} contas · ${porConfirmar.length} por confirmar`);

  if (emailAlvo && alvo.length === 0) {
    console.log(`Nada a fazer: ${emailAlvo} não está por confirmar (ou não existe).`);
    return;
  }

  for (const conta of alvo) {
    console.log(`  ${conta.email ?? '(sem email)'} · criada em ${formatarData(conta)} · ${conta.uid}`);
  }

  if (!apply) {
    console.log('\nNada foi escrito. Corre outra vez com --apply para confirmar estas contas.');
    return;
  }

  for (const conta of alvo) {
    // `emailVerified: true` é o que o link do Firebase faria ao ser aberto — a diferença é quem
    // decide, e é por isso que este script é à mão e não automático.
    await auth.updateUser(conta.uid, { emailVerified: true });
    console.log(`✔ ${conta.email ?? conta.uid} confirmado`);
  }

  console.log(
    `\n${alvo.length} conta(s) confirmadas. O token em uso nos aparelhos dessas pessoas continua a dizer ` +
      '`email_verified: false` até ser renovado (até 1 hora, ou imediatamente se voltarem a entrar).',
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
