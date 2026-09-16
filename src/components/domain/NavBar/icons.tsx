import type { ComponentProps } from 'react';

type IoniconsName = ComponentProps<typeof import('@expo/vector-icons/Ionicons').default>['name'];

/**
 * Ícone de cada separador da barra de navegação.
 *
 * Um só por separador, e de **contorno**: era um par (contorno/preenchido) e o separador ativo
 * trocava de ícone ao ser tocado. Com o conjunto de ícones a preto de contorno em toda a app, o que
 * distingue o separador ativo é a cor (preto contra cinzento) e não a forma — trocar a forma a cada
 * toque fazia o ícone "saltar" sem dizer mais nada do que a cor já dizia.
 */
export const TAB_ICONS = {
  home: 'home-outline',
  search: 'search-outline',
  matches: 'people-outline',
  chat: 'chatbubble-outline',
  profile: 'person-outline',
} as const satisfies Record<string, IoniconsName>;

export type TabIconName = keyof typeof TAB_ICONS;
