import {
  SessionExpiredError, rejectReason, runPool, slugTitulo, uploadFile,
} from '../shared/pascom/resumableUpload.js';

function fakeFile(size, name = 'foto.jpg', type = 'image/jpeg') {
  const blob = new Blob([new Uint8Array(size)], { type });
  return Object.assign(blob, { name, lastModified: 1 });
}

function res(status, range) {
  return { status, headers: { get: (key) => (key.toLowerCase() === 'range' ? range || null : null) } };
}

const noSleep = () => Promise.resolve();

it('envia em pedacos com Content-Range correto ate o Drive confirmar', async () => {
  const fetchImpl = jest.fn()
    .mockResolvedValueOnce(res(308, 'bytes=0-3'))
    .mockResolvedValueOnce(res(308, 'bytes=0-7'))
    .mockResolvedValueOnce(res(200));
  const progress = [];
  await uploadFile({ file: fakeFile(10), sessionUrl: 'https://s', chunkSize: 4, fetchImpl, onProgress: (v) => progress.push(v), sleep: noSleep });

  expect(fetchImpl.mock.calls.map(([, init]) => init.headers['Content-Range'])).toEqual([
    'bytes 0-3/10', 'bytes 4-7/10', 'bytes 8-9/10',
  ]);
  expect(progress).toEqual([4, 8, 10]);
});

it('depois de falha de rede consulta o Drive e retoma do byte confirmado', async () => {
  const fetchImpl = jest.fn()
    .mockResolvedValueOnce(res(308, 'bytes=0-3'))
    .mockRejectedValueOnce(new TypeError('Failed to fetch'))
    .mockResolvedValueOnce(res(308, 'bytes=0-5'))
    .mockResolvedValueOnce(res(201));
  const sleep = jest.fn(noSleep);
  await uploadFile({ file: fakeFile(10), sessionUrl: 'https://s', chunkSize: 4, fetchImpl, sleep });

  expect(sleep).toHaveBeenCalledWith(1000);
  expect(fetchImpl.mock.calls[2][1].headers['Content-Range']).toBe('bytes */10');
  expect(fetchImpl.mock.calls[3][1].headers['Content-Range']).toBe('bytes 6-9/10');
});

it('usa o ultimo pedaco confirmado quando o Range nao esta visivel (CORS)', async () => {
  const fetchImpl = jest.fn()
    .mockResolvedValueOnce(res(308))
    .mockResolvedValueOnce(res(200));
  await uploadFile({ file: fakeFile(8), sessionUrl: 'https://s', chunkSize: 4, fetchImpl, sleep: noSleep });
  expect(fetchImpl.mock.calls[1][1].headers['Content-Range']).toBe('bytes 4-7/8');
});

it('desiste apos repetidas falhas 5xx e sinaliza sessao expirada', async () => {
  const flaky = jest.fn().mockResolvedValue(res(503));
  await expect(uploadFile({ file: fakeFile(4), sessionUrl: 'https://s', fetchImpl: flaky, maxRetries: 2, sleep: noSleep }))
    .rejects.toThrow(/Conexão instável/);

  const expired = jest.fn().mockResolvedValue(res(404));
  await expect(uploadFile({ file: fakeFile(4), sessionUrl: 'https://s', fetchImpl: expired, sleep: noSleep }))
    .rejects.toBeInstanceOf(SessionExpiredError);
});

it('recusa HEIC, formatos desconhecidos e arquivos acima de 40 MB', () => {
  expect(rejectReason(fakeFile(10, 'IMG_1.HEIC', 'image/heic'))).toMatch(/HEIC/);
  expect(rejectReason(fakeFile(10, 'video.mp4', 'video/mp4'))).toMatch(/Formato/);
  expect(rejectReason({ name: 'grande.jpg', type: 'image/jpeg', size: 41 * 1024 * 1024 })).toMatch(/40 MB/);
  expect(rejectReason(fakeFile(10, 'ok.JPG', ''))).toBeNull();
});

it('gera o mesmo slug do Apps Script e limita concorrencia', async () => {
  expect(slugTitulo('  João & Maria — Casamento!  ')).toBe('joão-maria-casamento');
  let active = 0;
  let peak = 0;
  await runPool([1, 2, 3, 4, 5, 6], 3, async () => {
    active += 1;
    peak = Math.max(peak, active);
    await Promise.resolve();
    active -= 1;
  });
  expect(peak).toBe(3);
});
