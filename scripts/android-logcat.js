#!/usr/bin/env node

/**
 * Apanha a causa de um crash no telemóvel Android.
 *
 * Existe por causa de um sintoma que não deixa rasto: quando o Expo Go **fecha** (em vez de mostrar
 * o ecrã vermelho), não é um erro de JavaScript — é o processo a morrer, e sem log não há nada a
 * que agarrar. O que mata a app aparece no `logcat` do Android, em duas formas:
 *
 *   - exceção de Java/Kotlin (`FATAL EXCEPTION` + stack trace, no buffer `crash`);
 *   - crash nativo (`Fatal signal`, `Abort message`, o cabeçalho `*** *** ***`).
 *
 * Este script limpa o buffer, espera que o reproduzas e depois lê o que ficou lá, destacando as
 * linhas que interessam. O dump completo é guardado em ficheiro, porque o contexto à volta da
 * linha que mata importa tanto como a linha.
 *
 * Uso:
 *   npm run logcat                # 30 segundos de captura
 *   npm run logcat -- --seconds=60
 *   npm run logcat -- --app       # só as linhas da app, para um log mais limpo
 *
 * Antes disto, no telemóvel: Definições > Opções de programador > Depuração USB ligada, e ligá-lo
 * por cabo. O `adb` está fora do projeto (ver a secção "Android" do README) — este script
 * encontra-o em três sítios: a variável `ADB`, o PATH, ou a pasta onde este projeto o instalou.
 */
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const EXPO_GO_PACKAGE = 'host.exp.exponent';
const DEFAULT_SECONDS = 30;

/**
 * Onde procurar o `adb`: primeiro o que o utilizador apontar, depois o PATH, e por fim o sítio
 * onde as platform-tools foram instaladas (não está no PATH por omissão). `.exe` só faz sentido
 * no Windows, mas a tentativa não custa nada nos outros sistemas.
 */
function findAdb() {
  const candidates = [
    process.env.ADB,
    'adb',
    path.join(os.homedir(), 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb'),
    path.join(os.homedir(), 'Android', 'Sdk', 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb'),
  ].filter(Boolean);

  for (const candidate of candidates) {
    // `version` é inofensivo e é a forma mais barata de saber se o caminho serve.
    const result = spawnSync(candidate, ['version'], { encoding: 'utf8' });
    if (!result.error && result.status === 0) return candidate;
  }
  return null;
}

function adbText(adb, args) {
  const result = spawnSync(adb, args, { encoding: 'utf8' });
  return result.status === 0 ? result.stdout : null;
}

/** O telemóvel tem de estar "device" (e não "unauthorized" nem "offline") para o logcat servir. */
function findConnectedDevice(adb) {
  const output = adbText(adb, ['devices']);
  if (!output) return { state: 'erro', serial: null };

  const lines = output.split('\n').slice(1).map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return { state: 'nenhum', serial: null };

  const [serial, state] = lines[0].split(/\s+/);
  return { state, serial };
}

/**
 * O formato de uma linha com `-v time`, com o nível (V/D/I/W/E/F) e o tag à parte:
 *   09-14 15:22:02.001  5678  5678 E AndroidRuntime: FATAL EXCEPTION: main
 */
const LINE_TAG = /^\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d{3}\s+\d+\s+\d+\s+([VDIWEF])\s+(\S+?)\s*:/;

/**
 * Agrupar pelo **tag**, não pelo texto da linha. A diferença é o que faz este script servir: um
 * stack trace de Java são dezenas de linhas seguidas com o tag `AndroidRuntime`, e filtrar pelo
 * conteúdo deixaria só a primeira (`FATAL EXCEPTION`) — ou seja, guardaria a notícia de que houve
 * crash e deitaria fora *onde* rebentou, que é a única parte útil.
 */
const TAG_RULES = [
  { tag: 'AndroidRuntime', label: 'EXCEÇÃO DE JAVA' },
  // O tombstone de um crash nativo tem o tag `DEBUG` e nível F ("F DEBUG   :"); o tag sozinho
  // também apanha linhas de debug inocentes, por isso o nível faz parte da regra.
  { tag: 'DEBUG', level: 'F', label: 'CRASH NATIVO' },
  { tag: 'ReactNativeJS', label: 'JAVASCRIPT' },
  { tag: 'ReactNative', label: 'JAVASCRIPT' },
  { tag: 'ExpoModulesCore', label: 'JAVASCRIPT' },
  { tag: 'Worklets', label: 'WORKLETS/REANIMATED' },
  { tag: 'Reanimated', label: 'WORKLETS/REANIMATED' },
  { tag: 'ExpoGo', label: 'APP' },
  { tag: 'Exponent', label: 'APP' },
];

/** Sinais que valem por si, mesmo numa linha sem tag reconhecido (ou sem tag nenhum). */
const PATTERNS = [
  { label: 'CRASH NATIVO', regex: /Fatal signal|Abort message|\*\*\* \*\*\* \*\*\*/ },
  { label: 'EXCEÇÃO DE JAVA', regex: /FATAL EXCEPTION|AndroidRuntime/ },
  { label: 'ERRO NATIVO', regex: /UnsatisfiedLinkError|NoSuchMethodError|NoClassDefFoundError|ClassNotFoundException/ },
  { label: 'SEM MEMÓRIA', regex: /OutOfMemoryError|lowmemorykiller|\bLMK\b/ },
  { label: 'JAVASCRIPT', regex: /ReactNativeJS|ExpoModulesCore|Hermes/ },
  { label: 'APP', regex: /host\.exp\.exponent|ExpoGo|Exponent/ },
  { label: 'WORKLETS/REANIMATED', regex: /Worklets|Reanimated/ },
];

/** Ordem de apresentação — o que mata a app primeiro, o ruído da app no fim. */
const LABEL_ORDER = [
  'CRASH NATIVO',
  'ERRO NATIVO',
  'EXCEÇÃO DE JAVA',
  'SEM MEMÓRIA',
  'WORKLETS/REANIMATED',
  'JAVASCRIPT',
  'APP',
];

function classify(line) {
  const match = line.match(LINE_TAG);
  if (match) {
    const [, level, tag] = match;
    for (const rule of TAG_RULES) {
      if (rule.tag === tag && (!rule.level || rule.level === level)) return rule.label;
    }
  }

  // Sem tag reconhecido, vale o conteúdo — é o caso das linhas sem o cabeçalho `-v time`.
  for (const pattern of PATTERNS) {
    if (pattern.regex.test(line)) return pattern.label;
  }
  return null;
}

async function main() {
  const args = process.argv.slice(2);
  const secondsArg = args.find((arg) => arg.startsWith('--seconds='));
  const seconds = secondsArg ? Number(secondsArg.split('=')[1]) : DEFAULT_SECONDS;
  const onlyApp = args.includes('--app');

  if (!Number.isFinite(seconds) || seconds <= 0) {
    console.error('--seconds tem de ser um número de segundos maior que zero.');
    process.exit(1);
  }

  const adb = findAdb();
  if (!adb) {
    console.error('Não encontrei o `adb`.');
    console.error('Instala as platform-tools do Android e diz onde estão: ADB=/caminho/para/adb npm run logcat');
    process.exit(1);
  }

  const device = findConnectedDevice(adb);
  if (device.state === 'nenhum') {
    console.error('Nenhum telemóvel ligado.');
    console.error('Liga-o por cabo USB e liga a "Depuração USB" nas Opções de programador.');
    process.exit(1);
  }
  if (device.state === 'unauthorized') {
    console.error('O telemóvel está ligado, mas ainda não autorizaste este computador.');
    console.error('Procura o aviso "Permitir depuração USB?" no ecrã do telemóvel e aceita-o.');
    process.exit(1);
  }
  if (device.state !== 'device') {
    console.error(`O telemóvel está em estado "${device.state}" — não dá para ler o log.`);
    process.exit(1);
  }

  // A versão do Expo Go no telemóvel tem de servir o SDK do projeto; um desalinhamento aqui
  // fecha a app sem dizer nada, e é a primeira coisa que vale a pena descartar.
  const versionLine = adbText(adb, ['shell', 'dumpsys', 'package', EXPO_GO_PACKAGE]);
  const version = versionLine?.match(/versionName=([^\s]+)/)?.[1];

  console.log(`Dispositivo: ${device.serial}`);
  console.log(`Expo Go:     ${version ?? '(não consegui ler a versão)'}`);
  console.log(`adb:         ${adb}`);
  console.log('');

  adbText(adb, ['logcat', '-c']);
  console.log(`A ler o logcat durante ${seconds} segundos.`);
  console.log('>>> Abre a app no Expo Go agora, e deixa-a fechar. <<<');
  console.log('');

  const logPath = path.join(os.tmpdir(), `inovapp-logcat-${Date.now()}.log`);
  const stream = fs.createWriteStream(logPath);

  // Os três buffers: `crash` é onde os crashes do sistema aparecem, e é o que mais interessa.
  const logcat = spawn(adb, ['logcat', '-v', 'time', '-b', 'main,system,crash']);
  logcat.stdout.pipe(stream);

  const errors = [];
  logcat.stderr.on('data', (chunk) => errors.push(chunk.toString()));

  let sawOutput = false;
  logcat.stdout.on('data', () => {
    sawOutput = true;
  });

  await new Promise((resolve) => {
    // Progresso a cada 5 s: sem isto, 30 segundos de silêncio parecem um programa encravado.
    const ticker = setInterval(() => process.stdout.write('.'), 5000);
    setTimeout(() => {
      clearInterval(ticker);
      logcat.kill();
      resolve();
    }, seconds * 1000);
  });

  await new Promise((resolve) => stream.end(resolve));

  if (!sawOutput) {
    console.log('\nO adb não devolveu nada.');
    if (errors.length) console.error(errors.join('').trim());
    console.error(`(log vazio: ${logPath})`);
    process.exit(1);
  }

  const lines = fs.readFileSync(logPath, 'utf8').split('\n');
  const matches = lines
    .map((line) => ({ line, kind: classify(line) }))
    .filter((entry) => entry.kind !== null)
    .filter((entry) => !onlyApp || entry.kind === 'APP' || entry.kind === 'JAVASCRIPT' || entry.kind === 'EXCEÇÃO DE JAVA' || entry.kind === 'CRASH NATIVO');

  console.log(`\n\n${lines.length} linhas capturadas, ${matches.length} com sinais de crash.\n`);

  if (matches.length === 0) {
    console.log('Nenhuma linha de crash. O log completo ficou em:');
    console.log(`  ${logPath}`);
    console.log('');
    console.log('Se o Metro (o terminal do `expo start`) mostrou um erro vermelho, é por aí que se');
    console.log('começa: um erro de JavaScript aparece lá, e não no logcat.');
  } else {
    // Agrupar por tipo ajuda a ler: o que interessa é o primeiro grupo com conteúdo, não a ordem.
    for (const label of LABEL_ORDER) {
      const ofKind = matches.filter((entry) => entry.kind === label);
      if (ofKind.length === 0) continue;
      console.log(`──── ${label} (${ofKind.length}) ────`);
      for (const entry of ofKind.slice(0, 40)) console.log(entry.line);
      if (ofKind.length > 40) console.log(`… e mais ${ofKind.length - 40} linhas (no ficheiro)`);
      console.log('');
    }
    console.log(`Log completo: ${logPath}`);
  }
}

// Só corre quando é executado a sério. Assim o classificador pode ser importado e verificado
// sem ligar nenhum telemóvel — é a única forma de provar que o filtro reconhece um crash de
// verdade, já que neste caso o "input" é um telemóvel.
if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { classify, PATTERNS, LABEL_ORDER };
