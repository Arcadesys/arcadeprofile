// Cultural Weather Vane corpus.
// Song titles come from the Billboard year-end charts; events are the year's
// dominant stories. Six of each per year. The activation / valence / prominence
// scores are editorial readings, not measurements.

export type Mode = "major" | "minor" | "modal" | "ambiguous";

export type SongPoint = {
  id: string;
  title: string;
  artist: string;
  year: number;
  activation: number; // -1 still → +1 kinetic
  valence: number; // -1 dark → +1 bright
  prominence: number; // 0..1
  mode: Mode;
  tags: string[];
  mediaQuery?: string;
  wikipediaTitle?: string;
};

export type NewsPoint = {
  id: string;
  title: string;
  year: number;
  activation: number;
  valence: number;
  prominence: number;
  tags: string[];
  mediaQuery?: string;
  wikipediaTitle?: string;
};

export type YearWeather = {
  year: number;
  headline: string;
  report: string;
  musicSummary: string;
  newsSummary: string;
};

export type Centroid = { activation: number; valence: number };

export type YearHistory = {
  year: number;
  music: Centroid;
  news: Centroid;
  divergence: number;
};

export const years = [2000,2001,2004,2006,2008,2010,2012,2016,2018,2020,2022,2024];

export const yearWeather: YearWeather[] = [
  {
    year: 2000,
    headline: "Glossy optimism with nervous circuitry underneath",
    report: "High activation, positive surface energy, and a growing digital sheen. The culture still sounds expansive, but uncertainty is beginning to hum below the floorboards.",
    musicSummary: "Bright, kinetic, hook-forward pop with polished production and club energy.",
    newsSummary: "Technology acceleration, a contested election, and geopolitical tension sharing the same frame."
  },
  {
    year: 2001,
    headline: "The atmosphere fractures",
    report: "The year begins relatively buoyant and ends under an entirely different pressure system. Music and news pull apart, then begin to converge around grief, resilience, and heightened seriousness.",
    musicSummary: "Carry-over exuberance, earnest rock ballads, and increasingly reflective material.",
    newsSummary: "Extreme shock, conflict, and sustained uncertainty dominate the public environment."
  },
  {
    year: 2004,
    headline: "Hard-edged confidence, hard-edged news",
    report: "Both fields run hot. The music is loud, rhythmic and physically assertive; the news is dense with war, disaster and a bitterly divided electorate.",
    musicSummary: "Crunk and club-rap saturation, arena-sized R&B, and the first wave of political rock.",
    newsSummary: "Occupation, atrocity, catastrophic natural disaster, and a polarising election."
  },
  {
    year: 2006,
    headline: "A flat, wide-open middle",
    report: "The least polarised field in the sample. Music sits in a broad mid-band of pleasant activation while the news is severe but diffuse — no single event dominating the frame.",
    musicSummary: "Genre-porous radio pop, dancehall crossover, and soft-rock melancholy in equal measure.",
    newsSummary: "Distributed severity: war, nuclear escalation, and a political realignment at home."
  },
  {
    year: 2008,
    headline: "Dance floor over a fault line",
    report: "A striking escapist pattern: bright, club-ready music coexists with severe economic anxiety. The cultural response often sounds less like denial than pressure release.",
    musicSummary: "High activation, electronic textures, maximal hooks, and euphoric release.",
    newsSummary: "Financial collapse, war fatigue, a historic election, and instability."
  },
  {
    year: 2010,
    headline: "Synthetic euphoria, physical disaster",
    report: "The widest divergence in the sample. Pop is at peak brightness and peak volume while the news field is dominated by spill, quake and leak — things breaking open.",
    musicSummary: "Auto-tuned maximalism, four-on-the-floor party records, and glossy heartbreak.",
    newsSummary: "Environmental catastrophe, seismic disaster, and the beginning of the leak era."
  },
  {
    year: 2012,
    headline: "Maximum-color pop",
    report: "The musical field is unusually bright and kinetic, while the news field remains mixed. Collective sound leans toward spectacle, communal hooks, and frictionless uplift.",
    musicSummary: "Big choruses, EDM influence, dance-pop saturation, and maximal brightness.",
    newsSummary: "Recovery signals mingle with storm, massacre, civil war, and an election."
  },
  {
    year: 2016,
    headline: "Cold water",
    report: "Music cools and slows noticeably — mid-tempo, minor, spacious — in a year when the news field is defined by two votes nobody's models predicted.",
    musicSummary: "Tropical-house melancholy, mid-tempo minor R&B, and streaming-era restraint.",
    newsSummary: "Two electoral shocks, a mass shooting, a besieged city, and a leak of the world's money."
  },
  {
    year: 2018,
    headline: "Anger with a good mix",
    report: "Production is immaculate and the mood underneath it is not. The news field is unusually moralised: the year's biggest stories are about who is being harmed.",
    musicSummary: "Trap-pop dominance, immaculate low-end, and protest arriving inside hit singles.",
    newsSummary: "Gun violence, family separation, a state killing, and a climate deadline."
  },
  {
    year: 2020,
    headline: "Isolation wrapped in neon",
    report: "The news field drops sharply in valence while music often retains danceable energy. Nostalgia, bedroom intimacy, and synthetic brightness become important coping textures.",
    musicSummary: "Retro-pop, intimate production, anxious danceability, and heavy nostalgia.",
    newsSummary: "Pandemic, mass death, economic disruption, protest, and a contested election."
  },
  {
    year: 2022,
    headline: "Nostalgia as shelter",
    report: "Two of the year's biggest records are a decade old or older. The field's centre of gravity drifts backward while the news field opens a European land war and closes a constitutional right.",
    musicSummary: "Catalogue revivals, soft-focus disco, and warm mid-tempo guitar pop.",
    newsSummary: "Invasion, inflation, a reversed right, a dead monarch, and a chatbot."
  },
  {
    year: 2024,
    headline: "Confessional pop under pressure",
    report: "The musical atmosphere grows more inward-facing and more verbal. Even highly polished records foreground vulnerability, grievance, and self-interrogation.",
    musicSummary: "Confessional pop craft, a rap feud as mass event, and country-pop crossover.",
    newsSummary: "War, a restorative election, record heat, and machine text everywhere."
  }
];

export const songs: SongPoint[] = [
  { id: "s0", title: "Breathe", artist: "Faith Hill", year: 2000, activation: -0.45, valence: 0.5, prominence: 0.95, mode: "major", tags: ["ballad","warm","country-pop"] },
  { id: "s1", title: "Say My Name", artist: "Destiny's Child", year: 2000, activation: 0.35, valence: -0.1, prominence: 0.92, mode: "minor", tags: ["accusatory","sleek","R&B"] },
  { id: "s2", title: "Bye Bye Bye", artist: "NSYNC", year: 2000, activation: 0.8, valence: 0.35, prominence: 0.9, mode: "minor", tags: ["kinetic","polished","boy-band"] },
  { id: "s3", title: "Maria Maria", artist: "Santana feat. The Product G&B", year: 2000, activation: 0.3, valence: 0.25, prominence: 0.86, mode: "minor", tags: ["groove","sunlit","crossover"] },
  { id: "s4", title: "Try Again", artist: "Aaliyah", year: 2000, activation: 0.45, valence: 0.05, prominence: 0.8, mode: "minor", tags: ["futurist","cool","rhythmic"] },
  { id: "s5", title: "Oops!... I Did It Again", artist: "Britney Spears", year: 2000, activation: 0.7, valence: 0.4, prominence: 0.84, mode: "minor", tags: ["teen-pop","glossy","playful"] },
  { id: "s6", title: "Hanging by a Moment", artist: "Lifehouse", year: 2001, activation: 0.4, valence: 0.2, prominence: 0.93, mode: "major", tags: ["earnest","rock","yearning"] },
  { id: "s7", title: "Fallin'", artist: "Alicia Keys", year: 2001, activation: -0.05, valence: -0.3, prominence: 0.9, mode: "minor", tags: ["blues","torn","vocal"] },
  { id: "s8", title: "Drops of Jupiter", artist: "Train", year: 2001, activation: 0.15, valence: 0.35, prominence: 0.78, mode: "major", tags: ["wistful","expansive","rock"] },
  { id: "s9", title: "All for You", artist: "Janet Jackson", year: 2001, activation: 0.75, valence: 0.6, prominence: 0.82, mode: "major", tags: ["disco","buoyant","dance"] },
  { id: "s10", title: "Only Time", artist: "Enya", year: 2001, activation: -0.85, valence: -0.05, prominence: 0.7, mode: "modal", tags: ["ambient","mourning","liturgical"] },
  { id: "s11", title: "Ride wit Me", artist: "Nelly", year: 2001, activation: 0.5, valence: 0.55, prominence: 0.8, mode: "major", tags: ["easy","summer","rap"] },
  { id: "s12", title: "Yeah!", artist: "Usher feat. Lil Jon & Ludacris", year: 2004, activation: 0.95, valence: 0.45, prominence: 0.97, mode: "minor", tags: ["crunk","club","maximal"] },
  { id: "s13", title: "Burn", artist: "Usher", year: 2004, activation: 0.2, valence: -0.25, prominence: 0.86, mode: "minor", tags: ["breakup","smooth","R&B"] },
  { id: "s14", title: "If I Ain't Got You", artist: "Alicia Keys", year: 2004, activation: -0.3, valence: 0.3, prominence: 0.82, mode: "major", tags: ["ballad","devotional","piano"] },
  { id: "s15", title: "Hey Ya!", artist: "OutKast", year: 2004, activation: 0.9, valence: 0.7, prominence: 0.92, mode: "major", tags: ["frantic","bright","eccentric"] },
  { id: "s16", title: "American Idiot", artist: "Green Day", year: 2004, activation: 0.88, valence: -0.45, prominence: 0.84, mode: "major", tags: ["protest","abrasive","punk"], mediaQuery: "Holiday Green Day" },
  { id: "s17", title: "Since U Been Gone", artist: "Kelly Clarkson", year: 2004, activation: 0.82, valence: 0.4, prominence: 0.8, mode: "minor", tags: ["catharsis","rock-pop","belted"] },
  { id: "s18", title: "Bad Day", artist: "Daniel Powter", year: 2006, activation: 0.1, valence: -0.05, prominence: 0.9, mode: "major", tags: ["wry","soft-rock","consoling"] },
  { id: "s19", title: "Temperature", artist: "Sean Paul", year: 2006, activation: 0.78, valence: 0.6, prominence: 0.88, mode: "major", tags: ["dancehall","warm","crossover"] },
  { id: "s20", title: "Hips Don't Lie", artist: "Shakira feat. Wyclef Jean", year: 2006, activation: 0.9, valence: 0.75, prominence: 0.9, mode: "major", tags: ["latin-pop","euphoric","brass"] },
  { id: "s21", title: "Crazy", artist: "Gnarls Barkley", year: 2006, activation: 0.45, valence: -0.2, prominence: 0.84, mode: "minor", tags: ["soul","unsettled","retro"] },
  { id: "s22", title: "SexyBack", artist: "Justin Timberlake", year: 2006, activation: 0.8, valence: 0.3, prominence: 0.86, mode: "minor", tags: ["electro","hard","club"] },
  { id: "s23", title: "How to Save a Life", artist: "The Fray", year: 2006, activation: -0.15, valence: -0.4, prominence: 0.78, mode: "major", tags: ["grief","piano-rock","earnest"] },
  { id: "s24", title: "Low", artist: "Flo Rida feat. T-Pain", year: 2008, activation: 0.9, valence: 0.4, prominence: 0.96, mode: "minor", tags: ["club","snap","escapist"] },
  { id: "s25", title: "Bleeding Love", artist: "Leona Lewis", year: 2008, activation: 0.2, valence: -0.3, prominence: 0.88, mode: "minor", tags: ["ballad","wounded","big-vocal"] },
  { id: "s26", title: "I Kissed a Girl", artist: "Katy Perry", year: 2008, activation: 0.72, valence: 0.45, prominence: 0.84, mode: "minor", tags: ["provocation","glossy","rock-pop"] },
  { id: "s27", title: "Viva la Vida", artist: "Coldplay", year: 2008, activation: 0.55, valence: 0.15, prominence: 0.86, mode: "major", tags: ["orchestral","elegiac","anthem"] },
  { id: "s28", title: "Disturbia", artist: "Rihanna", year: 2008, activation: 0.8, valence: -0.35, prominence: 0.82, mode: "minor", tags: ["anxious","electronic","danceable"] },
  { id: "s29", title: "Single Ladies (Put a Ring on It)", artist: "Beyoncé", year: 2008, activation: 0.88, valence: 0.5, prominence: 0.9, mode: "minor", tags: ["percussive","assertive","iconic"] },
  { id: "s30", title: "TiK ToK", artist: "Kesha", year: 2010, activation: 0.92, valence: 0.55, prominence: 0.95, mode: "major", tags: ["party","synthetic","reckless"] },
  { id: "s31", title: "Need You Now", artist: "Lady Antebellum", year: 2010, activation: -0.35, valence: -0.25, prominence: 0.88, mode: "major", tags: ["late-night","longing","country"] },
  { id: "s32", title: "Love the Way You Lie", artist: "Eminem feat. Rihanna", year: 2010, activation: 0.7, valence: -0.75, prominence: 0.92, mode: "minor", tags: ["violence","confessional","hook"] },
  { id: "s33", title: "Dynamite", artist: "Taio Cruz", year: 2010, activation: 0.9, valence: 0.72, prominence: 0.82, mode: "major", tags: ["electro-pop","celebratory","hands-up"] },
  { id: "s34", title: "Bad Romance", artist: "Lady Gaga", year: 2010, activation: 0.85, valence: -0.15, prominence: 0.9, mode: "minor", tags: ["theatrical","dark-glam","club"] },
  { id: "s35", title: "Airplanes", artist: "B.o.B feat. Hayley Williams", year: 2010, activation: 0.45, valence: -0.1, prominence: 0.78, mode: "minor", tags: ["wistful","rap-pop","nostalgic"] },
  { id: "s36", title: "Somebody That I Used to Know", artist: "Gotye feat. Kimbra", year: 2012, activation: 0.3, valence: -0.45, prominence: 0.94, mode: "minor", tags: ["brittle","indie","resentful"] },
  { id: "s37", title: "Call Me Maybe", artist: "Carly Rae Jepsen", year: 2012, activation: 0.85, valence: 0.85, prominence: 0.92, mode: "major", tags: ["giddy","bright","hook"] },
  { id: "s38", title: "We Are Young", artist: "fun. feat. Janelle Monáe", year: 2012, activation: 0.5, valence: 0.4, prominence: 0.88, mode: "major", tags: ["communal","anthemic","bittersweet"] },
  { id: "s39", title: "Payphone", artist: "Maroon 5 feat. Wiz Khalifa", year: 2012, activation: 0.65, valence: -0.05, prominence: 0.82, mode: "minor", tags: ["polished","breakup","radio"] },
  { id: "s40", title: "Gangnam Style", artist: "PSY", year: 2012, activation: 0.98, valence: 0.8, prominence: 0.9, mode: "minor", tags: ["absurd","viral","maximal"] },
  { id: "s41", title: "Some Nights", artist: "fun.", year: 2012, activation: 0.6, valence: 0.15, prominence: 0.76, mode: "major", tags: ["marching","searching","chorale"] },
  { id: "s42", title: "Love Yourself", artist: "Justin Bieber", year: 2016, activation: -0.4, valence: -0.2, prominence: 0.94, mode: "major", tags: ["spare","dismissive","acoustic"] },
  { id: "s43", title: "Sorry", artist: "Justin Bieber", year: 2016, activation: 0.6, valence: 0.25, prominence: 0.9, mode: "minor", tags: ["tropical","contrite","dance"] },
  { id: "s44", title: "One Dance", artist: "Drake feat. Wizkid & Kyla", year: 2016, activation: 0.4, valence: 0.1, prominence: 0.92, mode: "minor", tags: ["afrobeats","hazy","hypnotic"] },
  { id: "s45", title: "Closer", artist: "The Chainsmokers feat. Halsey", year: 2016, activation: 0.55, valence: 0.2, prominence: 0.88, mode: "major", tags: ["nostalgic","EDM-pop","duet"] },
  { id: "s46", title: "Work", artist: "Rihanna feat. Drake", year: 2016, activation: 0.45, valence: 0.05, prominence: 0.84, mode: "minor", tags: ["dancehall","elliptical","loop"] },
  { id: "s47", title: "Formation", artist: "Beyoncé", year: 2016, activation: 0.7, valence: -0.1, prominence: 0.8, mode: "minor", tags: ["declarative","bounce","political"] },
  { id: "s48", title: "God's Plan", artist: "Drake", year: 2018, activation: 0.35, valence: 0.2, prominence: 0.94, mode: "minor", tags: ["gratitude","trap","understated"] },
  { id: "s49", title: "Perfect", artist: "Ed Sheeran", year: 2018, activation: -0.3, valence: 0.55, prominence: 0.88, mode: "major", tags: ["wedding","warm","ballad"] },
  { id: "s50", title: "Havana", artist: "Camila Cabello feat. Young Thug", year: 2018, activation: 0.5, valence: 0.45, prominence: 0.86, mode: "minor", tags: ["latin-pop","sultry","piano"] },
  { id: "s51", title: "rockstar", artist: "Post Malone feat. 21 Savage", year: 2018, activation: 0.4, valence: -0.55, prominence: 0.88, mode: "minor", tags: ["numb","trap","narcotic"] },
  { id: "s52", title: "This Is America", artist: "Childish Gambino", year: 2018, activation: 0.75, valence: -0.7, prominence: 0.82, mode: "modal", tags: ["protest","whiplash","gospel"] },
  { id: "s53", title: "thank u, next", artist: "Ariana Grande", year: 2018, activation: 0.35, valence: 0.4, prominence: 0.84, mode: "major", tags: ["postmortem","wry","light"] },
  { id: "s54", title: "Blinding Lights", artist: "The Weeknd", year: 2020, activation: 0.85, valence: 0.15, prominence: 0.98, mode: "minor", tags: ["synthwave","urgent","nostalgic"] },
  { id: "s55", title: "Circles", artist: "Post Malone", year: 2020, activation: 0.3, valence: -0.05, prominence: 0.88, mode: "major", tags: ["loop","resigned","soft-rock"] },
  { id: "s56", title: "The Box", artist: "Roddy Ricch", year: 2020, activation: 0.55, valence: -0.35, prominence: 0.86, mode: "minor", tags: ["sparse","hard","viral"], mediaQuery: "id:1490463311" },
  { id: "s57", title: "Don't Start Now", artist: "Dua Lipa", year: 2020, activation: 0.88, valence: 0.6, prominence: 0.9, mode: "minor", tags: ["disco","assertive","dance"] },
  { id: "s58", title: "Savage", artist: "Megan Thee Stallion", year: 2020, activation: 0.8, valence: 0.3, prominence: 0.82, mode: "minor", tags: ["braggadocio","bounce","meme"] },
  { id: "s59", title: "cardigan", artist: "Taylor Swift", year: 2020, activation: -0.55, valence: -0.25, prominence: 0.84, mode: "minor", tags: ["interior","folk","muted"] },
  { id: "s60", title: "As It Was", artist: "Harry Styles", year: 2022, activation: 0.55, valence: -0.15, prominence: 0.97, mode: "major", tags: ["bright-sad","synth-pop","propulsive"] },
  { id: "s61", title: "Heat Waves", artist: "Glass Animals", year: 2022, activation: 0.35, valence: -0.1, prominence: 0.92, mode: "major", tags: ["hazy","longing","slow-burn"] },
  { id: "s62", title: "Stay", artist: "The Kid LAROI & Justin Bieber", year: 2022, activation: 0.75, valence: -0.05, prominence: 0.88, mode: "minor", tags: ["hyper","pleading","compressed"] },
  { id: "s63", title: "About Damn Time", artist: "Lizzo", year: 2022, activation: 0.8, valence: 0.75, prominence: 0.84, mode: "minor", tags: ["disco-funk","celebratory","release"] },
  { id: "s64", title: "Running Up That Hill", artist: "Kate Bush", year: 2022, activation: 0.5, valence: -0.3, prominence: 0.86, mode: "minor", tags: ["revival","insistent","uncanny"] },
  { id: "s65", title: "Bad Habit", artist: "Steve Lacy", year: 2022, activation: 0.3, valence: 0.2, prominence: 0.8, mode: "major", tags: ["loose","bedroom","warm"] },
  { id: "s66", title: "Lose Control", artist: "Teddy Swims", year: 2024, activation: 0.45, valence: -0.2, prominence: 0.92, mode: "minor", tags: ["soul-belt","unravelling","radio"] },
  { id: "s67", title: "Espresso", artist: "Sabrina Carpenter", year: 2024, activation: 0.7, valence: 0.75, prominence: 0.94, mode: "major", tags: ["quippy","sunlit","disco-pop"] },
  { id: "s68", title: "Not Like Us", artist: "Kendrick Lamar", year: 2024, activation: 0.85, valence: -0.5, prominence: 0.96, mode: "minor", tags: ["feud","bounce","indictment"] },
  { id: "s69", title: "Birds of a Feather", artist: "Billie Eilish", year: 2024, activation: -0.1, valence: 0.3, prominence: 0.9, mode: "major", tags: ["devotional","soft","intimate"] },
  { id: "s70", title: "Texas Hold 'Em", artist: "Beyoncé", year: 2024, activation: 0.55, valence: 0.5, prominence: 0.86, mode: "major", tags: ["country","reclaiming","banjo"], mediaQuery: "Texas Hold Em Beyonce" },
  { id: "s71", title: "Good Luck, Babe!", artist: "Chappell Roan", year: 2024, activation: 0.65, valence: 0.05, prominence: 0.84, mode: "minor", tags: ["synth-pop","knowing","ache"] }
];

export const news: NewsPoint[] = [
  { id: "n0", title: "Bush v. Gore and the Florida recount", year: 2000, activation: 0.55, valence: -0.35, prominence: 0.95, tags: ["politics","uncertainty","legitimacy"] },
  { id: "n1", title: "The dot-com bubble begins to deflate", year: 2000, activation: 0.45, valence: -0.5, prominence: 0.88, tags: ["economy","technology","reversal"], wikipediaTitle: "Dot-com bubble" },
  { id: "n2", title: "USS Cole bombed in Aden", year: 2000, activation: 0.8, valence: -0.75, prominence: 0.72, tags: ["terror","military","warning"] },
  { id: "n3", title: "Working draft of the human genome announced", year: 2000, activation: 0.3, valence: 0.65, prominence: 0.78, tags: ["science","optimism","frontier"] },
  { id: "n4", title: "Concorde crashes outside Paris", year: 2000, activation: 0.85, valence: -0.7, prominence: 0.66, tags: ["disaster","aviation","end-of-era"] },
  { id: "n5", title: "Sydney Olympics", year: 2000, activation: 0.7, valence: 0.6, prominence: 0.74, tags: ["spectacle","global","unity"] },
  { id: "n6", title: "September 11 attacks", year: 2001, activation: 0.98, valence: -0.98, prominence: 1, tags: ["terror","mass-death","rupture"] },
  { id: "n7", title: "The war in Afghanistan begins", year: 2001, activation: 0.85, valence: -0.7, prominence: 0.9, tags: ["war","retaliation","open-ended"] },
  { id: "n8", title: "Anthrax letters", year: 2001, activation: 0.7, valence: -0.75, prominence: 0.74, tags: ["terror","dread","contamination"] },
  { id: "n9", title: "Enron collapses", year: 2001, activation: 0.55, valence: -0.6, prominence: 0.78, tags: ["fraud","economy","institutional"] },
  { id: "n10", title: "The iPod is introduced", year: 2001, activation: 0.35, valence: 0.55, prominence: 0.7, tags: ["technology","consumer","shift"] },
  { id: "n11", title: "Wikipedia launches", year: 2001, activation: 0.25, valence: 0.5, prominence: 0.58, tags: ["technology","commons","quiet-start"] },
  { id: "n12", title: "Indian Ocean earthquake and tsunami", year: 2004, activation: 0.92, valence: -0.96, prominence: 0.98, tags: ["disaster","mass-death","global"] },
  { id: "n13", title: "Abu Ghraib photographs published", year: 2004, activation: 0.7, valence: -0.85, prominence: 0.88, tags: ["atrocity","war","accountability"] },
  { id: "n14", title: "Madrid train bombings", year: 2004, activation: 0.88, valence: -0.85, prominence: 0.8, tags: ["terror","europe","election-effect"] },
  { id: "n15", title: "Beslan school siege", year: 2004, activation: 0.9, valence: -0.92, prominence: 0.76, tags: ["terror","children","siege"] },
  { id: "n16", title: "Bush re-elected in a polarised vote", year: 2004, activation: 0.55, valence: -0.2, prominence: 0.86, tags: ["politics","division","mandate"] },
  { id: "n17", title: "Facebook founded", year: 2004, activation: 0.3, valence: 0.35, prominence: 0.6, tags: ["technology","social","seed"] },
  { id: "n18", title: "Saddam Hussein executed", year: 2006, activation: 0.65, valence: -0.6, prominence: 0.82, tags: ["war","justice","finality"] },
  { id: "n19", title: "Israel–Lebanon war", year: 2006, activation: 0.85, valence: -0.78, prominence: 0.84, tags: ["war","region","civilians"] },
  { id: "n20", title: "North Korea's first nuclear test", year: 2006, activation: 0.6, valence: -0.7, prominence: 0.8, tags: ["proliferation","escalation","geopolitics"] },
  { id: "n21", title: "US midterms flip both chambers", year: 2006, activation: 0.5, valence: 0.15, prominence: 0.78, tags: ["politics","correction","war-fatigue"] },
  { id: "n22", title: "Twitter launches", year: 2006, activation: 0.35, valence: 0.3, prominence: 0.58, tags: ["technology","social","seed"] },
  { id: "n23", title: "Pluto reclassified as a dwarf planet", year: 2006, activation: 0.2, valence: -0.05, prominence: 0.54, tags: ["science","revision","sentiment"] },
  { id: "n24", title: "Lehman Brothers fails; global financial crisis", year: 2008, activation: 0.92, valence: -0.9, prominence: 1, tags: ["economy","crisis","contagion"] },
  { id: "n25", title: "Barack Obama elected president", year: 2008, activation: 0.8, valence: 0.7, prominence: 0.96, tags: ["politics","history","hope"] },
  { id: "n26", title: "Sichuan earthquake", year: 2008, activation: 0.85, valence: -0.88, prominence: 0.76, tags: ["disaster","mass-death","china"] },
  { id: "n27", title: "Mumbai attacks", year: 2008, activation: 0.88, valence: -0.85, prominence: 0.74, tags: ["terror","siege","india"], wikipediaTitle: "2008 Mumbai attacks" },
  { id: "n28", title: "Oil passes $140 a barrel", year: 2008, activation: 0.5, valence: -0.55, prominence: 0.7, tags: ["economy","energy","squeeze"] },
  { id: "n29", title: "Beijing Olympics", year: 2008, activation: 0.75, valence: 0.45, prominence: 0.78, tags: ["spectacle","power","global"], wikipediaTitle: "2008 Summer Olympics opening ceremony" },
  { id: "n30", title: "Deepwater Horizon blowout and spill", year: 2010, activation: 0.8, valence: -0.85, prominence: 0.94, tags: ["environment","industry","prolonged"] },
  { id: "n31", title: "Haiti earthquake", year: 2010, activation: 0.88, valence: -0.95, prominence: 0.92, tags: ["disaster","mass-death","aid"], wikipediaTitle: "2010 Haiti earthquake" },
  { id: "n32", title: "Chilean miners rescued after 69 days", year: 2010, activation: 0.7, valence: 0.75, prominence: 0.8, tags: ["rescue","endurance","televised"] },
  { id: "n33", title: "WikiLeaks publishes the diplomatic cables", year: 2010, activation: 0.6, valence: -0.3, prominence: 0.82, tags: ["secrecy","leak","state"] },
  { id: "n34", title: "Eyjafjallajökull grounds European aviation", year: 2010, activation: 0.55, valence: -0.35, prominence: 0.66, tags: ["nature","disruption","absurd"], wikipediaTitle: "2010 eruptions of Eyjafjallajökull" },
  { id: "n35", title: "Tunisia's uprising begins", year: 2010, activation: 0.8, valence: 0.25, prominence: 0.68, tags: ["protest","revolution","onset"] },
  { id: "n36", title: "Hurricane Sandy", year: 2012, activation: 0.8, valence: -0.75, prominence: 0.86, tags: ["climate","disaster","infrastructure"] },
  { id: "n37", title: "Sandy Hook school shooting", year: 2012, activation: 0.75, valence: -0.96, prominence: 0.9, tags: ["gun-violence","children","grief"] },
  { id: "n38", title: "Syria's civil war deepens", year: 2012, activation: 0.82, valence: -0.8, prominence: 0.8, tags: ["war","civilians","attrition"] },
  { id: "n39", title: "Obama re-elected", year: 2012, activation: 0.5, valence: 0.25, prominence: 0.8, tags: ["politics","continuity","coalition"] },
  { id: "n40", title: "Curiosity lands on Mars", year: 2012, activation: 0.6, valence: 0.8, prominence: 0.72, tags: ["science","wonder","precision"] },
  { id: "n41", title: "London Olympics", year: 2012, activation: 0.7, valence: 0.65, prominence: 0.74, tags: ["spectacle","global","civic"] },
  { id: "n42", title: "The United Kingdom votes to leave the EU", year: 2016, activation: 0.7, valence: -0.45, prominence: 0.94, tags: ["politics","shock","realignment"] },
  { id: "n43", title: "Donald Trump elected president", year: 2016, activation: 0.8, valence: -0.4, prominence: 0.98, tags: ["politics","shock","realignment"] },
  { id: "n44", title: "Pulse nightclub shooting", year: 2016, activation: 0.78, valence: -0.92, prominence: 0.84, tags: ["gun-violence","LGBTQ","hate"] },
  { id: "n45", title: "The siege and fall of eastern Aleppo", year: 2016, activation: 0.8, valence: -0.88, prominence: 0.78, tags: ["war","civilians","witness"] },
  { id: "n46", title: "Panama Papers", year: 2016, activation: 0.55, valence: -0.35, prominence: 0.74, tags: ["leak","wealth","accountability"] },
  { id: "n47", title: "Zika outbreak declared an emergency", year: 2016, activation: 0.6, valence: -0.55, prominence: 0.66, tags: ["health","contagion","pregnancy"] },
  { id: "n48", title: "Parkland shooting and March for Our Lives", year: 2018, activation: 0.78, valence: -0.65, prominence: 0.88, tags: ["gun-violence","youth","protest"] },
  { id: "n49", title: "Family separations at the US border", year: 2018, activation: 0.7, valence: -0.85, prominence: 0.88, tags: ["policy","children","cruelty"] },
  { id: "n50", title: "Jamal Khashoggi killed in Istanbul", year: 2018, activation: 0.65, valence: -0.88, prominence: 0.82, tags: ["press","state-violence","impunity"] },
  { id: "n51", title: "IPCC's 1.5°C report", year: 2018, activation: 0.45, valence: -0.7, prominence: 0.78, tags: ["climate","deadline","science"] },
  { id: "n52", title: "Cambridge Analytica and Facebook data", year: 2018, activation: 0.55, valence: -0.5, prominence: 0.76, tags: ["technology","privacy","manipulation"] },
  { id: "n53", title: "Tham Luang cave rescue", year: 2018, activation: 0.72, valence: 0.7, prominence: 0.7, tags: ["rescue","endurance","televised"] },
  { id: "n54", title: "COVID-19 pandemic", year: 2020, activation: 0.95, valence: -0.98, prominence: 1, tags: ["pandemic","mass-death","disruption"] },
  { id: "n55", title: "George Floyd killed; global protests", year: 2020, activation: 0.92, valence: -0.7, prominence: 0.96, tags: ["protest","race","reckoning"] },
  { id: "n56", title: "A contested US election", year: 2020, activation: 0.8, valence: -0.45, prominence: 0.92, tags: ["politics","legitimacy","strain"] },
  { id: "n57", title: "mRNA vaccines shown to work", year: 2020, activation: 0.55, valence: 0.8, prominence: 0.88, tags: ["science","relief","speed"], wikipediaTitle: "COVID-19 vaccine" },
  { id: "n58", title: "Australian bushfires", year: 2020, activation: 0.8, valence: -0.8, prominence: 0.74, tags: ["climate","fire","wildlife"] },
  { id: "n59", title: "Beirut port explosion", year: 2020, activation: 0.9, valence: -0.88, prominence: 0.72, tags: ["disaster","negligence","city"], wikipediaTitle: "2020 Beirut explosion" },
  { id: "n60", title: "Russia invades Ukraine", year: 2022, activation: 0.92, valence: -0.9, prominence: 1, tags: ["war","europe","invasion"] },
  { id: "n61", title: "Roe v. Wade overturned", year: 2022, activation: 0.7, valence: -0.7, prominence: 0.92, tags: ["rights","court","reversal"] },
  { id: "n62", title: "Inflation hits four-decade highs", year: 2022, activation: 0.5, valence: -0.6, prominence: 0.88, tags: ["economy","cost-of-living","grind"] },
  { id: "n63", title: "Uvalde school shooting", year: 2022, activation: 0.78, valence: -0.95, prominence: 0.84, tags: ["gun-violence","children","failure"] },
  { id: "n64", title: "Queen Elizabeth II dies", year: 2022, activation: 0.45, valence: -0.2, prominence: 0.82, tags: ["ritual","end-of-era","global"] },
  { id: "n65", title: "ChatGPT released", year: 2022, activation: 0.55, valence: 0.2, prominence: 0.8, tags: ["technology","rupture","onset"] },
  { id: "n66", title: "The war in Gaza", year: 2024, activation: 0.9, valence: -0.95, prominence: 0.98, tags: ["war","civilians","rupture"], wikipediaTitle: "Gaza war" },
  { id: "n67", title: "Trump returns to the presidency", year: 2024, activation: 0.8, valence: -0.35, prominence: 0.96, tags: ["politics","restoration","division"] },
  { id: "n68", title: "The hottest year on record", year: 2024, activation: 0.45, valence: -0.75, prominence: 0.86, tags: ["climate","record","accumulation"] },
  { id: "n69", title: "Generative AI reaches everything", year: 2024, activation: 0.65, valence: -0.1, prominence: 0.9, tags: ["technology","labour","saturation"] },
  { id: "n70", title: "Ukraine's war grinds into its third year", year: 2024, activation: 0.7, valence: -0.75, prominence: 0.8, tags: ["war","attrition","fatigue"] },
  { id: "n71", title: "Paris Olympics", year: 2024, activation: 0.72, valence: 0.65, prominence: 0.78, tags: ["spectacle","global","relief"], wikipediaTitle: "2024 Summer Olympics opening ceremony" }
];

/** Prominence-weighted centre of gravity for a set of points. */
export function centroid(items: Array<SongPoint | NewsPoint>): Centroid {
  if (!items.length) return { activation: 0, valence: 0 };
  let w = 0;
  let a = 0;
  let v = 0;
  for (const p of items) {
    w += p.prominence;
    a += p.activation * p.prominence;
    v += p.valence * p.prominence;
  }
  return { activation: a / w, valence: v / w };
}

/** Per-year centroids plus the music/news divergence distance. */
export const yearHistory: YearHistory[] = years.map((year) => {
  const music = centroid(songs.filter((s) => s.year === year));
  const newsC = centroid(news.filter((n) => n.year === year));
  return {
    year,
    music,
    news: newsC,
    divergence: Math.hypot(music.activation - newsC.activation, music.valence - newsC.valence)
  };
});

export const MAX_DIVERGENCE = 2.83;
