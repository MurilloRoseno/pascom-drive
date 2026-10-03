import { Cartao, Pilula } from '../ui.jsx';

const CAMINHO = [
  { quem: 'Navegador', texto: 'O comprador escolhe as fotos e a forma de pagamento. Só os códigos das fotos e o método seguem; preço e taxa não.' },
  { quem: 'Servidor', texto: 'Confere as fotos na planilha (existem, estão processadas, o evento está no ar e a venda está autorizada) e calcula o valor.' },
  { quem: 'Servidor', texto: 'Grava o pedido e cria a cobrança no gateway definido no ambiente, com os mesmos valores mostrados ao comprador.' },
  { quem: 'Stripe', texto: 'Cobra o cartão ou o Pix na página da própria Stripe. Os dados do cartão nunca passam pelo nosso servidor.' },
  { quem: 'Servidor', texto: 'O aviso assinado pela Stripe (webhook) confere valor e moeda. Se algo divergir, não libera nada e o pedido fica marcado como divergente.' },
  { quem: 'Servidor', texto: 'Libera links de download assinados: válidos por 24 horas, com até 2 usos e marca forense em cada arquivo.' },
];

const CONTROLES = [
  { texto: 'Preço, taxas e total calculados só no servidor; valores enviados pelo navegador são ignorados', camada: 'Servidor', situacao: 'ativo' },
  { texto: 'Fotos conferidas na planilha: forjadas, de evento fora do ar (agendado, vencido ou arquivado) ou sem venda são recusadas', camada: 'Servidor', situacao: 'ativo' },
  { texto: 'Gateway fixado em variável de ambiente (PAYMENT_GATEWAY); trocar exige publicar', camada: 'Servidor', situacao: 'ativo' },
  { texto: 'Webhook com assinatura verificada; valor ou moeda diferente do pedido não libera download', camada: 'Servidor', situacao: 'ativo' },
  { texto: 'Evento repetido não entrega duas vezes; expiração atrasada nunca desfaz um pedido pago', camada: 'Servidor', situacao: 'ativo' },
  { texto: 'Chaves e segredos só no servidor; o navegador nunca recebe nenhuma', camada: 'Servidor', situacao: 'ativo' },
  { texto: 'Chave de idempotência por pedido: repetir a chamada não cria duas cobranças', camada: 'Servidor', situacao: 'ativo' },
  { texto: 'Limite de tentativas por IP em cotação, checkout, consulta de status, webhook e download', camada: 'Servidor', situacao: 'ativo' },
  { texto: 'Mudar preço, taxas ou tarifas exige login recente (reautenticação) e fica na auditoria com o valor antigo e o novo', camada: 'Ambos', situacao: 'ativo' },
  { texto: 'CSP (política de segurança de conteúdo) ainda em modo de observação (Report-Only)', camada: 'Ambos', situacao: 'observacao' },
];

const SITUACAO = {
  ativo: { rotulo: 'Ativo', tom: 'verde' },
  observacao: { rotulo: 'Em observação', tom: 'amarelo' },
};

export default function SegurancaPagamento() {
  return (
    <>
      <Cartao titulo="Caminho de um pagamento" descricao="Quem faz o quê, do clique ao download. O navegador nunca decide valor nem confirma pagamento.">
        <ol className="space-y-3">
          {CAMINHO.map((p, i) => (
            <li key={p.texto} className="flex gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-photo-primary font-mono text-caption text-white" aria-hidden="true">{i + 1}</span>
              <div>
                <Pilula tom={p.quem === 'Servidor' ? 'lilas' : p.quem === 'Stripe' ? 'azul' : 'cinza'}>{p.quem}</Pilula>
                <p className="mt-1 text-body-sm">{p.texto}</p>
              </div>
            </li>
          ))}
        </ol>
      </Cartao>

      <Cartao titulo="Controles contra troca de valores, de gateway e pagamentos forjados">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-body-sm">
            <thead>
              <tr className="bg-painel-cabecalho font-mono text-caption uppercase text-painel-texto2">
                <th scope="col" className="px-3 py-2">Controle</th>
                <th scope="col" className="px-3 py-2">Camada</th>
                <th scope="col" className="px-3 py-2">Situação</th>
              </tr>
            </thead>
            <tbody>
              {CONTROLES.map((c) => (
                <tr key={c.texto} className="border-t border-painel-divisor align-top">
                  <td className="px-3 py-2">{c.texto}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{c.camada}</td>
                  <td className="px-3 py-2"><Pilula tom={SITUACAO[c.situacao].tom}>{SITUACAO[c.situacao].rotulo}</Pilula></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Cartao>
    </>
  );
}
