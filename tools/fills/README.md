# Fills sur partition (MuseScore)

Corentin écrit chaque fill dans MuseScore, Claude convertit et intègre.

## Écrire la partition

- Une partition **par élément**, portée batterie (Drumset), au **tempo réel du
  morceau** (mettre l'indication de tempo dans la partition : elle est exportée
  dans le MIDI et cale les baguettes).
- Voix disponibles : grosse caisse, caisse claire, tom aigu, tom médium, floor,
  charleston, crash, ride. Le reste (cowbell, splash…) sera ignoré.
- L'élément cliqué doit **apparaître dans son fill** ; où la phrase se termine
  est un choix musical libre.
- Viser **2,5 s maximum** de matière : la redirection part 0,45 s après la
  dernière frappe.
- Les nuances comptent : elles deviennent les vélocités des frappes.

## Exporter

Pour chaque fill, deux exports depuis la même partition :

1. **MIDI** (`.mid`) → `tools/fills/scores/<element>.mid` — le timing des
   baguettes.
2. **Audio** (`.wav`, banque Muse Sounds de préférence) →
   `tools/fills/audio/<element>.wav` — la source, encodée en MP3 ensuite
   (le synthé ne sert plus que de secours si le fichier manque).

`<element>` ∈ `kick`, `snare`, `tom1` (aigu), `tom2` (médium), `floor`,
`hihat`, `crash`, `ride`.

## Convertir (Claude)

```bash
node tools/fills/midi2fill.mjs tools/fills/scores/floor.mid samples/fills/floor.mp3
./tools/fills/encode.sh   # WAV → MP3 (LAME V2) dans public/samples/fills/
```

imprime le littéral `Fill` (ajouter `--tempo <bpm>` si l'export audio a été
rendu à un autre tempo que celui inscrit dans le MIDI — cas d'un « ♩. = » en 12/8) à coller dans `src/audio/songFills.ts`. Les chemins
de samples sont relatifs à `public/`, sans slash initial (résolus par rapport à
la page). L'alignement WAV/MIDI suppose que les deux exports partent du même
début de partition.

Si une note ne tombe pas sur le bon fût pour une partition donnée, `--map 48:tom1`
redirige cette note GM pour ce fill seul.

## Doigté

Le doigté ne voyage pas dans le MIDI : Corentin le donne en clair (une lettre
par coup de baguette dans l'ordre, pied exclu ; `B` = les deux mains sur un
accord, gauche sur le fût le plus à gauche) et Claude le passe au
convertisseur : `--sticking RLRLRLR`. Sans doigté, les baguettes choisissent
elles-mêmes (droite mène, caisse claire gauche, charley droite, accords non
croisés).

## Correspondance General MIDI

| GM             | Élément |
| -------------- | ------- |
| 35, 36         | kick    |
| 37, 38, 40     | snare   |
| 48, 50         | tom1    |
| 45, 47         | tom2    |
| 41, 43         | floor   |
| 42, 44, 46     | hihat   |
| 49, 52, 55, 57 | crash   |
| 51, 53, 59     | ride    |
