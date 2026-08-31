# vitrine

Site vitrine dont la page d'accueil est une batterie en vue première personne, sur scène :
la souris déplace le regard, chaque fût ou cymbale mène vers une destination (à propos,
apps, GitHub, LinkedIn, blog, CV, contact, musique). Au clic, un fill est joué, puis on est
redirigé. Ni bouton, ni menu.

Le brief complet est dans [`docs/BRIEF-homepage-batterie.md`](docs/BRIEF-homepage-batterie.md) ;
le prototype d'origine, référence d'interaction (pas de qualité visuelle), est conservé dans
[`docs/proto-batterie.html`](docs/proto-batterie.html).

## Stack

Vite · TypeScript · Three.js · Web Audio API · site 100 % statique.

## Développement

```sh
npm install
npm run dev        # http://127.0.0.1:5173 (en dev, la redirection propose un retour sur scène)
npm run check      # lint + format + typecheck + tests + build, ce que la CI exécute
npm run build      # → dist/   (BASE_PATH=/vitrine/ pour un déploiement en sous-chemin)
npm run preview    # sert dist/ ; ajouter ?stay à l'URL pour ne pas quitter la page au clic
```

Node ≥ 22.12 (`.nvmrc` → 24).

## Où modifier quoi

| Quoi                                               | Où                                                        |
| -------------------------------------------------- | --------------------------------------------------------- |
| Destinations, logos, positions, samples du kit     | `src/kit.config.ts` (source de vérité unique)             |
| Nom, tagline, métadonnées, URL canonique           | `src/site.config.ts` (injecté dans `index.html` au build) |
| Machine à états idle → hover → fill → redirect     | `src/app/StateMachine.ts`                                 |
| Orchestration (scène, entrées, audio, HUD, boucle) | `src/app/App.ts`                                          |
| Kit, foule, lumières, caméra POV                   | `src/scene/`                                              |
| Fills (timeline de frappes) et audio               | `src/audio/`                                              |
| HUD, écran de redirection, fallback sans WebGL     | `src/ui/`                                                 |

## Conventions

- Commits sur `main`, messages [Conventional Commits](https://www.conventionalcommits.org/), un tag par étape validée.
- Code et commits en anglais, contenu du site en français.
- `npm run check` doit passer avant de pousser.

## Déploiement

GitHub Pages via `.github/workflows/ci.yml` (push sur `main` → build avec `BASE_PATH=/vitrine/` → déploiement).
Le dépôt GitLab garde la même vérification dans `.gitlab-ci.yml`.
