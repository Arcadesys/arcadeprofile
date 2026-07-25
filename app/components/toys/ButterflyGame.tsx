'use client';

import storyJson from '@/data/toys/butterfly-exe.json';
import { BUTTERFLY_ENDINGS } from '@/lib/toys/butterfly-endings';
import type { RawTwineStory } from '@/lib/toys/twine-engine';
import IllustratedTwineGame, {
  type ToyCharacter,
  type ToyScene,
} from './IllustratedTwineGame';

const story = storyJson as RawTwineStory;

const sherry: ToyCharacter = {
  src: 'https://puhixbchomgvn0ti.public.blob.vercel-storage.com/toys/butterfly-exe/sherry-Q2JPNwmCJLzh4BW8cpigGjMszyh8jS.webp',
  alt: 'Sherry, head shaved for her upload procedure, holding her datapad with a brave, worried smile',
  label: 'Sherry',
  width: 971,
  height: 1619,
};

export const butterflyScenes: readonly ToyScene[] = [
  {
    id: 'virtuport-prep',
    title: 'Virtuport preparation room',
    src: 'https://puhixbchomgvn0ti.public.blob.vercel-storage.com/toys/butterfly-exe/virtuport-prep-xMxqVTM556H0JLsEd1UniHDt3YW7QM.webp',
    alt: 'A near-future medical preparation room overlooking a dense city at night',
    character: sherry,
    passages: [
      'Start',
      'Establishing',
      'Conversation 1',
      'Conversation 2',
      'Conversation 3',
      'I Want to Join You',
      'Discomfort',
      'The world is bland',
      'Bland',
      'Memory',
      'Memories?',
      'Poem',
      'Kiss',
      'The Kiss Ends',
      'Quiet',
      'Go Back Immediately',
    ],
  },
  {
    id: 'neighborhood-bar',
    title: 'Outside Virtuport',
    src: 'https://puhixbchomgvn0ti.public.blob.vercel-storage.com/toys/butterfly-exe/neighborhood-bar-Bl81IO0XYeY5P5yKZhP01pJTt9435k.webp',
    alt: 'A worn neighborhood bar looking onto a blazing elevated highway and the Virtuport district',
    passages: [
      "I can't",
      'Go Outside',
      'Go to your favorite bar',
      'Celebrating',
      'Grieving',
      'Missed the time',
    ],
  },
  {
    id: 'operating-theater',
    title: 'The upload theater',
    src: 'https://puhixbchomgvn0ti.public.blob.vercel-storage.com/toys/butterfly-exe/backgrounds/operating-theater-gz8ZGsGc0llLMAXEaMUEF57csD977n.webp',
    alt: 'A cold blue mind-upload operating theater with scanner arms, a saline bath, and fiber-optic cables',
    passages: ['Scrub In', 'Ice Pack', 'A moment of doubt'],
  },
  {
    id: 'recovery-lounge',
    title: 'Post-operative recovery',
    src: 'https://puhixbchomgvn0ti.public.blob.vercel-storage.com/toys/butterfly-exe/backgrounds/recovery-lounge-0SChEK8ohI4w9ZLdR1F5YyjtYw5qHX.webp',
    alt: 'An empty futuristic recovery lounge under predawn blue light',
    passages: ['Waiting Room', 'Going home'],
  },
  {
    id: 'virtual-castle',
    title: 'The other side',
    src: 'https://puhixbchomgvn0ti.public.blob.vercel-storage.com/toys/butterfly-exe/virtual-castle-RcSDWBLfX0VrA57EbAierSjSFB8QVR.webp',
    alt: 'A crystal virtual bedroom with floating code windows and sunlight reflecting across a water-like bed',
    character: sherry,
    passages: ['Port In'],
  },
  {
    id: 'simulation-field',
    title: 'A beautiful simulation',
    src: 'https://puhixbchomgvn0ti.public.blob.vercel-storage.com/toys/butterfly-exe/backgrounds/simulation-field-uh2qxj8qDtxAlp5l78R3rT3kyYyrFC.webp',
    alt: 'An unnaturally perfect simulated meadow with faint grid seams and a crystal city dissolving into data',
    passages: ['Angry Port In'],
  },
  {
    id: 'empty-apartment',
    title: 'The apartment after',
    src: 'https://puhixbchomgvn0ti.public.blob.vercel-storage.com/toys/butterfly-exe/backgrounds/empty-apartment-AsQogDJ46KCteODe8O7a6vWINUngg6.webp',
    alt: 'A dark shared apartment with an unmade bed, a laptop glow, and a small memorial urn',
    passages: ['Good Night'],
  },
];

const endingTitles = Object.fromEntries(
  BUTTERFLY_ENDINGS.map(({ id, title }) => [id, title]),
);

export default function ButterflyGame() {
  return (
    <IllustratedTwineGame
      endingTitles={endingTitles}
      openingLabel="The night before"
      primary="#6fd3e0"
      primaryRgb="111, 211, 224"
      progressLabel="Memories held"
      scenes={butterflyScenes}
      secondary="#d8a657"
      sideNotes={[
        'Sherry uploads tonight.',
        'Three endings wait on the other side.',
      ]}
      story={story}
      versePassages={new Set(['Poem'])}
    />
  );
}
