import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

const completeVideoSource = require('../../../../assets/finalizar_config_profile.mp4');

// Último passo do assistente de configuração de perfil: reproduz um vídeo de conclusão.
export function StepComplete() {
  const player = useVideoPlayer(completeVideoSource, (player) => {
    player.loop = false;
    player.muted = true;
  });

  useEffect(() => {
    player.play();
  }, [player]);

  return (
    <View style={styles.container}>
      <VideoView style={styles.video} player={player} contentFit="cover" nativeControls={false} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  video: {
    flex: 1,
    width: '100%',
  },
});
