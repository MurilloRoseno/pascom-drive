import { screen } from '@testing-library/react';
import Seguranca from '../painel/pages/Seguranca.jsx';
import { renderPainel } from '../test-utils/painel.jsx';

describe('painel — Segurança', () => {
  it('a tarja é sempre ativa e não oferece nenhum controle para desligá-la', () => {
    renderPainel(<Seguranca />, { rotas: () => { throw new Error('não deveria chamar a API'); } });
    expect(screen.getByText('Sempre ativa')).toBeInTheDocument();
    expect(screen.getByText(/não pode ser desligada pelo painel/)).toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
