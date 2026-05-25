export const PHOTO_PRICE = 10;
export const SERVICE_FEE = 2;
export const CONVENIENCE_FEE = 1;

export function calcularTotais(fotos) {
  const subtotal = fotos.reduce((sum, photo) => sum + Number(photo.price || PHOTO_PRICE), 0);
  return {
    subtotal,
    serviceFee: SERVICE_FEE,
    convenienceFee: CONVENIENCE_FEE,
    preliminaryTotal: subtotal + SERVICE_FEE + CONVENIENCE_FEE,
  };
}
