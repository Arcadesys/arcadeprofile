export interface ProjectInfo {
  slug: string;
  title: string;
  description: string;
  image?: string;
  href: string;
  external?: boolean;
  tags?: string[];
  featured?: boolean;
  category?: 'fiction' | 'tools' | 'experiments' | 'audio-video' | 'community';
  status?: 'active' | 'available' | 'in-progress' | 'archived';
  primaryCTA?: {
    label?: string;
    href?: string;
    type?: Exclude<ProjectResourceKind, 'post'>;
  };
  resources?: ProjectResource[];
  relatedPostSlugs?: string[];
}

export type ProjectResourceKind =
  | 'post'
  | 'preview'
  | 'buy'
  | 'youtube'
  | 'audio'
  | 'experiment'
  | 'repo'
  | 'download'
  | 'other';

export interface ProjectResource {
  label: string;
  href: string;
  kind: ProjectResourceKind;
  description?: string;
  external?: boolean;
}

export const projects: ProjectInfo[] = [
  {
    slug: 'magic-mirror',
    title: 'Magic Mirror',
    description: 'A photobooth app that transforms photos into anthropomorphic characters using AI image generation. Supports multiple models including Gemini, GPT Image, and FLUX.',
    href: 'https://github.com/Arcadesys/magic-mirror',
    external: true,
    featured: true,
    category: 'tools',
    status: 'active',
    tags: ['AI', 'Node.js', 'Image Generation'],
    primaryCTA: {
      label: 'View Repository',
      href: 'https://github.com/Arcadesys/magic-mirror',
      type: 'repo',
    },
    resources: [
      {
        label: 'Source code',
        href: 'https://github.com/Arcadesys/magic-mirror',
        kind: 'repo',
        external: true,
      },
    ],
  },
  {
    slug: 'did-explainer',
    title: 'DID Explainer',
    description: 'An interactive chat-style educational page explaining Dissociative Identity Disorder through conversations with system members.',
    href: '/did',
    featured: true,
    category: 'experiments',
    status: 'active',
    tags: ['Education', 'Next.js', 'Interactive'],
    primaryCTA: {
      label: 'Open Experiment',
      href: '/did',
      type: 'experiment',
    },
    resources: [
      {
        label: 'Interactive explainer',
        href: '/did',
        kind: 'experiment',
      },
    ],
  },
  {
    slug: 'meal-planner',
    title: 'Meal Planner',
    description: 'An interactive questionnaire-based meal planning tool for generating weekly meal plans.',
    href: '/mealplan',
    category: 'tools',
    status: 'active',
    tags: ['Utility', 'React', 'Interactive'],
    primaryCTA: {
      label: 'Open Meal Planner',
      href: '/mealplan',
      type: 'experiment',
    },
    resources: [
      {
        label: 'Meal planner tool',
        href: '/mealplan',
        kind: 'experiment',
      },
    ],
  },
  {
    slug: 'beta-reader-signup',
    title: 'Beta Reader Signup',
    description: 'Landing page for beta reader recruitment for upcoming fiction projects.',
    href: '/betareader',
    featured: true,
    category: 'fiction',
    status: 'active',
    tags: ['Writing', 'Community'],
    primaryCTA: {
      label: 'Join the Beta List',
      href: '/betareader',
      type: 'preview',
    },
    resources: [
      {
        label: 'Beta reader form',
        href: '/betareader',
        kind: 'preview',
      },
      {
        label: 'Preview library',
        href: '/previews',
        kind: 'preview',
      },
    ],
  },
];
