'use client';

import storyJson from '@/data/toys/shoot-em-up.json';
import type { RawTwineStory } from '@/lib/toys/twine-engine';
import IllustratedTwineGame, {
  type ToyCharacter,
  type ToyPassageMedia,
  type ToyScene,
} from './IllustratedTwineGame';

const story = storyJson as RawTwineStory;

const theDude: ToyCharacter = {
  src: 'https://puhixbchomgvn0ti.public.blob.vercel-storage.com/toys/shoot-em-up/the-dude-PGeqPcfp0URh4kkjNIUYl8PIhtZ5CJ.webp',
  alt: 'A skinny man with shaggy hair holding an empty teacup and looking politely confused',
  label: 'The Dude',
  width: 971,
  height: 1619,
};

export const shootEmUpScenes: readonly ToyScene[] = [
  {
    id: 'the-room',
    title: 'A room with a guy',
    src: 'https://puhixbchomgvn0ti.public.blob.vercel-storage.com/toys/shoot-em-up/room-0WJO7OjVDnYupKZdQZEfolBkfv5weM.webp',
    alt: 'A deliberately plain room with a small table, a tea service, two chairs, and one dramatic ceiling light',
    character: theDude,
    passages: ['Start', 'The Dude', 'Inventory', '01', '02', '03', '04'],
  },
  {
    id: 'the-appeals',
    title: 'One last appeal',
    src: 'https://puhixbchomgvn0ti.public.blob.vercel-storage.com/toys/shoot-em-up/backgrounds/appeals-ffe1eYhcqd9l7XUtvLYirJ4OO4y1AS.webp',
    alt: 'The same shabby room crowded with projected puppies, kittens, soft toys, and desperate appeals',
    character: theDude,
    passages: ['05', '06', '07', '08', '09', '10', '11', '12'],
  },
  {
    id: 'tea-time',
    title: 'Tea time',
    src: 'https://puhixbchomgvn0ti.public.blob.vercel-storage.com/toys/shoot-em-up/backgrounds/tea-time-jozTVt5Fj4GNgs2A0fwiVQLEw7MClW.webp',
    alt: 'A worn wooden table set peacefully for tea, biscuits, and monetary policy',
    character: theDude,
    passages: ['Tea Time'],
  },
  {
    id: 'aftermath',
    title: 'After the shot',
    src: 'https://puhixbchomgvn0ti.public.blob.vercel-storage.com/toys/shoot-em-up/backgrounds/aftermath-MPSG9B5DSBEngfD9YSezZjuXWv64O4.webp',
    alt: 'The silent room after a gunshot, with an overturned chair, broken teacup, and one spent casing',
    passages: ['13', 'Endgame', 'Dead Tea Time'],
  },
];

const media: readonly ToyPassageMedia[] = [
  {
    passage: '05',
    src: 'https://puhixbchomgvn0ti.public.blob.vercel-storage.com/toys/shoot-em-up/puppy-MCv2JT7ZBBV96DmvH25gLcXCXneFTI.jpg',
    alt: 'A small puppy looking up at the camera',
    width: 640,
    height: 800,
    caption: 'Look! A puppy!',
  },
  {
    passage: '06',
    src: 'https://puhixbchomgvn0ti.public.blob.vercel-storage.com/toys/shoot-em-up/kitty-kdGIsa3rVFzxO1bMAVnTjZb1McuvXR.jpeg',
    alt: 'A kitten offered as one last appeal against videogame violence',
    width: 640,
    height: 789,
    caption: 'This kitten, maybe?',
  },
];

export default function ShootEmUpGame() {
  return (
    <IllustratedTwineGame
      endingTitles={{
        'Tea Time': 'Tea and monetary policy',
        'Dead Tea Time': 'Tea, too late',
      }}
      media={media}
      openingLabel="Press start"
      primary="#f7d046"
      primaryRgb="247, 208, 70"
      progressLabel="Escalation"
      scenes={shootEmUpScenes}
      secondary="#ff4f9a"
      sideNotes={[
        'Tea kettle, tea set, tea for two.',
        'One Desert Eagle.',
      ]}
      story={story}
    />
  );
}
