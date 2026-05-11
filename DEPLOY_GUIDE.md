# Eranildo Relativity Lab — Deployment Guide

## ✅ Completed Steps

### 1. GitHub Repository Created
- **Repository**: https://github.com/MurilloRoseno/eranildo-relativity-lab
- **Commits**:
  - `2437060`: Initial landing page implementation
  - `2bcfa59`: Vercel configuration
  - `e07949b`: .vercelignore setup

### 2. Code Committed & Pushed
All source code is on GitHub `main` branch, ready for deployment:
```bash
- time-dilation/          # React + Vite project
  ├── src/                # Components, hooks, libraries
  ├── public/             # Static assets
  ├── package.json        # Dependencies
  ├── vite.config.js      # Build config
  ├── tailwind.config.js  # Styling
  ├── vercel.json         # Deployment config
  └── .vercelignore       # Exclude files from deploy
```

---

## 🚀 Next Step: Deploy to Vercel

### Option A: Quick Deploy (Recommended)

1. **Go to Vercel**:
   - Visit https://vercel.com/dashboard

2. **Import Project**:
   - Click "Add New..." → "Project"
   - Select "Import Git Repository"
   - Connect GitHub account if needed
   - Select `eranildo-relativity-lab` repository

3. **Configure Project**:
   - **Project Name**: `eranildo-relativity-lab`
   - **Framework Preset**: Vite
   - **Root Directory**: `time-dilation/`
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `dist` (auto-detected)
   - Click "Deploy"

4. **Wait for Build**:
   - Vercel will build and deploy automatically
   - Takes ~2-3 minutes

### Option B: Deploy via Vercel CLI (from terminal)

```bash
cd time-dilation/

# Login to Vercel (interactive)
vercel login

# Deploy to production
vercel --prod --name eranildo-relativity-lab
```

---

## 🌐 Configure Custom Domain

After deployment, configure the domain name:

1. **In Vercel Dashboard**:
   - Go to Project Settings
   - Click "Domains"
   - Add domain: **eranildo-relativity-lab.vercel.app** (auto-assigned)

2. **Optional Custom Domain**:
   - Use your own domain (e.g., `relativity.eranildo.com`)
   - Add DNS records pointing to Vercel

---

## 📋 Verification Checklist

After deployment, verify:

- [ ] Production URL loads without errors: `https://eranildo-relativity-lab.vercel.app`
- [ ] Hero section displays with "O Tempo é Relativo" title
- [ ] Calculator works: inputs accept values, calculate button responds
- [ ] Simulation plays: Earth vs Ship timeline animates
- [ ] FAQ accordion opens/closes
- [ ] Responsive design on mobile (test via DevTools)
- [ ] Footer shows "Eranildo Relativity Lab" and credits for "Eranildo Sobral"

---

## 🔧 Post-Deployment

If you need to make changes:

1. **Make code changes locally**
2. **Commit and push**:
   ```bash
   git add .
   git commit -m "feat: describe changes"
   git push github main
   ```
3. **Vercel auto-deploys** from `main` branch

To disable auto-deploy:
- Vercel Dashboard → Project Settings → Git → Uncheck "Automatic Deployments"

---

## 📞 Troubleshooting

### Build fails?
- Check `vercel.json` has correct `outputDirectory: "dist"`
- Ensure `package.json` is in `time-dilation/` folder
- Run `npm install && npm run build` locally to test

### Page doesn't load?
- Clear cache: Cmd+Shift+R (Windows/Linux) or Cmd+Option+R (Mac)
- Check browser console for errors (F12)
- Verify Vercel deployment shows "Ready" status

### Wrong domain name?
- Visit Vercel Dashboard → Domains
- Remove incorrect domain
- Add correct domain (or keep auto-assigned `vercel.app`)

---

## 📊 Project Info

| Aspect | Detail |
|--------|--------|
| **Repository** | https://github.com/MurilloRoseno/eranildo-relativity-lab |
| **Build Tool** | Vite |
| **Framework** | React 18 |
| **Styling** | Tailwind CSS v3 |
| **Deployment** | Vercel (serverless) |
| **Domain** | `eranildo-relativity-lab.vercel.app` |

---

## ✨ Credits

- **Idealized by**: Eranildo Sobral
- **Developed by**: Murillo Lima
- **Inspired by**: Omni Calculator, Interstellar

---

**Last Updated**: May 11, 2026
