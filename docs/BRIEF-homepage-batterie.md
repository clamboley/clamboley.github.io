# Site vitrine — homepage « batterie en première personne »

## Vision

Page d'accueil sans aucun élément d'interface classique : ni bouton, ni menu. On est en vue première personne, assis derrière une batterie sur scène, public dans la pénombre de la salle. La souris déplace le regard. Quand on regarde un fût ou une cymbale, il s'illumine et le nom de sa destination apparaît. Au clic, des mains avec baguettes apparaissent (invisibles au repos), jouent un fill court **déterministe et propre à cet élément**, puis on est redirigé vers la page ou l'app correspondante. Chaque élément porte le logo de sa destination sur la peau ou le dôme.

Un prototype fonctionnel existe : `proto-batterie.html` (à la racine du repo). Il valide toute la boucle d'interaction — caméra souris, raycast au centre de l'écran, highlight émissif, fill synthétisé avec shake caméra synchronisé, foule instanciée, écran de redirection. **Il sert de référence d'interaction et de structure, pas de qualité visuelle.** Le look actuel « jeu vidéo début 3D » doit disparaître au profit d'un rendu cinématographique.

## Moyens disponibles

- PC sous Ubuntu (dev local), Node récent, Blender installable.
- Accès à des serveurs H100 : génération d'assets 3D via modèles open weights image-to-3D (TRELLIS 2, licence MIT, matériaux PBR ; ou Hunyuan3D 2.1, textures très détaillées). Pipeline : image de référence → GLB → nettoyage/décimation dans Blender → intégration.
- Je suis batteur : les fills seront de **vrais enregistrements audio** (un par élément), pas de la synthèse. Je fournirai les samples + on générera un JSON de timestamps des frappes pour la synchro visuelle.

## Expérience détaillée (machine à états)

1. **idle** — caméra POV (~1,35 m de hauteur), léger balancement respiratoire. Souris → yaw/pitch bornés (on reste « assis »). Mains invisibles. La scène vit : spots qui respirent, foule qui bouge légèrement, lumières de téléphones qui scintillent.
2. **hover** — raycast depuis le centre de l'écran (pas depuis le curseur). L'élément visé s'illumine (émissif + très léger scale) et un tooltip discret affiche le nom de la destination. Curseur pointer.
3. **fill** (au clic) — les mains + baguettes apparaissent (fade très court), jouent le fill de l'élément. Synchronisés sur les timestamps du sample : animation des mains, flash émissif de chaque élément frappé, micro-shake caméra, wobble des cymbales touchées, petit boost d'énergie de la foule. Durée cible 0,8–1,2 s. Input verrouillé pendant le fill.
4. **redirect** — fondu élégant (pas de cut sec) puis `window.location.href` vers la destination.

## Mapping éléments → destinations

À centraliser dans un unique fichier de config (`src/kit.config.ts`) : position, destination, logo, sample, animation. Table à compléter par moi, valeurs actuelles du proto en placeholder :

| Élément | Destination |
|---|---|
| Grosse caisse | À propos |
| Caisse claire | Mes apps |
| Tom 1 | GitHub |
| Tom 2 | LinkedIn |
| Tom basse | Blog |
| Charleston | CV |
| Crash | Contact |
| Ride | Musique |

## Direction artistique

- Concert réel, salle sombre. Le kit est le héros, éclairé chaud et précis ; tout le reste est suggéré : contre-jours colorés, faisceaux dans la brume, silhouettes du public, lumières de téléphones.
- Kit réaliste en GLB PBR. Les reflets sur les fûts (finition sparkle) et les cymbales sont essentiels → **environment map obligatoire**.
- Post-processing : bloom léger, vignette, grain subtil ; SSAO si le budget perf le permet. C'est l'éclairage + le post-processing qui feront 80 % du saut de qualité, pas le nombre de polygones.
- Foule : silhouettes instanciées suffisent si l'éclairage est bon. Bras levés / téléphones en bonus.

## Stack & contraintes techniques

- Vite + TypeScript + Three.js (React Three Fiber acceptable si ça simplifie vraiment). Site 100 % statique.
- Assets : GLB compressé Draco, textures KTX2 ; budget < 8 Mo pour le premier rendu, chargement progressif avec écran de chargement (idée : roulement de tambour qui monte).
- Audio : Web Audio API. Un sample de fill par élément + ambiance de foule discrète en boucle (démarrée après le premier geste utilisateur — contrainte autoplay). Timestamps de frappes par fill dans un JSON pour piloter les visuels.
- Perf : 60 fps sur desktop milieu de gamme, `devicePixelRatio` plafonné, ombres uniquement si peu coûteuses.

## Mains + baguettes (le point délicat)

- Invisibles en idle, apparaissent au clic, une animation par élément, alignée sur les timestamps du sample correspondant.
- Options par ordre de préférence :
  1. Mains gantées low-poly riggées + 8 clips d'animation keyframés dans Blender, exportés dans le GLB ;
  2. Baguettes seules animées, sans mains (plan B tout à fait acceptable visuellement en première personne) ;
  3. Asset existant (acheté ou CC) de mains first-person adapté.
- Commencer par le plan B (baguettes seules) pour débloquer le reste, upgrader ensuite.

## Fallbacks, SEO, accessibilité

- Mobile/tactile : drag pour regarder, tap pour cliquer. Si WebGL indisponible ou device faible → fallback : liste stylée des destinations sur une photo du kit.
- SEO : la page canvas doit contenir un `<nav>` sémantique visuellement caché mais accessible aux crawlers et lecteurs d'écran, plus title/meta/Open Graph corrects.
- Clavier : Tab cycle les éléments du kit (focus = même highlight que le hover), Entrée = fill + redirection.
- `prefers-reduced-motion` : réduire shake, bob et scintillements.

## Étapes proposées

1. Repo Vite + TS, portage propre du proto : config kit centralisée, machine à états explicite, mêmes interactions. Le proto reste dans le repo comme référence.
2. Intégration d'un GLB de kit réaliste (temporaire : Sketchfab CC) + éclairage travaillé + env map + post-processing → **valider le look avant tout le reste**.
3. Remplacement de l'audio par mes vrais samples + JSON de timestamps + synchro visuelle.
4. Baguettes animées (puis mains si concluant).
5. Assets définitifs générés sur H100 si le GLB temporaire ne suffit pas.
6. Fallback mobile, SEO, accessibilité, optimisation, déploiement statique (Cloudflare Pages ou équivalent).

Chaque étape doit laisser le site dans un état présentable et déployable.
