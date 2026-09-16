import { View, type ViewProps } from 'react-native';

import { ExtraCard } from '@/components/ui/ExtraCard';
import { useI18n } from '@/hooks/use-i18n';

export interface HomeShortcutsProps extends ViewProps {
  onPressMaterials?: () => void;
}

/**
 * Os atalhos do ecrã inicial. Hoje é **um só**: os Materiais.
 *
 * Chegaram a ser quatro (Sessões, Materiais, Mensagens e Pesquisar) numa grelha de duas colunas.
 * Sessões saiu porque subiu para o ecrã: o mês com os dias marcados está lá em cima, e um atalho
 * para a agenda ao lado de um calendário é o mesmo destino a dois dedos de distância. Mensagens e
 * Pesquisar saíram porque são **separadores da barra de baixo** - os dois ecrãs mais fáceis de
 * alcançar na app não precisavam de um segundo caminho no meio da Home, que é onde há menos espaço
 * e mais coisas para ler.
 *
 * Sobrou o cartão dos Materiais, e o cartão ficou **largo** (ícone ao lado do texto) em vez da
 * célula estreita da grelha: era a coluna que obrigava o título e o subtítulo a uma linha cada um
 * e a quebra de linha que se via. Sem grelha, o texto tem a largura do ecrã.
 *
 * Continua a ser um componente, e não um cartão solto no ecrã, por uma razão: é aqui que vive a
 * ligação entre o que o cartão diz e o ecrã que ele abre, e é isso que o teste fixa.
 *
 * O cartão não leva `flex`. Numa coluna, ele estica à largura do ecrã sozinho (o alinhamento por
 * omissão de uma coluna é `stretch`) e a altura continua a vir do conteúdo; o `flex: 1` que os
 * cartões levavam dentro da grelha dava-lhes, ali, a largura da célula - e aqui daria altura zero.
 */
export function HomeShortcuts({ onPressMaterials, style, ...rest }: HomeShortcutsProps) {
  const i18n = useI18n();

  return (
    <View style={style} {...rest}>
      <ExtraCard
        icon="document-text-outline"
        title={i18n.home.materialsTitle}
        subtitle={i18n.home.materialsExploreAll}
        onPress={onPressMaterials}
      />
    </View>
  );
}
