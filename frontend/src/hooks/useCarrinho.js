import { useCarrinhoContext } from '../context/CarrinhoContext.jsx';
import { calcularTotais } from '../lib/calculations.js';

/**
 * @returns {{ fotos, addFoto, removeFoto, clearCarrinho, isSelected, totais }}
 */
export function useCarrinho() {
  const { state, dispatch } = useCarrinhoContext();

  const addFoto = (foto) => dispatch({ type: 'ADD_FOTO', foto });
  const removeFoto = (id) => dispatch({ type: 'REMOVE_FOTO', id });
  const clearCarrinho = () => dispatch({ type: 'CLEAR' });
  const isSelected = (id) => state.fotos.some(f => f.id === id);
  const totais = calcularTotais(state.fotos);

  return { fotos: state.fotos, addFoto, removeFoto, clearCarrinho, isSelected, totais };
}
