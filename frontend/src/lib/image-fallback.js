// Troca uma imagem que falhou por outra de reserva, uma unica vez.
export function fallbackTo(src) {
  return (event) => {
    const image = event.currentTarget;
    if (image.dataset.fallback) return;
    image.dataset.fallback = '1';
    image.src = src;
  };
}
