// External publishing, as listed on /bookshelf, in plain data so /welcome
// can show the same shelf in its large, single-column layout.
// lib/bookshelf.test.ts checks that every link here is also on /bookshelf,
// so the two pages stay in step.

export interface ShelfLink {
  label: string;
  href: string;
}

export interface ShelfEntry {
  title: string;
  detail: string;
  links?: readonly ShelfLink[];
}

export interface ShelfList {
  heading: string;
  entries: readonly ShelfEntry[];
}

export interface ShelfName {
  slug: string;
  name: string;
  intro?: string;
  lists: readonly ShelfList[];
  findMe: readonly ShelfLink[];
}

export const SHELF_NAMES: readonly ShelfName[] = [
  {
    slug: 'austen-tucker',
    name: 'As Austen Tucker',
    lists: [
      {
        heading: 'Anthology contributions',
        entries: [
          {
            title: '“Parts of the Whole”',
            detail:
              'In Different Worlds, Different Skins, Vol. 2 (Will A. Sanborn, ed., Anthropomorphic Dreams Publishing, 2010). The anthology was a 2010 Ursa Major Award finalist. Reprinted in A Fuzzy Place.',
            links: [
              { label: 'Amazon', href: 'https://www.amazon.com/Different-Worlds-Different-Skins-Humanitys/dp/1456318977' },
              { label: 'Goodreads', href: 'https://www.goodreads.com/en/book/show/11078410' },
              { label: 'Ursa Major Awards, 2010', href: 'https://ursamajorawards.org/UMA_2010.htm' },
            ],
          },
          {
            title: '“Carl”',
            detail:
              'In Alone in the Dark: Anthropomorphic Tales of the Things That Go Bump in the Night (Will A. Sanborn, ed., Anthropomorphic Dreams Publishing, 2008).',
            links: [
              { label: 'Amazon', href: 'https://www.amazon.com/Alone-Dark-Anthropomorphic-Tales-Things/dp/144043865X' },
              { label: 'Publisher page', href: 'http://www.anthrodreams.com/wordpress/2009/07/18/alone-in-the-dark/' },
            ],
          },
        ],
      },
      {
        heading: 'Essays',
        entries: [
          {
            title: 'The Bilerico Project',
            detail:
              '106 essays from March 2009 through December 2012 on LGBTQ politics, trans issues, gaming, and furry identity, now hosted by LGBTQ Nation.',
            links: [
              { label: 'Contributor archive', href: 'http://bilerico.lgbtqnation.com/contributors/austen_crowder/' },
              { label: 'Respect vs. Acceptance', href: 'https://bilerico.lgbtqnation.com/2009/03/respect_versus_acceptance.php' },
              { label: 'Mind the Gap, Cross the Valley', href: 'https://bilerico.lgbtqnation.com/2009/09/mind_the_gap_cross_the_valley.php' },
              { label: 'Inside Baseball: the all-male-college gay problem', href: 'http://bilerico.lgbtqnation.com/2009/10/inside_baseball_the_all-male_college_gay_problem.php' },
              { label: 'The “Trans Mafia” Stifles Allies', href: 'https://bilerico.lgbtqnation.com/2010/03/the_trans_mafia_stifles_allies.php' },
              { label: 'Interview with Erin Vaught', href: 'https://bilerico.lgbtqnation.com/2010/07/an_interview_with_erin_vaught_about_her_experience.php' },
              { label: 'Nethacking through the anti-LGBT political climate', href: 'https://bilerico.lgbtqnation.com/2010/01/nethacking_through_the_anti-lgbt_political_climate.php' },
            ],
          },
          {
            title: '“Austen Writes Her Furry Story”',
            detail: 'At [adjective][species] (October 2014). Also a chapter in A Fuzzy Place.',
            links: [
              { label: 'Read the essay', href: 'http://adjectivespecies.com/2014/10/31/austen-writes-her-furry-story/' },
            ],
          },
        ],
      },
    ],
    findMe: [
      { label: 'Amazon author page', href: 'https://www.amazon.com/Austen-Crowder/e/B00IUJF5PI' },
      { label: 'Goodreads author page', href: 'https://www.goodreads.com/author/show/4509394.Austen_Crowder' },
      { label: 'Bad Dog Books author page', href: 'https://baddogbooks.com/product-cat/authors/austen-crowder/' },
      { label: 'WikiFur author page', href: 'https://en.wikifur.com/wiki/Austen_Crowder' },
      { label: 'Furry Writers’ Guild member spotlight (2015)', href: 'https://furrywritersguild.com/2015/02/15/member-spotlight-austen-crowder/' },
      { label: 'About.me profile', href: 'https://about.me/austencrowder' },
    ],
  },
  {
    slug: 'slyford-t-rabbit',
    name: 'As Slyford T. Rabbit',
    intro: 'Short fiction and poetry in Anthro magazine, 2006 to 2007.',
    lists: [
      {
        heading: 'Short fiction',
        entries: [
          {
            title: '“Foxtails”',
            detail: 'Anthro #13 (September/October 2007).',
            links: [{ label: 'Read the story', href: 'http://anthrozine.com/stry/foxtails.html' }],
          },
        ],
      },
      {
        heading: 'Poetry',
        entries: [
          {
            title: '“Terry Never Came Back”',
            detail: 'Anthro #13 (September/October 2007).',
            links: [{ label: 'ANTHROlogy THREE', href: 'http://anthrozine.com/site/anthrology-3.html' }],
          },
          {
            title: '“Tryst Tail”',
            detail: 'Anthro #11 (May/June 2007).',
            links: [{ label: 'ANTHROlogy TWO', href: 'http://anthrozine.com/site/anthrology-2.html' }],
          },
          {
            title: '“Childhood Memories”',
            detail: 'Anthro #10 (March/April 2007).',
            links: [{ label: 'ANTHROlogy TWO', href: 'http://anthrozine.com/site/anthrology-2.html' }],
          },
          {
            title: '“Cat and Rabbit”',
            detail: 'Anthro #9 (January/February 2007).',
            links: [{ label: 'ANTHROlogy TWO', href: 'http://anthrozine.com/site/anthrology-2.html' }],
          },
          {
            title: '“For Those Who Stand Apart”',
            detail: 'Anthro #8 (November/December 2006).',
            links: [{ label: 'ANTHROlogy TWO', href: 'http://anthrozine.com/site/anthrology-2.html' }],
          },
        ],
      },
      {
        heading: 'Live appearances',
        entries: [
          { title: 'Mephit Fur Meet 2007', detail: 'Writing Track participant.' },
        ],
      },
    ],
    findMe: [
      { label: 'FurAffinity gallery (slyford)', href: 'https://www.furaffinity.net/user/slyford' },
      { label: 'WikiFur: Slyford T. Rabbit', href: 'http://en.wikifur.com/wiki/Slyford_T._Rabbit' },
    ],
  },
  {
    slug: 'sly-rabbit',
    name: 'As Sly Rabbit',
    lists: [
      {
        heading: 'Live performance',
        entries: [
          {
            title: '“Velveteen”',
            detail:
              'Performed at the Midwest FurFest 2005 Variety Show. A sad tale of a plush bunny named Buster and his owner Max. No surviving recording is known.',
          },
        ],
      },
    ],
    findMe: [{ label: 'WikiFur: Sly Rabbit', href: 'https://en.wikifur.com/wiki/Sly_Rabbit' }],
  },
];
