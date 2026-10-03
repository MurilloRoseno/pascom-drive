import { createContext, useCallback, useContext, useMemo } from 'react';
import { chamarPainel } from './api.js';

const PainelContext = createContext(null);

/**
 * Entrega aos filhos o membro logado e uma função `chamar` já autenticada.
 * `chamarSensivel` é a mesma chamada, mas com reautenticação (Clerk useReverification):
 * use-a para mudar preço, repasse e tarifas. Sem ela, cai na chamada comum.
 * @param {{membro: {email: string, nome: string, role: string, permissoes: string[]}, obterToken: () => Promise<string|null>, chamarSensivel?: Function, children: import('react').ReactNode}} props
 */
export function PainelProvider({ membro, obterToken, chamarSensivel, children }) {
  const chamar = useCallback(
    (caminho, opcoes) => chamarPainel(caminho, obterToken, opcoes),
    [obterToken],
  );
  const valor = useMemo(
    () => ({ membro, chamar, chamarSensivel: chamarSensivel || chamar }),
    [membro, chamar, chamarSensivel],
  );
  return <PainelContext.Provider value={valor}>{children}</PainelContext.Provider>;
}

export function usePainel() {
  const ctx = useContext(PainelContext);
  if (!ctx) throw new Error('usePainel deve ser usado dentro de PainelProvider');
  return ctx;
}
