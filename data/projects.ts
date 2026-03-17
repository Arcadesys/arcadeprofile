export interface ProjectInfo {
  title: string;
  description: string;
  image?: string;
  href: string;
  external?: boolean;
  tags?: string[];
}

export const projects: ProjectInfo[] = [
  {
    title: 'Magic Mirror',
    description: 'A photobooth app that transforms photos into anthropomorphic characters using AI image generation. Supports multiple models including Gemini, GPT Image, and FLUX.',
    href: 'https://github.com/Arcadesys/magic-mirror',
    external: true,
    tags: ['AI', 'Node.js', 'Image Generation'],
  },
  {
    title: 'DID Explainer',
    description: 'An interactive chat-style educational page explaining Dissociative Identity Disorder through conversations with system members.',
    href: '/did',
    tags: ['Education', 'Next.js', 'Interactive'],
  },
  {
    title: 'Meal Planner',
    description: 'An interactive questionnaire-based meal planning tool for generating weekly meal plans.',
    href: '/mealplan',
    tags: ['Utility', 'React', 'Interactive'],
  },
  {
    title: 'Beta Reader Signup',
    description: 'Landing page for beta reader recruitment for upcoming fiction projects.',
    href: '/betareader',
    tags: ['Writing', 'Community'],
  },
];
