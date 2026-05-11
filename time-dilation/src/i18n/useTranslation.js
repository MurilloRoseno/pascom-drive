import { useContext } from 'react';
import { LanguageContext } from './LanguageProvider';
import ptBR from './pt-BR';
import en from './en';

export function useTranslation() {
  const { lang } = useContext(LanguageContext);
  const dict = lang === 'en' ? en : ptBR;

  return (key) => {
    const keys = key.split('.');
    let value = dict;
    for (const k of keys) {
      value = value?.[k];
    }
    return value ?? key;
  };
}
