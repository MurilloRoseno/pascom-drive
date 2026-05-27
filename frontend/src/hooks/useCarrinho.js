import { useCarrinhoContext } from '../context/CarrinhoContext.jsx';

/**
 * @returns {{ fotos, addFoto, removeFoto, clearCarrinho, isSelected }}
 */
export function useCarrinho() {
  const { state, dispatch } = useCarrinhoContext();

  const addFoto = (foto) => dispatch({ type: 'ADD_FOTO', foto });
  const removeFoto = (id) => dispatch({ type: 'REMOVE_FOTO', id });
  const clearCarrinho = () => dispatch({ type: 'CLEAR' });
  const isSelected = (id) => state.fotos.some(f => f.id === id);

  return { fotos: state.fotos, addFoto, removeFoto, clearCarrinho, isSelected };
}
