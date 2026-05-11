# Eranildo Relativity Lab — Calculadora de Dilatação do Tempo

Uma calculadora interativa e educacional sobre **dilatação do tempo relativístico**, baseada na Teoria da Relatividade Especial de Albert Einstein.

## 🚀 Recursos

- **4 Modos de Cálculo**: Tempo dilatado, tempo próprio, velocidade, fator de Lorentz
- **Simulação Interativa**: Visualize Terra vs Nave em tempo real
- **Unidades Ricas**: m/s, km/s, % da velocidade da luz, segundos, anos, etc.
- **Didática Completa**: 5 seções explicando o cálculo + 7 perguntas frequentes
- **Design Premium**: Paleta espacial dark, tipografia editorial, animações suaves
- **Validações Científicas**: Previne velocidades ≥ c, valores inválidos

## 🎯 Stack

- **React 18** + Vite (desenvolvimento rápido)
- **Tailwind CSS v3** (styling responsivo)
- **Framer Motion** (animações)
- **KaTeX** (renderização de fórmulas LaTeX)
- **Lucide React** (ícones)

## 📦 Instalação

```bash
npm install
npm run dev
```

Servidor rodará em `http://localhost:5173`

## 🔨 Build

```bash
npm run build
```

Gera a pasta `dist/` pronta para produção.

## 🌐 Deploy

Deployado na **Vercel** em: https://eranildo-relativity-lab.vercel.app

## 📚 Física

A calculadora implementa:

```
Δt' = Δt × γ
onde: γ = 1 / √(1 - v²/c²)
```

Todos os cálculos são validados e testados contra casos conhecidos:
- v = 0.5c, Δt = 1 ano → Δt' ≈ 1.1547 anos
- v = 0.99c, Δt = 1 ano → Δt' ≈ 7.09 anos

## 💡 Inspiração

Projeto inspirado na [Omni Calculator](https://www.omnicalculator.com/pt/fisica/calculadora-dilatacao-do-tempo) e em conceitos cinematográficos de *Interstellar*.

## 👤 Créditos

**Idealizador**: Eranildo Sobral  
**Desenvolvimento**: Murillo Lima

---

**Última atualização**: Maio de 2026
