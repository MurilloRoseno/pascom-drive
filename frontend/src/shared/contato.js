import { useEffect, useState } from 'react';
import { obterFaq } from '../lib/api.js';

/**
 * Contato da secretaria e estado do assistente, vindos de /api/faq (o único endpoint público que
 * expõe esses dois campos da configuração). Carregado uma vez por visita e compartilhado; se a
 * API falhar, o site continua com o número da secretaria que já existia no código.
 */
export const WHATSAPP_PADRAO = '5599991646063';

const FALHA = { whatsapp: WHATSAPP_PADRAO, assistenteAtivo: false };
let promessa = null;

export function carregarContato() {
  if (!promessa) {
    promessa = obterFaq()
      .then((d) => ({ whatsapp: d.whatsapp || WHATSAPP_PADRAO, assistenteAtivo: Boolean(d.assistenteAtivo) }))
      .catch(() => {
        promessa = null;
        return FALHA;
      });
  }
  return promessa;
}

/** Só para testes. */
export function reiniciarContato() {
  promessa = null;
}

export const linkWhatsapp = (numero) => `https://wa.me/${numero}`;

/** @returns {{ whatsapp: string, assistenteAtivo: boolean }} */
export function useContato() {
  const [contato, setContato] = useState(FALHA);
  useEffect(() => {
    let ativo = true;
    carregarContato().then((c) => ativo && setContato(c));
    return () => { ativo = false; };
  }, []);
  return contato;
}
