export type LabProject = {
  slug: string;
  title: string;
  summary: string;
  status: string;
  disciplines: string[];
  visualEyebrow: string;
  visualDescription: string;
  screenshotNeeded: string;
  screenshot: {
    src: string;
    alt: string;
    width: number;
    height: number;
  } | null;
  liveUrl?: string;
  liveLinkLabel?: string;
  sourceUrl?: string;
  sourceLinkLabel?: string;
  costNote: string;
};

export const LAB_PROJECTS: LabProject[] = [
  {
    slug: 'wizwor',
    title: 'WizWor',
    summary:
      'An agent-guided classic-game recommender built to test where model judgment helps—and where deterministic software should stay in charge.',
    status: 'Public learning product',
    disciplines: ['Agents SDK', 'Context engineering', 'Evals', 'Accessible UI'],
    visualEyebrow: 'Agent-guided game finder',
    visualDescription: 'Arcade-style recommendation terminal',
    screenshotNeeded:
      'A 1600 by 1000 pixel capture of the live WizWor terminal after it reveals grounded game recommendations, with no account or private data visible.',
    screenshot: null,
    liveUrl: 'https://wizwor.vercel.app',
    liveLinkLabel: 'Open the live WizWor product',
    sourceUrl: 'https://github.com/Arcadesys/wizwor',
    costNote:
      'Cost note: a live AI turn may use paid model resources. Reading this case study does not.',
  },
  {
    slug: 'toontok',
    title: 'ToonTok',
    summary:
      'A private-by-default character and image studio built around reusable character canon, controlled generation, and accessible creative workflows.',
    status: 'Public product · Invite access',
    disciplines: ['AI image workflows', 'Privacy', 'Canon systems', 'Accessible UI'],
    visualEyebrow: 'Private character studio',
    visualDescription: 'References, canon, and new artwork in one workflow',
    screenshotNeeded:
      'A 1600 by 1000 pixel capture of ToonTok’s public product showroom or a permission-safe Vault or Light Table view, with no private character or account data visible.',
    screenshot: null,
    liveUrl: 'https://toontok.thearcades.me',
    liveLinkLabel: 'Open the public ToonTok site',
    costNote:
      'AI cost note: opening the public site does not start generation. Image generation, editing, or repair can consume credits and paid model resources; the product uses explicit confirmation at chargeable boundaries.',
  },
  {
    slug: 'arcadeprofile',
    title: 'ArcadeProfile',
    summary:
      'The public publishing and product platform behind The Arcades: accessible stories and projects backed by a real editorial, delivery, and operations system.',
    status: 'Public publishing platform',
    disciplines: ['Next.js', 'Payload CMS', 'Publishing systems', 'Accessibility'],
    visualEyebrow: 'Publishing product',
    visualDescription: 'Web-first stories, projects, and delivery operations',
    screenshotNeeded:
      'A 1600 by 1000 pixel capture of a public ArcadeProfile reading or projects page that shows the navigation and reading interface without admin or subscriber data.',
    screenshot: null,
    liveUrl: 'https://www.thearcades.me',
    liveLinkLabel: 'Open the public ArcadeProfile site',
    costNote:
      'Cost note: reading ArcadeProfile does not invoke paid AI generation. Newsletter signup sends the information you submit through the site’s configured audience and delivery services.',
  },
  {
    slug: 'conductor',
    title: 'Conductor',
    summary:
      'Lab Infrastructure: a local Jira-shaped control plane that makes plans, authority, agent work, review, and evidence visible before a task can be called done.',
    status: 'Local prototype · Lab Infrastructure',
    disciplines: ['Agent orchestration', 'Approval systems', 'SQLite', 'Evidence gates'],
    visualEyebrow: 'Lab Infrastructure',
    visualDescription: 'Local approval-gated board for Codex and Claude work',
    screenshotNeeded:
      'A 1600 by 1000 pixel capture of Conductor’s local Board using demo data, with one Story in review and its approval or receipt evidence visible; no real repository path, private issue, token, or provider data.',
    screenshot: null,
    sourceUrl: 'https://github.com/Arcadesys/conductor',
    sourceLinkLabel: 'View the public Conductor repository',
    costNote:
      'Cost note: opening the repository has no model cost. Running Conductor locally can consume Codex or Claude allowance or API resources after execution is approved.',
  },
  {
    slug: 'cultural-weather-vane',
    title: 'Cultural Weather Vane',
    summary:
      'An interactive map that puts popular music and major news into the same emotional field to explore what a year felt like.',
    status: 'Playable prototype · Data experiment',
    disciplines: ['Data visualization', 'Cultural analysis', 'AI-assisted prototyping', 'Accessible UI'],
    visualEyebrow: 'Cultural atmosphere field',
    visualDescription: 'Music and news plotted as a changing weather system',
    screenshotNeeded:
      'A 1600 by 1000 pixel capture of the public Cultural Weather Vane Toy with its legend and accessible controls visible; no account or private data.',
    screenshot: {
      src: 'https://puhixbchomgvn0ti.public.blob.vercel-storage.com/images/4ad788dcf361a3a891ab7d5ce2a0b77bbc88c77493de84c8150573c36c1c6b64/cultural-weather-vane-1600x1000-final.png',
      alt: 'Cultural Weather Vane showing album covers and news photographs plotted across cultural mood axes.',
      width: 1600,
      height: 1000,
    },
    liveUrl: 'https://www.thearcades.me/toys/cultural-weather-vane',
    liveLinkLabel: 'Open the Cultural Weather Vane Toy',
    costNote:
      'Cost note: exploring the Toy does not invoke paid AI generation; its media depends on cached public catalog and encyclopedia sources.',
  },
  {
    slug: 'furry-history-board',
    title: 'Furry History Board',
    summary:
      'A source-backed historical board for asking bounded questions about furry communities, publishing, conventions, and people without treating unlike evidence as one metric.',
    status: 'Interactive prototype · Historical data experiment',
    disciplines: ['Data visualization', 'Historical research', 'Deterministic queries', 'Accessible UI'],
    visualEyebrow: 'Source-backed history explorer',
    visualDescription: 'Timeline, relative-prominence chart, evidence, and equivalent data table',
    screenshotNeeded:
      'A 1600 by 1000 pixel capture of the live Furry History Board with the chart, evidence region, lens controls, and nonliteral-index disclosure visible.',
    screenshot: null,
    liveUrl: 'https://www.thearcades.me/lab/furry-history-board/app',
    liveLinkLabel: 'Open the live Furry History Board',
    costNote:
      'Cost note: exploring the board does not invoke paid AI generation. Its bounded query parser and historical sampler run locally in the browser; evidence links open their named public sources.',
  },
];

export function getLabProject(slug: string): LabProject | undefined {
  return LAB_PROJECTS.find((project) => project.slug === slug);
}

export function requireLabProject(slug: string): LabProject {
  const project = getLabProject(slug);
  if (!project) throw new Error(`The ${slug} Lab project is missing.`);
  return project;
}
