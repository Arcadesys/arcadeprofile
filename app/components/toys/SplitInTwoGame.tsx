'use client';

import storyJson from '@/data/toys/the-day-i-split-in-two.json';
import type { RawTwineStory } from '@/lib/toys/twine-engine';
import IllustratedTwineGame, {
  type ToyCharacter,
  type ToyScene,
} from './IllustratedTwineGame';

const story = storyJson as RawTwineStory;

const tally: ToyCharacter = {
  src: 'https://puhixbchomgvn0ti.public.blob.vercel-storage.com/toys/the-day-i-split-in-two/tally-Nen7wr4uptA84XmqIdZqU2OMYqHKAw.webp',
  alt: 'Tally, a white anthropomorphic fox with two star-flecked tails, holding out one reassuring paw',
  label: 'Tally',
  width: 971,
  height: 1619,
};

const apartmentPassages = [
  'The Room',
  'Terror',
  'This Year',
  'Five',
  'Four',
  'Three',
  'Two',
  'One',
];

export const splitInTwoScenes: readonly ToyScene[] = [
  {
    id: 'uptown-office',
    title: 'Uptown, Chicago',
    src: 'https://puhixbchomgvn0ti.public.blob.vercel-storage.com/toys/the-day-i-split-in-two/backgrounds/uptown-office-C9YQGSrEph98uzHgCy8POpmODuLAWy.webp',
    alt: 'A warm therapist office overlooking Chicago at night, centered on one deep reclining chair',
    passages: [
      'Start',
      'Puberty',
      'spouting bravado',
      'believe yourself.',
      'another story.',
    ],
  },
  {
    id: 'indianapolis-apartment',
    title: 'Indianapolis, Spring 2009',
    src: 'https://puhixbchomgvn0ti.public.blob.vercel-storage.com/toys/the-day-i-split-in-two/apartment-vJAwxxutyLHuEBLTnaiQ4doUATL8o3.webp',
    alt: 'A modest apartment at night with moving boxes, rumpled bedding, floor cushions, and purple light',
    passages: apartmentPassages,
  },
  {
    id: 'purple-threshold',
    title: 'Going under',
    src: 'https://puhixbchomgvn0ti.public.blob.vercel-storage.com/toys/the-day-i-split-in-two/backgrounds/purple-threshold-Fomeqqxha6xDdg9JqyPdWIXsSUW6hS.webp',
    alt: 'A path forming from deep purple mist beneath galaxies and a faint trail of two-tailed footprints',
    character: tally,
    passages: [
      'Going Under',
      'Fox',
      'Real',
      'Trouble',
      'Here to help',
      'life',
      'in my head',
    ],
  },
  {
    id: 'interview',
    title: 'The job interview',
    src: 'https://puhixbchomgvn0ti.public.blob.vercel-storage.com/toys/the-day-i-split-in-two/backgrounds/interview-PUwG6YWdVNg8F8MHOZ68hmszPU14k4.webp',
    alt: 'An empty corporate interview room with a lunch booth visible beyond a glass partition',
    character: tally,
    passages: ['Does it matter?', 'plan to be a girl'],
  },
  {
    id: 'family-ruins',
    title: 'The family house',
    src: 'https://puhixbchomgvn0ti.public.blob.vercel-storage.com/toys/the-day-i-split-in-two/backgrounds/family-ruins-vTMpRlKtgXaKZTPSlZmtZcw96LU1sm.webp',
    alt: 'A roofless family house of blackened brick and fading embers beneath a purple dawn',
    character: tally,
    passages: [
      'She takes over while I rage.',
      'without revealing my hand',
      'God help me.',
      'anger',
      'burnt',
    ],
  },
  {
    id: 'inside',
    title: 'The house inside',
    src: 'https://puhixbchomgvn0ti.public.blob.vercel-storage.com/toys/the-day-i-split-in-two/dream-house-dmJ5eDyRWyJDkueRoh1kvOR1brjLvr.webp',
    alt: 'An unfinished brick house standing in purple mist beneath windows into distant galaxies',
    character: tally,
    passages: [
      'Mental breaks',
      'We rebuilt together.',
      'mortar and trowel in one hand, bricks in the other',
      'alone',
      'enough for me',
    ],
  },
];

export default function SplitInTwoGame() {
  return (
    <IllustratedTwineGame
      endingTitles={{ 'enough for me': 'Enough for me' }}
      openingLabel="The chair"
      primary="#c78cff"
      primaryRgb="199, 140, 255"
      progressLabel="Bricks laid"
      scenes={splitInTwoScenes}
      secondary="#ffad5c"
      sideNotes={[
        'Tally calls herself Kitsune.',
        'Rebuilding is hard.',
      ]}
      story={story}
    />
  );
}
