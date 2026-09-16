import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

const MAX_DIMENSION = 400;
const JPEG_QUALITY = 0.6;

/**
 * Abre a galeria e devolve o `file://` da fotografia escolhida.
 *
 * **Não se pede permissão nenhuma, e é de propósito.** A app escolhe sempre pelo seletor do
 * sistema, e esse não dá acesso à galeria: devolve uma cópia do ficheiro que a pessoa escolheu, que
 * é a única coisa que a app chega a ver. Pedir a permissão antes custava duas coisas - uma ida ao
 * sistema com diálogo antes de a galeria abrir, que era o atraso que se sentia no toque, e o
 * silêncio quando alguém a tinha recusado antes: o seletor nunca chegava a abrir e nada dizia
 * porquê, nem havia caminho para as definições do telemóvel a partir daqui. A biblioteca é
 * explícita nisto (expo-image-picker, SDK 57: "No permissions request is necessary for launching
 * the image library"); só para vídeos sem edição é que o iOS exige a permissão, e aqui são sempre
 * imagens.
 */
async function pickPhotoFromLibrary(): Promise<string | undefined> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });

  return result.canceled ? undefined : result.assets[0].uri;
}

// Sem Firebase Storage (exige o plano pago Blaze), por isso a foto de perfil é redimensionada/
// comprimida no próprio dispositivo e guardada como data uri base64 diretamente no documento do
// utilizador no Firestore, bem dentro do limite de 1 MiB por documento.
async function preparePhotoForUpload(localUri: string): Promise<string> {
  const context = ImageManipulator.manipulate(localUri);
  context.resize({ width: MAX_DIMENSION });
  const rendered = await context.renderAsync();
  const result = await rendered.saveAsync({
    format: SaveFormat.JPEG,
    compress: JPEG_QUALITY,
    base64: true,
  });

  return `data:image/jpeg;base64,${result.base64}`;
}

/**
 * A fotografia escolhida, **já preparada** para o perfil (400 px, JPEG) - que é o que os ecrãs
 * devem usar.
 *
 * A preparação acontece aqui, no momento da escolha, e não no momento de gravar, por duas razões
 * que se sentem as duas:
 *
 * - **a vista é pequena.** O seletor do sistema devolve a fotografia original - numa câmara de
 *   telemóvel, 12 megapixels. Desenhá-la num quadrado de ~340 px obriga a descodificar tudo isso
 *   para mostrar pouco, e é trabalho que cai em cima do toque: a fotografia grande demora a
 *   aparecer e a app fica pesada enquanto isso. Um JPEG de 400 px aparece no mesmo instante;
 * - **gravar deixa de ser o momento lento.** O redimensionamento e o base64 são o trabalho a sério
 *   desta funcionalidade, e quem acabou de escolher na galeria já está à espera de alguma coisa -
 *   enquanto quem carrega em "Guardar" está à espera de que ele guarde. O mesmo trabalho, feito do
 *   lado certo do toque.
 */
export async function pickPreparedProfilePhoto(): Promise<string | undefined> {
  const localUri = await pickPhotoFromLibrary();
  if (!localUri) return undefined;

  return preparePhotoForUpload(localUri);
}
