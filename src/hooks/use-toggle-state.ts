import { useState } from 'react';

// Hook auxiliar para componentes tipo switch/checkbox que podem ser usados
// como controlados (valor vindo de fora via `controlled`) ou não controlados
// (o hook gere o próprio estado interno).
export function useToggleState(
  controlled: boolean | undefined,
  defaultValue: boolean,
  onToggle?: (next: boolean) => void,
) {
  const [internal, setInternal] = useState(defaultValue);
  const value = controlled ?? internal;

  const toggle = () => {
    const next = !value;
    // Só atualiza o estado interno se o componente não estiver a ser controlado.
    if (controlled === undefined) setInternal(next);
    onToggle?.(next);
  };

  return [value, toggle] as const;
}
