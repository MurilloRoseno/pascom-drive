import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import UploadTab from '../shared/pascom/UploadTab.jsx';
import * as api from '../lib/api.js';
import * as resumable from '../shared/pascom/resumableUpload.js';

jest.mock('../lib/api.js', () => ({
  pascomArmazenamento: jest.fn(),
  pascomCriarEnvio: jest.fn(),
  pascomSessoesEnvio: jest.fn(),
  pascomFinalizarEnvio: jest.fn(),
  pascomCancelarEnvio: jest.fn(),
}));

jest.mock('../shared/pascom/resumableUpload.js', () => ({
  ...jest.requireActual('../shared/pascom/resumableUpload.js'),
  uploadFile: jest.fn(),
}));

function photo(name, type = 'image/jpeg', size = 2048) {
  return new File([new Uint8Array(size)], name, { type, lastModified: 1 });
}

const getToken = jest.fn().mockResolvedValue('clerk-token');

function fillForm() {
  fireEvent.change(screen.getByLabelText('Categoria'), { target: { value: 'casamento' } });
  fireEvent.change(screen.getByLabelText('Data do evento'), { target: { value: '2026-05-20' } });
  fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'João e Maria' } });
}

function selectFiles(files) {
  const input = document.querySelector('input[type="file"]');
  fireEvent.change(input, { target: { files } });
}

beforeEach(() => {
  jest.clearAllMocks();
  window.localStorage.clear();
  api.pascomArmazenamento.mockResolvedValue({ usado: 1024 ** 3, limite: 15 * 1024 ** 3, livre: 14 * 1024 ** 3 });
  api.pascomCriarEnvio.mockResolvedValue({ uploadId: 'UPLOAD_1234567', nomePasta: 'casamento__2026-05-20__joão-e-maria' });
  api.pascomSessoesEnvio.mockImplementation(async (_token, _id, arquivos) => ({
    sessoes: arquivos.map((arquivo) => ({ nome: arquivo.nome, sessionUrl: `https://upload/${arquivo.nome}` })),
  }));
  api.pascomFinalizarEnvio.mockResolvedValue({ nomePasta: 'casamento__2026-05-20__joão-e-maria', arquivos: 2 });
  resumable.uploadFile.mockImplementation(async ({ file, onProgress }) => onProgress(file.size));
});

it('mostra o nome da pasta, recusa HEIC e so libera o envio com formulario e fotos validos', async () => {
  render(<UploadTab getToken={getToken} />);
  await screen.findByText(/Drive: 1 GB de 15 GB usados/);

  const enviar = screen.getByRole('button', { name: 'Enviar fotos' });
  expect(enviar).toBeDisabled();

  fillForm();
  expect(screen.getByText('casamento__2026-05-20__joão-e-maria')).toBeInTheDocument();

  selectFiles([photo('IMG_1.jpg'), photo('IMG_2.HEIC', 'image/heic'), photo('IMG_1.jpg')]);
  expect(screen.getByText(/exporte como JPG/)).toBeInTheDocument();
  expect(screen.getByText(/Nome repetido/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Enviar 1 fotos' })).toBeEnabled();
});

it('cria o evento, abre sessoes em lote, envia direto ao Drive e finaliza com a capa escolhida', async () => {
  render(<UploadTab getToken={getToken} />);
  fillForm();
  selectFiles([photo('IMG_1.jpg'), photo('IMG_2.jpg')]);
  fireEvent.click(screen.getByRole('button', { name: 'Usar IMG_2.jpg como capa' }));
  fireEvent.click(screen.getByRole('button', { name: 'Enviar 2 fotos' }));

  await screen.findByText('2 fotos no Drive');
  expect(api.pascomCriarEnvio).toHaveBeenCalledWith('clerk-token', expect.objectContaining({
    categoria: 'casamento', data: '2026-05-20', titulo: 'João e Maria', totalArquivos: 2, bytesTotais: 4096,
  }));
  expect(api.pascomSessoesEnvio).toHaveBeenCalledTimes(1);
  expect(api.pascomSessoesEnvio.mock.calls[0][2]).toHaveLength(2);
  expect(resumable.uploadFile).toHaveBeenCalledWith(expect.objectContaining({ sessionUrl: 'https://upload/IMG_1.jpg' }));
  expect(api.pascomFinalizarEnvio).toHaveBeenCalledWith('clerk-token', 'UPLOAD_1234567', { esperados: 2, capa: 'IMG_2.jpg' });
  expect(window.localStorage.getItem('pascom-upload-pendente-v1')).toBeNull();
});

it('nao finaliza quando uma foto falha e permite tentar de novo so as que faltam', async () => {
  resumable.uploadFile
    .mockImplementationOnce(async ({ file, onProgress }) => onProgress(file.size))
    .mockRejectedValueOnce(new Error('Conexão instável'));
  render(<UploadTab getToken={getToken} />);
  fillForm();
  selectFiles([photo('IMG_1.jpg'), photo('IMG_2.jpg')]);
  fireEvent.click(screen.getByRole('button', { name: 'Enviar 2 fotos' }));

  await screen.findByText(/1 foto\(s\) não chegaram ao Drive/);
  expect(api.pascomFinalizarEnvio).not.toHaveBeenCalled();
  expect(JSON.parse(window.localStorage.getItem('pascom-upload-pendente-v1')).uploadId).toBe('UPLOAD_1234567');

  fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
  await screen.findByText('2 fotos no Drive');
  expect(api.pascomCriarEnvio).toHaveBeenCalledTimes(1);
  expect(resumable.uploadFile).toHaveBeenCalledTimes(3);
});

it('oferece retomar um envio pendente salvo no navegador', async () => {
  window.localStorage.setItem('pascom-upload-pendente-v1', JSON.stringify({
    uploadId: 'UPLOAD_1234567',
    nomePasta: 'casamento__2026-05-20__joão-e-maria',
    form: { categoria: 'casamento', data: '2026-05-20', titulo: 'João e Maria' },
    capaName: '',
    files: { 'IMG_1.jpg|2048|1': { name: 'IMG_1.jpg', sessionUrl: 'https://upload/IMG_1.jpg', done: true } },
  }));
  render(<UploadTab getToken={getToken} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Continuar envio' }));
  selectFiles([photo('IMG_1.jpg'), photo('IMG_2.jpg')]);
  fireEvent.click(screen.getByRole('button', { name: 'Continuar envio' }));

  await screen.findByText('2 fotos no Drive');
  expect(api.pascomCriarEnvio).not.toHaveBeenCalled();
  expect(resumable.uploadFile).toHaveBeenCalledTimes(1);
  expect(resumable.uploadFile).toHaveBeenCalledWith(expect.objectContaining({ sessionUrl: 'https://upload/IMG_2.jpg' }));
  await waitFor(() => expect(api.pascomFinalizarEnvio).toHaveBeenCalledWith('clerk-token', 'UPLOAD_1234567', { esperados: 2, capa: '' }));
});
