import { formatMobileCardDate, formatMobileCardTitle } from '../mobile/referencePublicScreens.jsx';

describe('mobile event cards', () => {
  it('uses ampersand only in the card presentation title', () => {
    expect(formatMobileCardTitle('Casamento de Ana e Pedro')).toBe('Casamento de Ana & Pedro');
    expect(formatMobileCardTitle('Batismo e Crisma Comunitária')).toBe('Batismo & Crisma Comunitária');
  });

  it('formats card dates like the mobile standalone', () => {
    expect(formatMobileCardDate('24 de maio de 2026')).toBe('24 DE MAIO DE 2026');
    expect(formatMobileCardDate('', '2026-05-24')).toBe('24 DE MAIO DE 2026');
  });
});
