import type { Metadata } from 'next';

import { SITE_NAME } from '@/lib/site-brand';

import { MffAside } from './MffAside';
import styles from './mff.module.css';

const TITLE = 'Leave the Door Open';
const DESCRIPTION = 'On Midwest FurFest, generative AI, and the community I still want to call home.';
const CANONICAL_PATH = '/mff';
const MFF_PUBLIC = false;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: CANONICAL_PATH },
  robots: { index: MFF_PUBLIC, follow: true },
  openGraph: {
    type: 'article',
    title: `${TITLE} | ${SITE_NAME}`,
    description: DESCRIPTION,
    url: CANONICAL_PATH,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${TITLE} | ${SITE_NAME}`,
    description: DESCRIPTION,
  },
};

const POLICY_OPTIONS = [
  {
    tag: 'Option 01',
    title: 'Human Authorship',
    body: 'Permit AI-assisted work when there is meaningful human creative direction. Require disclosure. Allow the convention to ask about process. Direct prompt-to-product merchandise can remain prohibited.',
    punch: 'Judge the process, not merely the tool.',
  },
  {
    tag: 'Option 02',
    title: 'Commercial Boundary',
    body: 'Keep primarily generated visual artwork out of Artists Alley and the Dealers Den while leaving room elsewhere for software, accessibility tools, games, animation, storytelling, and interactive experiences.',
    punch: 'Regulate commerce more tightly than creation.',
  },
  {
    tag: 'Option 03',
    title: 'Experimental Track',
    body: 'Create a clearly labeled emerging-technology space for one year. Require disclosure and consent safeguards. Invite builders and critics. Collect feedback, then revisit the policy.',
    punch: 'Learn before legislating broadly.',
  },
];

const DEMOS = [
  {
    tag: 'Accessibility',
    title: 'Describe this picture.',
    body: 'Vision-assisted experiences that make visual furry work more interrogable to low-vision and blind visitors.',
  },
  {
    tag: 'Characters',
    title: 'Talk to someone imaginary.',
    body: 'Disclosed, bounded character interaction built around authored personality and continuity.',
  },
  {
    tag: 'Storytelling',
    title: 'Make me an adventure.',
    body: 'Species. Setting. Mood. A tiny personalized furry vignette improvised with its player.',
  },
  {
    tag: 'Provenance',
    title: 'Show your work.',
    body: 'Expose concept, direction, iterations, rejected generations, edits, compositing, and finished work.',
  },
];

export default function MidwestFurFestPage() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <p className={styles.kicker}>An open letter</p>
          <h1 className={styles.title}>
            Leave the
            <br />
            Door Open.
          </h1>
          <p className={styles.deck}>{DESCRIPTION}</p>
          <p className={styles.byline}>Austen Tucker &middot; September 2026</p>
          <a className={styles.heroLink} href="#letter">
            Read the letter ↓
          </a>
        </div>
      </section>

      <main>
        <div className={styles.magazine}>
          <div className={styles.textCol}>
            <article id="letter" className="prose">
              <p>My first Midwest FurFest was in 2003.</p>
              <p>
                I drove up with a Republican rabbit who insisted that I needed to experience the furry
                community for myself. He was right.
              </p>
              <p>
                Through MFF, I encountered people, ideas, identities, and ways of living I had never
                had access to before. Furry expanded my understanding of what a life could look like,
                and through the community it built, I eventually found the courage to change my own
                life completely.
              </p>
              <p>
                I transitioned. I moved to Chicago to be closer to my furry friends. I integrated my
                life with this community.
              </p>
              <p>And I did not simply attend it.</p>
              <p>
                I have written furry fiction for decades, including work from the early years of the
                Ursa awards. I helped contribute to the literary culture of this fandom while it was
                still defining what furry fiction could be. I have attended MFF for 23 years and
                volunteered for six.
              </p>
              <p>
                Furry has not simply been a hobby I visit once a year. It is one of the communities
                that made me who I am, and one I have spent much of my adult life contributing back to.
              </p>
              <p>That is why the convention&rsquo;s stance toward AI has been so painful.</p>
              <p>
                Since the emergence of modern generative AI, I have increasingly found myself
                castigated, othered, and treated as lesser within the community because I use these
                tools in both my creative and technical life.
              </p>
              <p>For me, some of these tools are not novelties.</p>
              <p>
                I have low vision. AI vision systems have become transformative accessibility tools,
                allowing me to interrogate images and physical spaces in ways that were previously
                difficult or impossible.
              </p>
              <p>And I cannot draw.</p>
              <p>
                So when image generation became available, I became fascinated by it. For the first
                time, I could explore a visual imagination I had spent my life largely unable to
                express directly. I could experiment with character design, composition, environments,
                and storytelling in ways that had never been available to me.
              </p>
              <p>Apparently, that also makes me a pariah.</p>
              <p>I do not believe it should.</p>
            </article>
          </div>

          <MffAside kicker="A different way forward" title="This does not have to be a binary choice.">
            <p className={styles.lede}>
              These are examples, not demands. MFF does not need to adopt my preferred AI policy. I
              want us to recognize that the choice is not simply prohibition or anything-goes.
            </p>
            <div className={styles.cards}>
              {POLICY_OPTIONS.map((option) => (
                <article className={styles.card} key={option.tag}>
                  <p className={styles.tag}>{option.tag}</p>
                  <h3>{option.title}</h3>
                  <p>{option.body}</p>
                  <p className={styles.cardPunch}>{option.punch}</p>
                </article>
              ))}
            </div>
          </MffAside>

          <div className={styles.textCol}>
            <article className="prose">
              <p>
                AI contains extraordinary possibilities for the furry community. These are tools for
                accessibility, play, experimentation, software, games, animation, storytelling, and
                forms of creativity we have barely begun to invent.
              </p>
              <p>
                I reject the idea that the future must be framed as Artists vs. AI. Artists are already
                using AI. So are disabled people, programmers, writers, musicians, animators,
                hobbyists, makers, and people who previously had no practical access to certain
                creative media.
              </p>
              <p>
                This is not a replacement for creativity. It is another creative medium entering the
                room.
              </p>
              <p className={styles.punch}>It is chocolate sauce, not a new bowl of ice cream.</p>
              <p>
                And furry, of all communities, should understand that new tools do not erase old ones.
                We did not stop drawing because digital art arrived. We did not stop making costumes
                because 3D printers appeared.
              </p>
              <p>We added more ways to create.</p>
              <p>That is what I want AI to become here.</p>
            </article>
          </div>

          <MffAside kicker="I remember having this argument before" title="The tools changed. The artists stayed.">
            <p className={styles.lede}>
              Around 2011 and 2012, while attending conventions including Furry Connection North and
              IndyFurCon, I remember arguments about artists bringing iPads and other digital drawing
              tools into convention spaces traditionally organized around paper. This is my personal
              recollection, not a claim that either convention maintained a formal ban.
            </p>
            <div className={styles.history}>
              <div className={styles.historyStep}>
                <div className={styles.year}>2011</div>
                <p>Does someone drawing on an iPad belong in an Artists Alley built around paper?</p>
              </div>
              <span className={styles.historyArrow} aria-hidden="true">
                →
              </span>
              <div className={styles.historyStep}>
                <div className={styles.year}>2026</div>
                <p>Digital illustration is an ordinary part of furry art and convention culture.</p>
              </div>
            </div>
            <p className={styles.lede}>
              Generative AI is not digital illustration, and its questions around training data,
              consent, attribution, and commercial competition are different. But I recognize the
              reflex: a new tool changes what is easy and difficult, and suddenly we find ourselves
              arguing about whether the people using it are artists at all.
            </p>
            <p className={styles.lede}>
              I used to think that reassured us: furry already had this argument once and got past it.
              I no longer think that. Since 2022, Fur Affinity has banned AI-generated art outright.
              NordicFuzzCon and Citrus Con have adopted bans of their own in their Artist Alleys and
              Dealers&rsquo; Dens. IndyFurCon &mdash; the very convention where I remember arguing about
              iPads &mdash; now prohibits AI in its Artist Alley too.
            </p>
            <p className={`${styles.lede} ${styles.punch}`}>
              The same reflex is happening again, this time across the whole fandom at once. I
              don&rsquo;t think that should reassure anyone. I think it should worry us.
            </p>
          </MffAside>

          <div className={styles.textCol}>
            <article className="prose">
              <p>
                I would be happy to give the board an interactive demonstration of some of my own
                software and show, rather than merely tell, what I believe these technologies can make
                possible for furry creators.
              </p>
              <p>
                I believe code wins. A solid demonstration, in the right room, can sometimes change a
                conversation that abstract arguments cannot.
              </p>

              <hr />

              <p>
                Until Midwest FurFest&rsquo;s anti-AI policy is materially revised or eliminated, I will
                not be volunteering for or attending the convention.
              </p>
              <p>That is not a decision I make lightly.</p>
              <p>
                After more than two decades as an attendee and member of this fandom, I finally feel
                that I have something uniquely valuable to contribute to its next chapter: decades of
                creative work, two decades of technical experience, and direct experience building with
                a technology that will shape much of what comes next.
              </p>
              <p>
                If the convention has decided that this kind of exploration is incompatible with the
                community it wants to build, then there is no meaningful place for me in that world.
              </p>

              <hr />

              <p>The attempt to drive AI art from the furry community has not made it disappear.</p>
              <p>Instead, it has begun driving some of its creators elsewhere.</p>
              <p>
                I am watching from the inside as something small begins to take shape: private Telegram
                channels, Discord servers, informal groups, and communities built around sharing work
                that has become unwelcome elsewhere.
              </p>
              <p>Nothing enormous yet.</p>
              <p className={styles.punch}>But this is no longer hypothetical.</p>
              <p>
                Outside furry, AI-art communities have already grown large enough to develop their own
                social infrastructure: galleries, Discord servers, contests, marketplaces, collaborative
                tools, shared techniques, and their own emerging creative culture.
              </p>
              <p>
                Inside furry, the beginnings are smaller. There are already groups explicitly devoted to
                AI-generated anthropomorphic artwork. I am in some of these spaces. I can watch this
                process happening in real time.
              </p>
              <p>That concerns me.</p>
              <p>
                Not because I believe people using AI should be driven away, but because I believe the
                opposite.
              </p>
              <p>
                I am already watching some of these spaces attract people whose values are far less
                aligned with the openness, creativity, consent, experimentation, and mutual care that
                furry communities have spent decades trying to build.
              </p>
              <p>
                When people who want to use these technologies responsibly are told that the technology
                itself makes them unwelcome, they do not necessarily stop using it.
              </p>
              <p>They find somewhere else to go.</p>
              <p>
                And the demand is there. My AI-assisted images on DeviantArt regularly receive roughly
                four times the views I could get for comparable work on Fur Affinity.
              </p>
              <p>
                <em>
                  Fur Affinity has prohibited AI-generated art outright since 2022, so that comparison
                  is not entirely fair. But the gap in attention is still real, and it is still growing.
                </em>
              </p>
              <p>Today these communities are small.</p>
              <p>They may not remain that way.</p>
              <p>
                One day, someone with money may decide that instead of fighting for a place inside
                furry&rsquo;s existing institutions, it would be easier to build new institutions around
                the art those communities rejected.
              </p>
              <p>Maybe that never happens.</p>
              <p>I hope it doesn&rsquo;t.</p>
              <p>
                But I do not think we should assume that exclusion makes the underlying community
                disappear.
              </p>

              <hr />

              <p>This is not an easy letter to write.</p>
              <p>
                Members of the staff and board of this convention are my neighbors, my friends, even my
                family. These are people I love, in a community I love.
              </p>
              <p>
                But I cannot stand by and watch us open the door to a fractured fandom: parallel
                communities growing apart from one another, developing different norms and different
                ethical cultures, until the distance between them becomes much harder to bridge.
              </p>
              <p>I do not know what all the consequences of that fracture would be.</p>
              <p>That is precisely why I believe we should be trying so hard to prevent it now.</p>
              <p>
                Excluding responsible, community-minded creators will not make generative AI disappear.
                It will simply remove many of the people most interested in shaping how these
                technologies are used responsibly.
              </p>
              <p className={styles.punch}>The vacuum will still be filled.</p>
              <p>
                If thoughtful people are pushed out of this conversation, the result will not
                necessarily be one unified fandom that rejected AI. It may instead be parallel
                communities developing around it, potentially with very different ethical cultures and
                very little dialogue between them.
              </p>
              <p>That fracture is not inevitable.</p>
              <p>
                For 23 years, Midwest FurFest has been one of the places where I watched this community
                grow, experiment, stumble, learn, and reinvent itself.
              </p>
              <p>I want it to remain that kind of place.</p>
              <p>
                But in those 23 years, I have never been more disappointed in the direction the
                convention has chosen.
              </p>
              <p>
                I am asking the board to reconsider this approach before it hardens into something much
                more difficult to undo.
              </p>
              <p>
                I would much rather spend the next twenty years helping this community figure out how
                to use these tools well than watching from somewhere else as we build separate futures.
              </p>
            </article>
          </div>

          <MffAside kicker="Show, don’t tell" title="Don’t imagine it. Try it.">
            <p className={styles.lede}>
              &ldquo;AI art&rdquo; is too small a box for the experiments I want furry technologists and
              creators to be able to build.
            </p>
            <div className={styles.demos}>
              {DEMOS.map((demo) => (
                <article className={`${styles.card} ${styles.demo}`} key={demo.tag}>
                  <p className={styles.tag}>{demo.tag}</p>
                  <h3>{demo.title}</h3>
                  <p>{demo.body}</p>
                  <p className={styles.demoNote}>Interactive demo placeholder</p>
                </article>
              ))}
            </div>
          </MffAside>
        </div>

        <section className={styles.door} aria-labelledby="closing-line">
          <div id="closing-line" className={styles.finalLine}>
            I hope you will leave a door open for me to come home.
          </div>
        </section>

        <section className={styles.notes} aria-labelledby="sources-heading">
          <h2 id="sources-heading">Sources &amp; further reading</h2>
          <p>
            This page separates personal recollection from externally verifiable claims. Historical
            memories are presented as memories; factual claims are linked below.
          </p>
          <ol>
            <li>
              <a href="https://www.furaffinity.net/journal/10626395/">Fur Affinity: AI and blockchain content policy, December 2022</a>
              {' '}— AI-generated submissions prohibited from the platform.
            </li>
            <li>
              <a href="https://www.indyfurcon.com/dealers-den/artist-alley/">IndyFurCon Artist Alley policy</a>
              {' '}— current rules prohibit the use of generative AI to create products for sale in the Alley.
            </li>
            <li>
              <a href="https://www.nordicfuzzcon.org/DealersDenRules">NordicFuzzCon Dealers&rsquo; Den rules</a>
              {' '}— current rules prohibit generative-AI artwork in the Dealers&rsquo; Den.
            </li>
            <li>
              <a href="https://www.citruscon.com/artist-alley-applications">Citrus Con Artist Alley rules</a>
              {' '}— generated artwork is not allowed in the Artist Alley.
            </li>
            <li>
              <a href="https://www.deviantart.com/dreamup">DeviantArt DreamUp</a>
              {' '}— an example of AI-art infrastructure developing within an established art community.
            </li>
            <li>
              <a href="https://discord.com/servers/nightcafe-lounge-943306099019370566">NightCafe Lounge on Discord</a>
              {' '}— a large community organized around AI image creation.
            </li>
            <li>
              <a href="https://nicegram.app/hub/group/FurryAICanvas">Furry AI Canvas</a>
              {' '}— a small Telegram community specifically organized around AI-generated anthropomorphic art.
            </li>
          </ol>
        </section>
      </main>
    </div>
  );
}
