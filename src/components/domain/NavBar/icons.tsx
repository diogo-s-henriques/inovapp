import type { ComponentProps } from 'react';

type IoniconsName = ComponentProps<typeof import('@expo/vector-icons/Ionicons').default>['name'];

/** Par de ícones (contorno/preenchido) por separador da barra de navegação. */
export interface TabIconName {
  outline: IoniconsName;
  filled: IoniconsName;
}

export const TAB_ICONS = {
  home: { outline: 'home-outline', filled: 'home' },
  search: { outline: 'search-outline', filled: 'search' },
  matches: { outline: 'people-outline', filled: 'people' },
  chat: { outline: 'chatbubble-outline', filled: 'chatbubble' },
  profile: { outline: 'person-outline', filled: 'person' },
} as const satisfies Record<string, TabIconName>;
