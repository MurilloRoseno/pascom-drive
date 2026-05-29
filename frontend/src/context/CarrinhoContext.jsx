import { createContext, useContext, useReducer } from 'react';
import PropTypes from 'prop-types';

const CarrinhoContext = createContext(null);

function carrinhoReducer(state, action) {
  switch (action.type) {
    case 'ADD_FOTO':
      if (state.fotos.find(f => f.id === action.foto.id)) return state;
      return { ...state, fotos: [...state.fotos, action.foto] };
    case 'ADD_FOTOS': {
      const existing = new Set(state.fotos.map((foto) => foto.id));
      const novas = action.fotos.filter((foto) => !existing.has(foto.id));
      return { ...state, fotos: [...state.fotos, ...novas] };
    }
    case 'REMOVE_FOTO':
      return { ...state, fotos: state.fotos.filter(f => f.id !== action.id) };
    case 'SET_COUPON':
      return { ...state, couponCode: action.couponCode };
    case 'SET_PACKAGE':
      return { ...state, packageId: action.packageId };
    case 'CLEAR':
      return { fotos: [], couponCode: '', packageId: '' };
    default:
      return state;
  }
}

export function CarrinhoProvider({ children, initialFotos = [] }) {
  const [state, dispatch] = useReducer(carrinhoReducer, { fotos: initialFotos, couponCode: '', packageId: '' });
  return (
    <CarrinhoContext.Provider value={{ state, dispatch }}>
      {children}
    </CarrinhoContext.Provider>
  );
}

CarrinhoProvider.propTypes = { children: PropTypes.node.isRequired, initialFotos: PropTypes.array };

export function useCarrinhoContext() {
  const ctx = useContext(CarrinhoContext);
  if (!ctx) throw new Error('useCarrinhoContext fora do CarrinhoProvider');
  return ctx;
}
