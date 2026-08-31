# vitrine — notes pour Claude Code

- Le brief (vision, machine à états, DA, étapes) : `docs/BRIEF-homepage-batterie.md`. Le lire avant toute évolution.
- `docs/proto-batterie.html` est la référence d'interaction d'origine ; ne pas le modifier.
- Source de vérité du kit : `src/kit.config.ts`. Identité du site : `src/site.config.ts`.
- `npm run check` (lint, prettier, typecheck, vitest, build) doit passer avant chaque commit.
- Imports relatifs avec extension `.ts` (la config Vite est chargée nativement par Node).
- Commits Conventional Commits en anglais, directement sur `main`. Contenu utilisateur en français.
- Chaque étape du brief doit laisser le site présentable et déployable.
