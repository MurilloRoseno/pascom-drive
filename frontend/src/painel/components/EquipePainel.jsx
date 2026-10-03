import { useState } from 'react';
import PropTypes from 'prop-types';
import { usePainel } from '../PainelContext.jsx';
import {
  Botao, Campo, CLASSE_INPUT, Cartao, Interruptor, Pilula, useToast,
} from '../ui.jsx';

/**
 * Equipe: quem entra no painel e com qual papel. Mudanças valem na hora; o servidor
 * não deixa o painel ficar sem administrador ativo.
 */
export default function EquipePainel({ equipe, papeis, onMudou }) {
  const { chamar } = usePainel();
  const avisar = useToast();
  const [novo, setNovo] = useState({ email: '', nome: '', role: 'atend' });
  const [erro, setErro] = useState('');

  async function alterar(email, corpo, mensagem) {
    try {
      await chamar(`/api/pascom/acessos/equipe/${encodeURIComponent(email)}`, { method: 'PATCH', body: corpo });
      avisar(mensagem);
      await onMudou();
    } catch (e) {
      avisar(e.message);
    }
  }

  async function adicionar(ev) {
    ev.preventDefault();
    setErro('');
    try {
      await chamar('/api/pascom/acessos/equipe', { method: 'POST', body: novo });
      avisar(`${novo.email} entrou na equipe.`);
      setNovo({ email: '', nome: '', role: 'atend' });
      await onMudou();
    } catch (e) {
      setErro(e.message);
    }
  }

  return (
    <Cartao titulo="Equipe" descricao="Quem pode entrar no painel. A pessoa entra com o e-mail cadastrado aqui, pelo login do Clerk.">
      <ul className="divide-y divide-painel-divisor">
        {equipe.map((m) => (
          <li key={m.email} className={`flex flex-wrap items-center gap-3 py-3 ${m.ativo ? '' : 'opacity-60'}`}>
            <div className="min-w-[200px] flex-1">
              <p className="font-semibold">{m.nome}</p>
              <p className="font-mono text-caption text-painel-texto2">{m.email}</p>
              {!m.role && (
                <p className="mt-1 text-caption font-semibold text-painel-perigo">
                  Sem acesso ao painel{m.papelNaPlanilha ? ' (papel na planilha: ' + m.papelNaPlanilha + ')' : ''}: escolha um papel.
                </p>
              )}
            </div>
            {m.fixo ? (
              <Pilula tom="lilas">Administrador do ambiente</Pilula>
            ) : (
              <>
                <select
                  aria-label={`Papel de ${m.nome}`}
                  className={`${CLASSE_INPUT} mt-0 w-auto`}
                  value={m.role}
                  onChange={(e) => alterar(m.email, { role: e.target.value }, `${m.nome} agora é ${papeis.find((p) => p.id === e.target.value)?.nome}.`)}
                >
                  {!m.role && <option value="" disabled>Sem papel definido</option>}
                  {papeis.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
                <Interruptor
                  rotulo={`${m.nome} ativo`}
                  ligado={m.ativo}
                  onChange={(v) => alterar(m.email, { ativo: v }, v ? `${m.nome} reativado.` : `${m.nome} desativado.`)}
                />
              </>
            )}
          </li>
        ))}
      </ul>

      <form onSubmit={adicionar} noValidate className="mt-5 grid gap-3 rounded-[10px] bg-painel-cabecalho p-4 sm:grid-cols-2">
        <p className="font-semibold sm:col-span-2">Adicionar pessoa</p>
        <Campo rotulo="E-mail" htmlFor="eq-email">
          <input id="eq-email" type="email" className={CLASSE_INPUT} value={novo.email} onChange={(e) => { setNovo({ ...novo, email: e.target.value }); setErro(''); }} />
        </Campo>
        <Campo rotulo="Nome" htmlFor="eq-nome">
          <input id="eq-nome" className={CLASSE_INPUT} maxLength={80} value={novo.nome} onChange={(e) => { setNovo({ ...novo, nome: e.target.value }); setErro(''); }} />
        </Campo>
        <Campo rotulo="Papel" htmlFor="eq-papel">
          <select id="eq-papel" className={CLASSE_INPUT} value={novo.role} onChange={(e) => setNovo({ ...novo, role: e.target.value })}>
            {papeis.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </Campo>
        <div className="flex items-end">
          <Botao type="submit" variante="dourado">Adicionar à equipe</Botao>
        </div>
        {erro && <p role="alert" className="text-body-sm font-semibold text-painel-perigo sm:col-span-2">{erro}</p>}
      </form>
    </Cartao>
  );
}

EquipePainel.propTypes = {
  equipe: PropTypes.array.isRequired,
  papeis: PropTypes.array.isRequired,
  onMudou: PropTypes.func.isRequired,
};
