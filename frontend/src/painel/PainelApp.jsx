import { Show, SignIn, useAuth, useClerk, useReverification } from '@clerk/react';
import '../index.css'; // Tailwind e tokens da marca (o site público carrega o mesmo arquivo pelo DesktopApp)
import { clerkConfigured } from '../shared/clerkConfig.js';
import { chamarPainel } from './api.js';
import PainelAutenticado from './PainelAutenticado.jsx';

function Sessao() {
  const { getToken } = useAuth();
  const { signOut } = useClerk();
  // Mudar dinheiro pede login recente: se o servidor responder com a dica do Clerk,
  // o hook abre o desafio de verificação e repete a chamada com um token novo.
  const chamarSensivel = useReverification(
    (caminho, opcoes) => chamarPainel(caminho, () => getToken({ skipCache: true }), { ...opcoes, aceitarDica: true }),
  );
  return (
    <PainelAutenticado
      obterToken={() => getToken()}
      onSair={() => signOut({ redirectUrl: '/painel' })}
      chamarSensivel={chamarSensivel}
    />
  );
}

function Entrada() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-photo-paper px-4 font-body">
      <div className="text-center">
        <p className="font-mono text-eyebrow uppercase tracking-widest text-photo-primary">Pascom Drive</p>
        <h1 className="font-display text-h2 font-semibold text-photo-primary-dark">Painel da equipe</h1>
      </div>
      <SignIn routing="hash" fallbackRedirectUrl="/painel" />
    </main>
  );
}

/** Raiz da rota /painel/*: carregada sob demanda. O ClerkProvider vem do main.jsx. */
export default function PainelApp() {
  if (!clerkConfigured) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-photo-paper px-4 font-body">
        <div role="alert" className="max-w-md rounded-[14px] border border-painel-linha bg-white p-6">
          <h1 className="font-display text-h3 font-semibold text-photo-primary-dark">Painel ainda não configurado</h1>
          <p className="mt-2 text-painel-texto2">
            Falta definir <code>VITE_CLERK_PUBLISHABLE_KEY</code> no ambiente do frontend.
          </p>
        </div>
      </main>
    );
  }

  return (
    <>
      <Show when="signed-out"><Entrada /></Show>
      <Show when="signed-in"><Sessao /></Show>
    </>
  );
}
