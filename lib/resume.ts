import type { EditorialBlock, EditorialPiece } from '@/lib/editorial-piece';

/**
 * The resume is the professional lane's landing page and its downloadable PDF.
 * Both render from the structures below so the web edition and `/resume/pdf`
 * can never drift apart.
 */

export interface ResumeProfile {
  name: string;
  titleLine: string;
  location: string;
  email: string;
  site: string;
  siteUrl: string;
  github: string;
  githubUrl: string;
}

export interface ResumeAccomplishment {
  text: string;
  /** An on-site artifact that backs the claim. Only set where one truly exists. */
  proofHref?: string;
}

export interface ResumeRole {
  company: string;
  location: string;
  title: string;
  dates: string;
  bullets: string[];
}

export interface ResumeEarlierRole {
  org: string;
  role: string;
  dates: string;
}

export interface ResumeSkillGroup {
  label: string;
  skills: string;
}

export const RESUME_PROFILE: ResumeProfile = {
  name: 'Austen Tucker-Crowder',
  titleLine: 'AI Enablement and Transformation · Program Manager · Agile Coach',
  location: 'Chicago, IL',
  email: 'austen.crowder@gmail.com',
  site: 'www.thearcades.me',
  siteUrl: 'https://www.thearcades.me',
  github: 'github.com/Arcadesys',
  githubUrl: 'https://github.com/Arcadesys',
};

export const RESUME_SUMMARY =
  'Builder, AI enablement leader, program manager, and agile coach with 16+ years delivering '
  + 'customer-focused software. I build the operating systems, learning experiences, and '
  + 'decision-making practices that help teams adopt AI in their everyday work. An '
  + 'accessibility-first facilitator, I turn complex transformation work into usable tools, '
  + 'shared goals, and concrete next steps.';

export const RESUME_ACCOMPLISHMENTS: ResumeAccomplishment[] = [
  { text: 'Helped raise agentic-coding adoption from roughly 2% to 43% of merge requests; it was still climbing at departure' },
  { text: 'Led Devin adoption with goals and KPIs, including a game used to communicate the operating model' },
  { text: 'Led a March 2026 roadshow for product managers across three continents, introducing Cursor and agentic AI; attendees began producing prototypes afterward' },
  { text: 'Built Wavelength, an MCP-enabled operating artifact for tasks, RAID-log items, and program state' },
  { text: 'Within four days of arrival, facilitated an onsite that multiple attendees called one of their best' },
  { text: 'Reduced planning time by 50% at Arity via data-driven prioritization for 50+ engineers' },
  { text: 'Increased feature throughput by 400% at WorkTango during merger-driven agile transformation' },
  { text: 'Generated $1.5B in locked loans with one sprint of work at Guaranteed Rate' },
];

export const RESUME_EXPERIENCE: ResumeRole[] = [
  {
    company: 'ActiveCampaign',
    location: 'Chicago, IL',
    title: 'AI Enablement and Transformation',
    dates: '06/2025–09/2026',
    bullets: [
      'Led AI enablement and transformation across engineering, product, and leadership, turning adoption goals into measurable, repeatable practice',
      'Helped raise agentic-coding adoption from roughly 2% to 43% of merge requests; adoption was still climbing at departure',
      'Led Devin adoption with goals and KPIs, using a game to communicate the operating model',
      'Led a March 2026 roadshow for product managers across three continents, introducing Cursor and agentic AI; attendees began producing prototypes afterward',
      'Built Wavelength, an MCP-enabled operating artifact containing tasks, RAID-log items, and program state',
      'Coordinated cross-pillar AI transformation work, including outcomes and north-star metrics that supported ePMO governance and executive review',
      'Built Claude skills and Langfuse evaluation prompts that supported daily operations and assessment of AI-agent response quality',
      'Designed accessibility-first Cursor and agentic-AI learning experiences that gave participants room to build working prototypes',
      'Within four days of arrival, facilitated an onsite that multiple attendees called one of their best',
      'Created Worksites, intensive problem-solving sessions using board-game prototyping principles, and built operational tools for shared decisions and program visibility',
    ],
  },
  {
    company: 'Allstate',
    location: 'Chicago, IL',
    title: 'Senior Program Manager',
    dates: '08/2023 – 02/2025',
    bullets: [
      'Led cross-functional teams to deliver key initiatives across the Allstate Family of Companies',
      'Enhanced decision-making through robust metrics and streamlined project management tools',
      'Championed agile practices and AI adoption by co-designing an AI training curriculum for the product department',
    ],
  },
  {
    company: 'Arity',
    location: 'Chicago, IL',
    title: 'Senior Scrum Master & Agile Coach',
    dates: '06/2020 – 08/2023',
    bullets: [
      'Slashed planning time by 50% for quarterly planning for 50+ engineers',
      'Mentored Scrum Masters, enabling three promotions and strengthening agile alignment within the org',
    ],
  },
  {
    company: 'WorkTango',
    location: 'Chicago, IL',
    title: 'Senior Scrum Master & Head of Agile PMO',
    dates: '01/2019 – 06/2020',
    bullets: [
      'Spearheaded agile transformation during a merger, boosting feature delivery throughput by 400%',
      'Redesigned workflows to double team velocity',
      'Built a mentorship program within the technology organization to nurture future leaders',
    ],
  },
  {
    company: 'Guaranteed Rate',
    location: 'Chicago, IL',
    title: 'Scrum Master & Project Lead',
    dates: '11/2015 – 12/2018',
    bullets: [
      'Rescoped a delayed initiative to deliver an MVP in two months, cutting production time by 75%',
      'Acted as product owner for a data mining tool, generating $1.5B in locked loans',
      'Developed a measurement plan that streamlined app functionality and elevated user engagement',
    ],
  },
];

export const RESUME_EARLIER: ResumeEarlierRole[] = [
  { org: 'Chicago Housing Authority', role: 'Business Analyst & Scrum Master', dates: '2012–2015' },
  { org: 'Technology Partnership Group', role: 'Business Analyst', dates: '2009–2012' },
];

export const RESUME_SKILLS: ResumeSkillGroup[] = [
  { label: 'AI & Automation', skills: 'Claude Code, Cursor.ai, Langfuse, Glean, Agentic Development, LLM Evaluation, MCP Development, Claude Skills Development' },
  { label: 'Facilitation & PM', skills: 'Jira, Digital.ai, Confluence, Airtable, Trello, Mural, Remote/Hybrid Facilitation, Offshore Coordination' },
  { label: 'Development', skills: 'Next.js, React, Node.js, Python, Express, Bootstrap, Postgres, Amazon Lambdas' },
  { label: 'Tracking & Analysis', skills: 'Google Analytics, Hotjar, Datadog, Grafana, Tableau' },
  { label: 'Communication', skills: 'Video, Audio, and Graphic Production, Training Production, Professional Writing, Accessibility-First Design' },
  { label: 'Methodologies', skills: "Paper Prototyping, Constructivism, Kolb's Experiential Learning, Think-Pair-Share, MoSCoW, Rose/Thorn/Bud, Spotify Squad Health Check" },
];

export const RESUME_EDUCATION: string[] = [
  'Wabash College — B.A. in English, Rhetoric, and Teacher Education, 2007',
  'Certified Scrum Master (CSM) — 2011–Present',
];

export const RESUME_CANONICAL_PATH = '/resume';
export const RESUME_PDF_PATH = '/resume/pdf';

export const RESUME_DESCRIPTION =
  'Builder, AI enablement leader, program manager, and accessibility-first facilitator with '
  + '16+ years delivering customer-focused software.';

/** Flatten the resume into the shared editorial blocks the PDF renderer consumes. */
export function buildResumeEditorialPiece(): EditorialPiece {
  const blocks: EditorialBlock[] = [
    { type: 'paragraph', text: `${RESUME_PROFILE.titleLine} · ${RESUME_PROFILE.location}` },
    { type: 'paragraph', text: `${RESUME_PROFILE.email} · ${RESUME_PROFILE.site} · ${RESUME_PROFILE.github}` },
    { type: 'heading', level: 2, text: 'Summary' },
    { type: 'paragraph', text: RESUME_SUMMARY },
    { type: 'heading', level: 2, text: 'Key Accomplishments' },
    { type: 'list', ordered: false, items: RESUME_ACCOMPLISHMENTS.map((item) => item.text) },
    { type: 'heading', level: 2, text: 'Experience' },
  ];

  for (const role of RESUME_EXPERIENCE) {
    blocks.push({ type: 'heading', level: 3, text: `${role.company} — ${role.title}` });
    blocks.push({ type: 'paragraph', text: `${role.location} · ${role.dates}` });
    blocks.push({ type: 'list', ordered: false, items: role.bullets });
  }

  blocks.push({ type: 'heading', level: 2, text: 'Earlier Experience' });
  blocks.push({
    type: 'list',
    ordered: false,
    items: RESUME_EARLIER.map((role) => `${role.org} — ${role.role} (${role.dates})`),
  });

  blocks.push({ type: 'heading', level: 2, text: 'Tools & Skills' });
  blocks.push({
    type: 'list',
    ordered: false,
    items: RESUME_SKILLS.map((group) => `${group.label}: ${group.skills}`),
  });

  blocks.push({ type: 'heading', level: 2, text: 'Education & Certifications' });
  blocks.push({ type: 'list', ordered: false, items: RESUME_EDUCATION });

  return {
    id: 'resume',
    kind: 'resume',
    title: RESUME_PROFILE.name,
    description: RESUME_DESCRIPTION,
    author: RESUME_PROFILE.name,
    canonicalPath: RESUME_CANONICAL_PATH,
    pdfPath: RESUME_PDF_PATH,
    section: 'Resume',
    blocks,
  };
}
