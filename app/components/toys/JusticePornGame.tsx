'use client';

import storyJson from '@/data/toys/justice-porn.json';
import type { RawTwineStory } from '@/lib/toys/twine-engine';
import IllustratedTwineGame, {
  type ToyCharacter,
  type ToyScene,
} from './IllustratedTwineGame';

const story = storyJson as RawTwineStory;

const defenseAttorney: ToyCharacter = {
  src: 'https://puhixbchomgvn0ti.public.blob.vercel-storage.com/toys/justice-porn/defense-attorney-xq7kkgT20LYmYH7VBWuRF8cQAx11yb.webp',
  alt: 'A young defense attorney in a protective smock and gloves, exhausted and horrified by the proceeding',
  label: 'Defense attorney',
  width: 971,
  height: 1619,
};

export const justicePornScenes: readonly ToyScene[] = [
  {
    id: 'sentencing-court',
    title: 'The sentencing court',
    src: 'https://puhixbchomgvn0ti.public.blob.vercel-storage.com/toys/justice-porn/courtroom-g0Xzy1umwB05ziSOk6A1HDqL2LSc16.webp',
    alt: 'A courthouse where an old wooden bench meets a sterile tiled execution chamber and floor drain',
    character: defenseAttorney,
    passages: [
      'Start',
      "didn't waste time",
      'humanity',
      'service pistol',
      'sentencing',
    ],
  },
  {
    id: 'execution-floor',
    title: 'The execution floor',
    src: 'https://puhixbchomgvn0ti.public.blob.vercel-storage.com/toys/justice-porn/backgrounds/execution-floor-3ozgvP2X9CUPfYhQf0fjUMCXXnt4lO.webp',
    alt: 'A merciless tiled execution floor with drains, wash stations, hanging smocks, and empty observation bleachers',
    character: defenseAttorney,
    passages: [
      'drain',
      'sentencing procedures',
      'eventually',
      'hammer',
      'killed somebody',
      'This man could have killed somebody',
      'falls',
      'buck the system',
      'mercy',
    ],
  },
  {
    id: 'cleanup-chamber',
    title: 'Counsel chamber',
    src: 'https://puhixbchomgvn0ti.public.blob.vercel-storage.com/toys/justice-porn/backgrounds/cleanup-chamber-gitRm1Q5dEm7hqeMr223qx8PpnG2GE.webp',
    alt: 'A dark wooden counsel chamber merging into a sterile cleanup vestibule',
    character: defenseAttorney,
    passages: ['calls a time', 'putting bullets in faces'],
  },
];

export default function JusticePornGame() {
  return (
    <IllustratedTwineGame
      endingTitles={{ 'putting bullets in faces': 'Justice must be served' }}
      openingLabel="The verdict"
      primary="#ff5f66"
      primaryRgb="255, 95, 102"
      progressLabel="Procedure"
      scenes={justicePornScenes}
      secondary="#f1b24b"
      sideNotes={[
        'The law calls this justice.',
        'The gallery came to watch.',
      ]}
      story={story}
    />
  );
}
