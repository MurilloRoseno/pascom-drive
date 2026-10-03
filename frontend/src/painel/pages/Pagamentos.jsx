import { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { usePainel } from '../PainelContext.jsx';
import {
  Aviso, Botao, Campo, CLASSE_INPUT, Cartao, Pilula, useToast,
} from '../ui.jsx';
import SimuladorPagamentos from '../components/SimuladorPagamentos.jsx';

const LIMITES = {
  precoFoto: { min: 0.5, max: 1000, rotulo: 'Preço da foto' },
  taxaServico: { min: 0, max: 50, rotulo: 'Taxa de serviço' },
  taxaComodidade: { min: 0, max: 50, rotulo: 'Taxa de comodidade' },
  tarifaCartaoPct: { min: 0, max: 20, rotulo: 'Tarifa do cartão (%)' },
  tarifaCartaoFixo: { min: 0, max: 10, rotulo: 'Valor fixo do cartão' },
  tarifaPixPct: { min: 0, max: 20, rotulo: 'Tarifa do Pix (%)' },
  tarifaPixFixo: { min: 0, max: 10, rotulo: 'Valor fixo do Pix' },
};

const NUMERICAS = Object.keys(LIMITES);
const paraTexto = (n) => String(n).replace('.', ',');
const EM_REAIS = new Set(['precoFoto', 'taxaServico', 'taxaComodidade', 'tarifaCartaoFixo', 'tarifaPixFixo']);
// Valores em reais aparecem sempre com centavos (5,00); percentuais ficam como estão (3,99).
const textoDoCampo = (k, n) => (EM_REAIS.has(k) ? Number(n).toFixed(2).replace('.', ',') : paraTexto(n));
const lerNumero = (texto) => Number(String(texto).trim().replace(',', '.'));

const formularioDe = (config) => Object.fromEntries(NUMERICAS.map((k) => [k, textoDoCampo(k, config[k])]));

/** Valida os campos numéricos e devolve {campo: mensagem}. */
function validar(f) {
  const erros = {};
  for (const k of NUMERICAS) {
    const n = lerNumero(f[k]);
    const { min, max, rotulo } = LIMITES[k];
    if (f[k] === '' || !Number.isFinite(n) || n < min || n > max) {
      erros[k] = `${rotulo}: informe um valor entre ${paraTexto(min)} e ${paraTexto(max)}.`;
    }
  }
  return erros;
}

function Item({ ok, ligado, falta }) {
  return <li>{ok ? '✓' : '✗'} {ok ? ligado : falta}</li>;
}

Item.propTypes = { ok: PropTypes.bool.isRequired, ligado: PropTypes.string.isRequired, falta: PropTypes.string.isRequired };

function CartaoGateways({ estado }) {
  const stripeAtivo = estado.gateway === 'stripe';
  const mpAtivo = estado.gateway === 'mercadopago';
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Cartao titulo="Stripe" destaque={stripeAtivo}>
        <div className="flex flex-wrap items-center gap-2">
          <Pilula tom={stripeAtivo ? 'verde' : 'amarelo'}>{stripeAtivo ? 'Gateway ativo' : 'Não é o gateway ativo'}</Pilula>
          {estado.stripe.modo && <Pilula tom={estado.stripe.modo === 'teste' ? 'amarelo' : 'verde'}>{estado.stripe.modo === 'teste' ? 'Modo de teste' : 'Produção'}</Pilula>}
        </div>
        <p className="mt-3 text-body-sm text-painel-texto2">
          Cartão de crédito e Pix pela página da Stripe: o número do cartão vai direto à Stripe e nunca passa pelo nosso servidor.
        </p>
        <ul className="mt-3 space-y-1 text-body-sm">
          <Item ok={estado.stripe.chaveSecreta} ligado="Chave secreta configurada" falta="Chave secreta FALTANDO" />
          <Item ok={estado.stripe.segredoWebhook} ligado="Segredo do webhook configurado" falta="Segredo do webhook FALTANDO" />
          <Item ok={estado.segredos.download} ligado="Segredo dos downloads configurado" falta="Segredo dos downloads FALTANDO" />
          <Item ok={estado.segredos.marcaForense} ligado="Segredo da marca forense configurado" falta="Segredo da marca forense FALTANDO" />
        </ul>
        <p className="mt-3 font-mono text-caption text-painel-texto2">
          PAYMENT_GATEWAY={estado.gatewayDefinido ? estado.gateway : '(não definido)'} · variável de ambiente, somente leitura aqui
        </p>
      </Cartao>

      <Cartao titulo="Mercado Pago" destaque={mpAtivo}>
        <Pilula tom={mpAtivo ? 'verde' : 'cinza'}>{mpAtivo ? 'Gateway ativo' : 'Em reserva'}</Pilula>
        <p className="mt-3 text-body-sm text-painel-texto2">
          {mpAtivo
            ? 'Está valendo porque PAYMENT_GATEWAY não está definido como stripe.'
            : 'Integração mantida no código, desligada para vendas novas. Reativar exige trocar a variável de ambiente e publicar: nunca pelo painel ou pelo navegador.'}
        </p>
        <p className="mt-2 text-body-sm text-painel-texto2">Pedidos iniciados no Mercado Pago antes da troca continuam sendo conferidos normalmente.</p>
      </Cartao>
    </div>
  );
}

CartaoGateways.propTypes = { estado: PropTypes.object.isRequired };

function CampoNumero({ id, rotulo, valor, erro, desabilitado, onChange, sufixo }) {
  return (
    <Campo rotulo={rotulo} htmlFor={id} erro={erro}>
      <div className="flex items-center gap-2">
        <input id={id} inputMode="decimal" className={CLASSE_INPUT} value={valor} disabled={desabilitado} onChange={(e) => onChange(e.target.value)} />
        {sufixo && <span className="mt-1 text-body-sm text-painel-texto2">{sufixo}</span>}
      </div>
    </Campo>
  );
}

CampoNumero.propTypes = {
  id: PropTypes.string.isRequired,
  rotulo: PropTypes.string.isRequired,
  valor: PropTypes.string.isRequired,
  erro: PropTypes.string,
  desabilitado: PropTypes.bool,
  onChange: PropTypes.func.isRequired,
  sufixo: PropTypes.string,
};

export default function Pagamentos() {
  const { chamar, chamarSensivel, membro } = usePainel();
  const avisar = useToast();
  const [estado, setEstado] = useState({ fase: 'carregando' });
  const [form, setForm] = useState(null);
  const [erros, setErros] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [versao, setVersao] = useState(0);
  const podeEditar = membro.permissoes.includes('pagamentos.editar');

  const carregar = useCallback(async () => {
    try {
      const [config, integracao] = await Promise.all([
        chamar('/api/pascom/configuracoes'),
        chamar('/api/pascom/pagamentos/estado'),
      ]);
      setEstado({ fase: 'ok', config, integracao });
      setForm(formularioDe(config));
    } catch (e) {
      setEstado({ fase: 'erro', mensagem: e.message });
    }
  }, [chamar]);

  useEffect(() => { carregar(); }, [carregar]);

  if (estado.fase === 'carregando') return <p role="status" className="text-painel-texto2">Carregando…</p>;
  if (estado.fase === 'erro') {
    return (
      <div role="alert" className="rounded-[14px] border border-painel-perigo bg-white p-5">
        <p className="font-semibold text-painel-perigo">Não foi possível carregar os pagamentos.</p>
        <p className="mt-1 text-body-sm text-painel-texto2">{estado.mensagem}</p>
        <Botao className="mt-4" onClick={carregar}>Tentar de novo</Botao>
      </div>
    );
  }

  const { config, integracao } = estado;
  const mudar = (campo) => (valor) => { setForm((f) => ({ ...f, [campo]: valor })); setErros((e) => ({ ...e, [campo]: undefined })); };

  // Só envia o que mudou, na forma que o servidor espera.
  const alteracoes = NUMERICAS.filter((k) => lerNumero(form[k]) !== config[k]).map((k) => [k, lerNumero(form[k])]);

  async function salvar() {
    const invalidos = validar(form);
    if (Object.keys(invalidos).length > 0) { setErros(invalidos); return; }
    setSalvando(true);
    try {
      for (const [chave, valor] of alteracoes) {
        // eslint-disable-next-line no-await-in-loop
        const r = await chamarSensivel('/api/pascom/configuracoes', { method: 'PUT', body: { chave, valor } });
        if (r === undefined || (r && r.clerk_error)) {
          avisar('Alteração cancelada: confirme a sua identidade para mudar preço e taxas.');
          await carregar();
          return;
        }
      }
      avisar('Preço e taxas atualizados.');
      setVersao((v) => v + 1);
      await carregar();
    } catch (e) {
      avisar(e.message);
      await carregar();
    } finally {
      setSalvando(false);
    }
  }

  const desabilitado = !podeEditar || salvando;

  return (
    <div className="space-y-6">
      <CartaoGateways estado={integracao} />

      <Cartao titulo="Preço e taxas">
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <CampoNumero id="preco" rotulo="Preço de cada foto (R$)" valor={form.precoFoto} erro={erros.precoFoto} desabilitado={desabilitado} onChange={mudar('precoFoto')} />
            <CampoNumero id="taxa-servico" rotulo="Taxa de serviço (R$)" valor={form.taxaServico} erro={erros.taxaServico} desabilitado={desabilitado} onChange={mudar('taxaServico')} />
            <CampoNumero id="taxa-comodidade" rotulo="Taxa de comodidade (R$)" valor={form.taxaComodidade} erro={erros.taxaComodidade} desabilitado={desabilitado} onChange={mudar('taxaComodidade')} />
          </div>
          <p className="text-body-sm text-painel-texto2">
            As duas taxas somam-se uma vez a cada pedido e aparecem em linhas separadas antes do comprador pagar. Cupons e pacotes
            continuam valendo sobre o preço das fotos, sem alterar as taxas.
          </p>

          <div>
            <p className="font-semibold">Tarifas da Stripe repassadas ao comprador (editáveis)</p>
            <p className="mt-1 text-body-sm text-painel-texto2">
              A tarifa do meio de pagamento é somada por cima do total, para a paróquia receber o valor cheio das fotos e das taxas acima.
            </p>
            <div className="mt-2 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[10px] bg-painel-cabecalho p-4">
                <p className="font-mono text-caption uppercase text-painel-texto2">Cartão</p>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <CampoNumero id="cartao-pct" rotulo="Percentual" sufixo="%" valor={form.tarifaCartaoPct} erro={erros.tarifaCartaoPct} desabilitado={desabilitado} onChange={mudar('tarifaCartaoPct')} />
                  <CampoNumero id="cartao-fixo" rotulo="Fixo (R$)" valor={form.tarifaCartaoFixo} erro={erros.tarifaCartaoFixo} desabilitado={desabilitado} onChange={mudar('tarifaCartaoFixo')} />
                </div>
              </div>
              <div className="rounded-[10px] bg-painel-cabecalho p-4">
                <p className="font-mono text-caption uppercase text-painel-texto2">Pix</p>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <CampoNumero id="pix-pct" rotulo="Percentual" sufixo="%" valor={form.tarifaPixPct} erro={erros.tarifaPixPct} desabilitado={desabilitado} onChange={mudar('tarifaPixPct')} />
                  <CampoNumero id="pix-fixo" rotulo="Fixo (R$)" valor={form.tarifaPixFixo} erro={erros.tarifaPixFixo} desabilitado={desabilitado} onChange={mudar('tarifaPixFixo')} />
                </div>
              </div>
            </div>
          </div>

          <Aviso tom="amarelo">
            Os valores iniciais vêm de comparativos públicos; confirme as tarifas no Dashboard da Stripe antes de publicar.
            Com o Mercado Pago ativo, as tarifas seguem a aba RegrasPagamento da planilha. Alterar preço, taxas ou tarifas pede que
            você confirme a sua identidade e fica na auditoria.
          </Aviso>

          {podeEditar && (
            <div className="flex flex-wrap gap-3">
              <Botao variante="dourado" disabled={salvando || alteracoes.length === 0} onClick={salvar}>
                {salvando ? 'Salvando…' : alteracoes.length === 0 ? 'Nada para salvar' : `Salvar ${alteracoes.length} ${alteracoes.length === 1 ? 'alteração' : 'alterações'}`}
              </Botao>
              <Botao variante="secundario" disabled={salvando || alteracoes.length === 0} onClick={() => { setForm(formularioDe(config)); setErros({}); }}>
                Descartar
              </Botao>
            </div>
          )}
        </div>
      </Cartao>

      <SimuladorPagamentos versao={versao} />
    </div>
  );
}
