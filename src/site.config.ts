/** Identity and metadata of the site (injected into index.html at build time). */
export const site = {
  lang: 'fr',
  name: 'Corentin Lamboley',
  tagline: 'ingénieur · batteur',
  title: 'Corentin Lamboley — ingénieur · batteur',
  description:
    'Assieds-toi derrière la batterie : chaque fût et chaque cymbale mène vers une facette de mon travail.',
  /** Canonical URL of the deployed site (Open Graph). */
  url: 'https://clamboley.github.io/vitrine/',
  /** Looping crowd bed, relative to `public/`; level is a gain under the drums. */
  ambience: { file: 'audio/crowd-ambience.mp3', level: 0.16 },
  /** One stick click for the count-in (MuseScore MS Basic), relative to `public/`. */
  countIn: { sample: 'samples/stick.wav' },
} as const;
