import { moduloLigado, useSite } from './site.js';

export {
  WHATSAPP_PADRAO, formatarTelefone, linkWhatsapp,
} from './site.js';

/**
 * Contato da secretaria e estado do assistente, a partir do conteúdo do site (/api/site).
 * WhatsApp vazio = a paróquia escolheu não mostrar: quem usa esconde o botão.
 * O assistente só aparece com o interruptor ligado no painel E o módulo de ajuda no ar.
 * @returns {{ whatsapp: string, assistenteAtivo: boolean }}
 */
export function useContato() {
  const site = useSite();
  return {
    whatsapp: site.whatsapp || '',
    assistenteAtivo: Boolean(site.assistenteAtivo) && moduloLigado(site, 'ajuda'),
  };
}
