import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PascomPanel from '../shared/PascomPanel.jsx';

const mockCreate = jest.fn();
const mockPrepareFirstFactor = jest.fn();
const mockAttemptFirstFactor = jest.fn();
const mockSetActive = jest.fn();

jest.mock('../shared/clerkConfig.js', () => ({ clerkConfigured: true }));

jest.mock('@clerk/react', () => ({
  useUser: () => ({ isLoaded: true, isSignedIn: false }),
  useAuth: () => ({ getToken: jest.fn(), signOut: jest.fn() }),
  useSignIn: () => ({
    isLoaded: true,
    setActive: mockSetActive,
    signIn: {
      create: mockCreate,
      prepareFirstFactor: mockPrepareFirstFactor,
      attemptFirstFactor: mockAttemptFirstFactor,
    },
  }),
  UserButton: () => <button type="button">Usuário</button>,
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockCreate.mockResolvedValue({ status: 'needs_first_factor' });
  mockPrepareFirstFactor.mockResolvedValue({});
  mockAttemptFirstFactor.mockResolvedValue({ status: 'complete', createdSessionId: 'sess_123' });
  window.history.replaceState(null, '', '/pascom');
});

describe('PascomPanel login customizado', () => {
  it('renderiza login Pascom em portugues sem links extras do Clerk', () => {
    render(<PascomPanel />);

    expect(screen.getByRole('heading', { name: /olá, seja bem-vindo/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/e-mail da equipe/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /receber código/i })).toBeInTheDocument();
    expect(screen.queryByText(/sign up/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/forgot password/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/secured by clerk/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/development mode/i)).not.toBeInTheDocument();
  });

  it('envia codigo por e-mail e confirma OTP com Clerk', async () => {
    render(<PascomPanel />);

    fireEvent.change(screen.getByLabelText(/e-mail da equipe/i), { target: { value: 'pascom@paroquia.test' } });
    fireEvent.click(screen.getByRole('button', { name: /receber código/i }));

    await waitFor(() => expect(mockCreate).toHaveBeenCalledWith({ identifier: 'pascom@paroquia.test' }));
    expect(mockPrepareFirstFactor).toHaveBeenCalledWith({ strategy: 'email_code' });
    expect(await screen.findByLabelText(/código recebido por e-mail/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/código recebido por e-mail/i), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /entrar no painel/i }));

    await waitFor(() => expect(mockAttemptFirstFactor).toHaveBeenCalledWith({ strategy: 'email_code', code: '123456' }));
    expect(mockSetActive).toHaveBeenCalledWith({ session: 'sess_123' });
  });

  it('mostra erro generico em portugues quando o e-mail nao pode receber codigo', async () => {
    mockCreate.mockRejectedValue({ errors: [{ code: 'form_identifier_not_found' }] });

    render(<PascomPanel />);
    fireEvent.change(screen.getByLabelText(/e-mail da equipe/i), { target: { value: 'fora@paroquia.test' } });
    fireEvent.click(screen.getByRole('button', { name: /receber código/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/verifique se este e-mail está cadastrado/i);
  });
});
