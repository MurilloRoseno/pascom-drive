import { formatMobileCardTitle } from '../mobile/referencePublicScreens.jsx';

describe('mobile event cards', () => {
  it('uses ampersand only in the card presentation title', () => {
    expect(formatMobileCardTitle('Casamento de Ana e Pedro')).toBe('Casamento de Ana & Pedro');
    expect(formatMobileCardTitle('Batismo e Crisma Comunitária')).toBe('Batismo & Crisma Comunitária');
  });
});
