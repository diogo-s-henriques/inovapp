import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

const MAX_DIMENSION = 400;
const JPEG_QUALITY = 0.6;

export async function pickProfilePhoto(): Promise<string | undefined> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return undefined;

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
export async function preparePhotoForUpload(localUri: string): Promise<string> {
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
