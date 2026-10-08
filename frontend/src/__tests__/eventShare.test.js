import {
  buildEventSharePayload,
  buildEventShareUrl,
  buildWhatsAppWebShareUrl,
  shareEventNatively,
} from '../shared/eventShare.js';

describe('eventShare', () => {
  it('usa slug publico quando existir', () => {
    expect(buildEventShareUrl({ slug: 'primeira-eucaristia', eventoId: 'EV1' }, 'https://pascom-drive.test')).toBe('https://pascom-drive.test/e/primeira-eucaristia');
  });

  it('usa rota de evento quando nao houver slug', () => {
    expect(buildEventShareUrl({ eventoId: 'EV1' }, 'https://pascom-drive.test')).toBe('https://pascom-drive.test/evento/EV1');
  });

  it('monta link do WhatsApp Web com texto codificado', () => {
    const payload = buildEventSharePayload({ slug: 'ordem', title: 'Padre Paulo Na França' }, 'https://pascom-drive.test');
    const whatsappUrl = new URL(buildWhatsAppWebShareUrl(payload.text));

    expect(whatsappUrl.origin).toBe('https://web.whatsapp.com');
    expect(whatsappUrl.pathname).toBe('/send');
    expect(whatsappUrl.searchParams.get('text')).toBe('Veja esta galeria da Paróquia São Rafael: Padre Paulo Na França https://pascom-drive.test/e/ordem');
  });

  it('usa Web Share API no mobile quando disponivel', async () => {
    const navigatorRef = { share: jest.fn().mockResolvedValue(undefined), clipboard: { writeText: jest.fn() } };
    const payload = buildEventSharePayload({ eventoId: 'EV1', title: 'Missa' }, 'https://pascom-drive.test');

    await shareEventNatively(payload, navigatorRef);

    expect(navigatorRef.share).toHaveBeenCalledWith({ title: payload.title, text: payload.text, url: payload.url });
    expect(navigatorRef.clipboard.writeText).not.toHaveBeenCalled();
  });

  it('copia link quando Web Share API nao existir ou falhar', async () => {
    const payload = buildEventSharePayload({ eventoId: 'EV1', title: 'Missa' }, 'https://pascom-drive.test');
    const withoutShare = { clipboard: { writeText: jest.fn().mockResolvedValue(undefined) } };
    const withFailingShare = { share: jest.fn().mockRejectedValue(new Error('fail')), clipboard: { writeText: jest.fn().mockResolvedValue(undefined) } };

    await shareEventNatively(payload, withoutShare);
    await shareEventNatively(payload, withFailingShare);

    expect(withoutShare.clipboard.writeText).toHaveBeenCalledWith(payload.url);
    expect(withFailingShare.clipboard.writeText).toHaveBeenCalledWith(payload.url);
  });
});
