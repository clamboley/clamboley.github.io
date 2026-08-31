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

## Rendu (étape 2)

- Kit procédural piloté par la config (coques clearcoat « sparkle », cercles/tirants/coquilles chrome,
  cymbales lathées anisotropes, pieds tripodes, pédale) — `src/scene/DrumKit.ts`, `materials.ts`, `textures.ts`.
- Env map **procédurale** (rig de PAR chauds, contre-jours magenta/bleu) rendue en PMREM au démarrage,
  aucun asset à télécharger — `src/scene/Environment.ts`.
- Éclairage : clé chaude avec ombres, contre-jours colorés, faisceaux volumétriques additifs qui balaient
  la scène, wash bleu sur la foule — `src/scene/StageLights.ts`, `Beams.ts`.
- Post-processing (`postprocessing`) : bloom, tone mapping AgX, SMAA, grain, vignette — `src/scene/PostProcessing.ts`.
- En dev, l'app est exposée sur `window.app` pour inspecter la scène depuis la console.

Les kits Sketchfab CC-BY repérés pour remplacer le kit procédural (téléchargement avec un compte) :
« Burgundy Drum Kit by Opal » (Glowbox 3D) et « Drum Kit » (art.katja).

## Conventions

- Commits sur `main`, messages [Conventional Commits](https://www.conventionalcommits.org/), un tag par étape validée.
- Code et commits en anglais, contenu du site en français.
- `npm run check` doit passer avant de pousser.

## Déploiement

GitHub Pages via `.github/workflows/ci.yml` (push sur `main` → build avec `BASE_PATH=/vitrine/` → déploiement).
Le dépôt GitLab garde la même vérification dans `.gitlab-ci.yml`.
