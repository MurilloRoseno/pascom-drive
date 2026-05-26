import { demoEvents, filterDemoEvents, findDemoEvent } from '../data/demoCatalog.js';

it('mantem toda galeria demonstrativa fora do fluxo comercial', () => {
  expect(demoEvents.length).toBeGreaterThan(0);
  expect(demoEvents.every((event) => event.isDemo && event.salesAuthorized === false)).toBe(true);
  expect(demoEvents.flatMap((event) => event.photos).every((photo) => photo.availableForSale === false)).toBe(true);
});

it('oferece a galeria publica e filtra as categorias na busca unificada', () => {
  const publicGallery = findDemoEvent('visita-a-paroquia-galeria-publica');
  expect(publicGallery.visibility).toBe('publica');
  expect(filterDemoEvents({ categoria: 'eucaristia' }).map((event) => event.eventoId)).toEqual(['primeira-comunhao-2026']);
});
