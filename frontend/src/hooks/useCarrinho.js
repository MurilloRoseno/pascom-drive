import { useCarrinhoContext } from '../context/CarrinhoContext.jsx';

/**
 * @returns {{ fotos, couponCode, packageId, addFoto, addFotos, removeFoto, clearCarrinho, setCouponCode, setPackageId, isSelected }}
 */
export function useCarrinho() {
  const { state, dispatch } = useCarrinhoContext();

  const addFoto = (foto) => dispatch({ type: 'ADD_FOTO', foto });
  const addFotos = (fotos) => dispatch({ type: 'ADD_FOTOS', fotos });
  const removeFoto = (id) => dispatch({ type: 'REMOVE_FOTO', id });
  const clearCarrinho = () => dispatch({ type: 'CLEAR' });
  const setCouponCode = (couponCode) => dispatch({ type: 'SET_COUPON', couponCode });
  const setPackageId = (packageId) => dispatch({ type: 'SET_PACKAGE', packageId });
  const isSelected = (id) => state.fotos.some(f => f.id === id);

  return {
    fotos: state.fotos,
    couponCode: state.couponCode,
    packageId: state.packageId,
    addFoto,
    addFotos,
    removeFoto,
    clearCarrinho,
    setCouponCode,
    setPackageId,
    isSelected,
  };
}
