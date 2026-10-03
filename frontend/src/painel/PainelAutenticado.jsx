import { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Navigate, Route, Routes } from 'react-router-dom';
import { chamarPainel } from './api.js';
import { PainelProvider } from './PainelContext.jsx';
import PainelLayout from './PainelLayout.jsx';
import { ToastProvider } from './ui.jsx';
import VisaoGeral from './pages/VisaoGeral.jsx';
import Eventos from './pages/Eventos.jsx';
import Categorias from './pages/Categorias.jsx';
import Pagamentos from './pages/Pagamentos.jsx';
import Agenda from './pages/Agenda.jsx';
import Ajuda from './pages/Ajuda.jsx';
import Assistente from './pages/Assistente.jsx';
import Seguranca from './pages/Seguranca.jsx';
import Acessos from './pages/Acessos.jsx';

function Aviso({ titulo, texto, onSair }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-photo-paper px-4 font-body">
      <div role="alert" className="max-w-md rounded-[14px] border border-painel-linha bg-white p-6">
        <h1 className="font-display text-h3 font-semibold text-photo-primary-dark">{titulo}</h1>
        <p className="mt-2 text-painel-texto2">{texto}</p>
        {onSair && (
          <button
            type="button"
            onClick={onSair}
            className="mt-5 min-h-[44px] rounded-lg border border-photo-primary px-5 font-semibold text-photo-primary hover:bg-painel-selecionado"
          >
            Sair
          </button>
        )}
      </div>
    </main>
  );
}

Aviso.propTypes = {
  titulo: PropTypes.string.isRequired,
  texto: PropTypes.string.isRequired,
  onSair: PropTypes.func,
};

/** O /api/pascom/me devolve `{ authorized, user }`; o painel trabalha com `{ email, nome, role, permissoes }`. */
function membroDaResposta({ user }) {
  return {
    email: user.email || user.phone || '',
    nome: user.name,
    role: user.role,
    permissoes: user.permissoes || [],
  };
}

/**
 * Parte do painel que só renderiza com sessão aberta: confere com o servidor
 * se a pessoa é da equipe e só então mostra o menu e as telas.
 * @param {{obterToken: () => Promise<string|null>, onSair: () => void, chamarSensivel?: Function}} props
 */
export default function PainelAutenticado({ obterToken, onSair, chamarSensivel }) {
  const [estado, setEstado] = useState({ fase: 'carregando' });
  const tokenRef = useRef(obterToken);
  tokenRef.current = obterToken;
  const obterTokenEstavel = useMemo(() => () => tokenRef.current(), []);

  useEffect(() => {
    let ativo = true;
    chamarPainel('/api/pascom/me', obterTokenEstavel)
      .then((resposta) => ativo && setEstado({ fase: 'ok', membro: membroDaResposta(resposta) }))
      .catch((err) => ativo && setEstado({
        fase: err.status === 403 ? 'negado' : 'erro',
        mensagem: err.message,
      }));
    return () => { ativo = false; };
  }, [obterTokenEstavel]);

  if (estado.fase === 'carregando') {
    return <p role="status" className="p-8 font-body text-painel-texto2">Verificando o seu acesso…</p>;
  }
  if (estado.fase === 'negado') {
    return (
      <Aviso
        titulo="Acesso restrito à equipe"
        texto="Este e-mail não faz parte da equipe da Pascom. Peça a um administrador para incluí-lo."
        onSair={onSair}
      />
    );
  }
  if (estado.fase === 'erro') {
    return <Aviso titulo="Não foi possível abrir o painel" texto={estado.mensagem} onSair={onSair} />;
  }

  return (
    <PainelProvider membro={estado.membro} obterToken={obterTokenEstavel} chamarSensivel={chamarSensivel}>
      <ToastProvider>
        <Routes>
          <Route path="/" element={<PainelLayout onSair={onSair} />}>
            <Route index element={<VisaoGeral />} />
            <Route path="eventos" element={<Eventos />} />
            <Route path="categorias" element={<Categorias />} />
            <Route path="pagamentos" element={<Pagamentos />} />
            <Route path="agenda" element={<Agenda />} />
            <Route path="ajuda" element={<Ajuda />} />
            <Route path="assistente" element={<Assistente />} />
            <Route path="acessos" element={<Acessos />} />
            <Route path="seguranca" element={<Seguranca />} />
            <Route path="*" element={<Navigate to="/painel" replace />} />
          </Route>
        </Routes>
      </ToastProvider>
    </PainelProvider>
  );
}

PainelAutenticado.propTypes = {
  obterToken: PropTypes.func.isRequired,
  onSair: PropTypes.func.isRequired,
  chamarSensivel: PropTypes.func,
};
