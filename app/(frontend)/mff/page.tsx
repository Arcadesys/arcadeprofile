import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { SITE_NAME } from '@/lib/site-brand';
import { ZOO_HERO, ZOO_COLLECTION_PATH, ZOO_FEATURED_COLLECTION } from '@/lib/zoo-collection-meta';

import { Callout } from './Callout';
import { MffAnalytics } from './MffAnalytics';
import styles from './mff.module.css';

const TITLE = 'Leave the Door Open';
const DESCRIPTION = 'On Midwest FurFest, generative AI, and the community I still want to call home.';
const CANONICAL_PATH = '/mff';
const MFF_PUBLIC = true;
const MANIFESTO_VERSION = '1.0.0';
const MANIFESTO_DATE = 'September 17, 2026';

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

export default function MidwestFurFestPage() {
  return (
    <div id="mff-page" className={styles.page}>
      <MffAnalytics />
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <p className={styles.kicker}>An open letter</p>
          <h1 className={styles.title}>
            Leave the
            <br />
            Door Open.
          </h1>
          <p className={styles.deck}>{DESCRIPTION}</p>
          <p className={styles.byline}>
            Austen Tucker &middot; {MANIFESTO_DATE} &middot; v{MANIFESTO_VERSION}
          </p>
        </div>
      </section>

      <main className={styles.magazine}>
        <section className={styles.atAGlance} aria-labelledby="at-a-glance-heading">
          <div className={styles.atAGlanceHeader}>
            <p className={styles.kicker}>At a glance</p>
            <p className={styles.versionStamp}>Manifesto v{MANIFESTO_VERSION}</p>
          </div>
          <h2 id="at-a-glance-heading">The argument in five minutes</h2>
          <dl className={styles.summaryGrid}>
            <div>
              <dt>The ask</dt>
              <dd>
                Replace a broad mechanism-based prohibition with rules aimed at specific harms and
                conduct.
              </dd>
            </div>
            <div>
              <dt>Option 01</dt>
              <dd>Permit disclosed, meaningfully human-directed AI-assisted work.</dd>
            </div>
            <div>
              <dt>Option 02</dt>
              <dd>
                Keep tighter limits in Artists Alley and the Dealers Den while leaving room elsewhere
                for software, accessibility tools, games, animation, storytelling, and experiments.
              </dd>
            </div>
            <div>
              <dt>Option 03</dt>
              <dd>
                Run a labeled one-year experimental track, gather evidence, and revisit the policy.
              </dd>
            </div>
            <div>
              <dt>My commitment</dt>
              <dd>
                Until Midwest FurFest&rsquo;s anti-AI policy is materially revised or eliminated, I
                will not volunteer for or attend the convention.
              </dd>
            </div>
            <div>
              <dt>The record</dt>
              <dd>
                I will append any formal board response or material policy change here with a date.
                Substantive edits will receive a new version rather than silently replacing the record.
              </dd>
            </div>
          </dl>
        </section>

        <article id="letter" className={`prose ${styles.essay}`}>
          <p>
            <span className={styles.dropCap}>M</span>y first Midwest FurFest was in 2003.
          </p>
          <p>
            I drove up with a Republican rabbit who insisted that I needed to experience the furry
            community for myself. He was right.
          </p>
          <p>
            Through MFF, I encountered people, ideas, identities, and ways of living I had never had
            access to before. Furry expanded my understanding of what a life could look like, and
            through the community it built, I eventually found the courage to change my own life
            completely.
          </p>
          <p>
            I transitioned. I moved to Chicago to be closer to my furry friends. I integrated my life
            with this community.
          </p>
          <p>And I did not simply attend it.</p>
          <p>
            I have written furry fiction for decades, including work from the early years of the Ursa
            awards. I helped contribute to the literary culture of this fandom while it was still
            defining what furry fiction could be. I have attended MFF for 23 years and volunteered for
            six.
          </p>
          <p>
            Furry has not simply been a hobby I visit once a year. It is one of the communities that
            made me who I am, and one I have spent much of my adult life contributing back to.
          </p>

          <h2>Why this matters to me</h2>

          <p>That is why the convention&rsquo;s stance toward AI has been so painful.</p>
          <p>
            Since the emergence of modern generative AI, I have increasingly found myself castigated,
            othered, and treated as lesser within the community because I use these tools in both my
            creative and technical life.
          </p>
          <p>For me, some of these tools are not novelties.</p>
          <p>
            I have low vision. AI vision systems have become transformative accessibility tools,
            allowing me to interrogate images and physical spaces in ways that were previously
            difficult or impossible.
          </p>
          <p>And I cannot draw.</p>
          <p>
            So when image generation became available, I became fascinated by it. For the first time, I
            could explore a visual imagination I had spent my life largely unable to express directly.
            I could experiment with character design, composition, environments, and storytelling in
            ways that had never been available to me.
          </p>
          <p>Increasingly, that has made me wonder whether there is still room for people like me here.</p>
          <p>I do not believe that should be the answer.</p>

          <h2>The narrow claim</h2>

          <p>
            But I want to be careful about the claim I am making, because the argument that gets
            shouted down in this fandom is not the one I am here to make.
          </p>
          <p>
            I am not claiming that generative AI is good for artists. I am not claiming that furry owes
            this technology a welcome, or that anyone has to like it. I am claiming something narrower:
            a community institution should be extremely careful about adopting a blanket cultural
            prohibition on a fast-moving creative technology when that prohibition risks excluding
            creative work made through AI-mediated accessibility workflows, alongside software,
            experimental practice, and work already being made by people inside this fandom.
          </p>

          <div className={styles.pullQuote}>
            The question is not whether AI is good. It is whether we are already certain enough about
            what AI can become to decide, today, which members of this community get to explore it
            tomorrow.
          </div>

          <p>
            You can be deeply skeptical of generative AI and still agree with that sentence. That is the
            entire reason I am writing it down.
          </p>

          <h2>Name the harm</h2>

          <p>
            Before I say anything else about possibility, let me say what I believe about harm, because
            I do not think the artists in this fandom are being irrational.
          </p>
          <p>
            These models were trained on enormous amounts of work, including furry work, without anyone
            asking. Style mimicry can be used to impersonate a specific artist who spent fifteen years
            developing that style. Sheer volume can bury careful work under an infinite supply of cheap
            approximations. Commissions are how a real number of people in this community pay rent, and
            the pressure on that is neither hypothetical nor far away. The fear that a tool trained on
            your labor will be used to underprice your labor is a reasonable fear, and it gets
            validated in public most weeks.
          </p>
          <p>I do not think any of that is settled, and my enthusiasm does not answer it.</p>
          <p>
            But protecting artists from those harms does not require the rule Midwest FurFest has
            adopted. Every harm in that paragraph has a name: undisclosed authorship, style
            impersonation, commercial substitution, contest eligibility, spam volume, provenance. A
            policy can name those and go after them directly &mdash; and it can be enforced against
            anyone who does them, with or without a model involved.
          </p>
          <p>Naming the tool instead catches all of that, and then keeps going.</p>
          <p>That is where I come in.</p>

          <Callout
            kicker="A different way forward"
            title="This does not have to be a binary choice."
            hint="Three policies that are neither ban nor free-for-all"
            side="right"
          >
            <p className={styles.lede}>
              These are examples, not demands. MFF does not need to adopt my preferred AI policy. I
              want us to recognize that the choice is not simply prohibition or anything-goes.
            </p>
            <div className={styles.cards}>
              {POLICY_OPTIONS.map((option) => (
                <article className={styles.card} key={option.tag}>
                  <div className={styles.tag}>{option.tag}</div>
                  <h3>{option.title}</h3>
                  <p>{option.body}</p>
                  <div className={styles.cardPunch}>{option.punch}</div>
                </article>
              ))}
            </div>
          </Callout>

          <h2>Regulate conduct, not the tool</h2>

          <p>
            Part of what makes a blanket rule so hard to write well is that &ldquo;AI&rdquo; is not one
            practice.
          </p>
          <p>
            The word covers a finished piece sold in place of a commission, a vision model describing a
            photograph out loud, code completion, image tagging, a character reference system, an
            animation pipeline, a local model running on somebody&rsquo;s own machine, procedural
            generation in a game, and a dozen things that do not have names yet. Those are not the same
            act. A few of them take a sale away from an artist. Most of them never touch one.
          </p>
          <p>
            This is why I keep coming back to my own eyes, and it is not a request for an exemption.
          </p>
          <p>
            For me a vision model sits closer to my white cane than to a print shop. It is the interface
            through which I get at an image at all. The identical technical mechanism is a substitute
            for an artist in one use and an adaptive device in another. A rule aimed at the mechanism
            cannot tell those two apart. A rule aimed at the conduct can.
          </p>
          <p>
            More importantly, an accessibility workflow does not stop being an accessibility workflow
            merely because it helps produce a finished creative work. A blanket rule can therefore catch
            the novel, image, game, or other artifact produced through that workflow even when the role
            of the model was to compensate for a disability rather than replace human authorship.
          </p>
          <p>
            There is also a question of scope. Rules about what can be sold at a table are marketplace
            rules, and MFF is entitled to write those tightly: an Artists Alley exists to protect and
            promote the people selling in it, and provenance, copyright exposure, and direct competition
            are real administrative problems. But the moment a policy governs which kinds of creative
            practice count as acceptable participation in the convention at all, it has stopped
            regulating a marketplace and started drawing a cultural boundary around who belongs here.
          </p>
          <p>Those are different powers. They deserve different amounts of caution.</p>

          <h2>What gets lost in a blanket ban</h2>

          <p>
            AI contains extraordinary possibilities for the furry community. These are tools for
            accessibility, play, experimentation, software, games, animation, storytelling, and forms
            of creativity we have barely begun to invent.
          </p>
          <p>
            I reject the idea that the future must be framed as Artists vs. AI. Artists are already
            using AI. So are disabled people, programmers, writers, musicians, animators, hobbyists,
            makers, and people who previously had no practical access to certain creative media.
          </p>
          <p>
            This is not a replacement for creativity. It is another creative medium entering the room.
          </p>

          <div className={styles.pullQuote}>It is chocolate sauce, not a new bowl of ice cream.</div>

          <p>
            And furry, of all communities, should understand that new tools do not erase old ones. We
            did not stop drawing because digital art arrived. We did not stop making costumes because
            3D printers appeared.
          </p>
          <p>We added more ways to create.</p>
          <p>That is what I want AI to become here.</p>

          <Callout
            kicker="I remember having this argument before"
            title="The tools changed. The artists stayed."
            hint="2011, the iPad, and the argument we are having again"
            side="left"
            link={{
              href: '/projects/arcade-blog/disposable-art-is-still-art',
              label: 'From the archives: Disposable Art Is Still Art',
            }}
          >
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
            <p className={styles.lede}>
              The same reflex is happening again, this time across the whole fandom at once. I
              don&rsquo;t think that should reassure anyone. I think it should worry us.
            </p>
          </Callout>

          <h2>The technology will not sit still</h2>

          <p>This technology is also moving absurdly fast.</p>
          <p>
            A rule written with 2023&rsquo;s image generators in mind will still be on the books when it
            governs 2028&rsquo;s accessibility software, animation pipelines, and whatever the next
            unnamed thing turns out to be. A policy built around a mechanism ages badly, and it has to
            be defended as a moral position long after the mechanism has changed underneath it. A policy
            built around behavior can be revised without reopening the entire argument every time.
          </p>
          <p>And this is not Silicon Valley knocking on furry&rsquo;s door.</p>
          <p>
            I have been making this argument in public, under my own name, on my own site, for years
            &mdash; including the case that an AI-mediated image can be a disposable, personal kind of
            expression rather than a replacement for a commission. There are furs already building with
            these tools for furry purposes: characters, stories, games, accessibility, software. The
            disagreement is already inside the house.
          </p>
          <p>
            An institution should be slow to settle an internal dispute by defining one side of it out
            of the community.
          </p>

          <hr />

          <h2>Why I am stepping away</h2>

          <p>
            Until Midwest FurFest&rsquo;s anti-AI policy is materially revised or eliminated, I will not
            be volunteering for or attending the convention.
          </p>
          <p>That is not a decision I make lightly, and I want to be precise about what it is.</p>
          <p>
            It is not an ultimatum. I am not offering to trade my labor for a policy change, and the
            board should not revise anything because one volunteer is unhappy. MFF will be fine without
            me.
          </p>
          <p>
            It is that volunteering is a form of endorsement. I cannot help administer a boundary that
            places work I believe is legitimate, accessible, human-directed creative expression on the
            wrong side of it. I would rather withdraw than take a shift while pretending the
            disagreement is a small one.
          </p>
          <p>
            After more than two decades as an attendee and member of this fandom, I finally feel that I
            have something uniquely valuable to contribute to its next chapter: decades of creative
            work, two decades of technical experience, and direct experience building with a technology
            that will shape much of what comes next.
          </p>
          <p>
            If the convention has decided that this kind of exploration is incompatible with the
            community it wants to build, then there is no meaningful place for me in that world.
          </p>
          <p>
            I have put my own history in this letter because it shows who a rule like this excludes. It
            is not the reason the rule is wrong. Take my name out of this letter and the argument should
            still stand on its own &mdash; and if it does not, then it is not worth revising a policy
            over me.
          </p>

          <hr />

          <h2>A risk, not a prediction</h2>

          <p>The attempt to drive AI art from the furry community has not made it disappear.</p>
          <p>Instead, it has begun driving some of its creators elsewhere.</p>

          <div className={styles.statAside}>
            <div className={styles.statKicker}>What the audience is doing</div>
            <div className={styles.statNumber}>4&times;</div>
            <p>
              the views my AI-assisted images get on DeviantArt compared to comparable work on Fur
              Affinity. Fur Affinity has prohibited AI-generated art outright since 2022, so the
              comparison is not entirely fair &mdash; but the gap in attention is real, and growing.
            </p>
          </div>

          <p>
            I am watching from the inside as something small begins to take shape: private Telegram
            channels, Discord servers, informal groups, and communities built around sharing work that
            has become unwelcome elsewhere.
          </p>
          <p>Nothing enormous yet.</p>
          <p>But this is no longer hypothetical.</p>
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
            I am already watching some of these spaces attract people whose values are far less aligned
            with the openness, creativity, consent, experimentation, and mutual care that furry
            communities have spent decades trying to build.
          </p>
          <p>
            When people who want to use these technologies responsibly are told that the technology
            itself makes them unwelcome, they do not necessarily stop using it.
          </p>
          <p>They find somewhere else to go.</p>
          <p>Today these communities are small.</p>
          <p>They may not remain that way.</p>
          <p>
            One day, someone with money may decide that instead of fighting for a place inside
            furry&rsquo;s existing institutions, it would be easier to build new institutions around the
            art those communities rejected.
          </p>
          <p>Maybe that never happens.</p>
          <p>I hope it doesn&rsquo;t.</p>
          <p>
            I am not predicting a schism. I am pointing at a plausible risk: exclusion can move people
            into parallel spaces, and parallel spaces can develop their own institutions, incentives,
            and norms. I do not think we should assume that exclusion makes the underlying community
            disappear.
          </p>
          <hr />

          <h2>Bring the machine into the room</h2>

          <p>
            So I would rather make an offer than an argument, and the reason why is a story about this
            city.
          </p>
          <p>
            New York City banned pinball in 1942. It was classified as gambling &mdash; a game of pure
            chance, a machine that took children&rsquo;s money &mdash; and the ban held for thirty-four
            years. Nobody at City Hall thought it was a close question. Machines were seized and broken
            up for the cameras.
          </p>
          <p>
            In 1976, the industry sent a writer named Roger Sharpe to testify before the New York City
            Council. He did not win by explaining that the council had misunderstood the technology. He
            won because somebody wheeled a machine into the room. He told the council there was skill in
            it &mdash; that if he pulled the plunger back just right, the ball would go down a
            particular lane &mdash; and then he did it. The council voted to lift the ban. By
            Sharpe&rsquo;s own account since, the shot was mostly luck.
          </p>
          <p>Chicago, which built the machines, kept its own ban until January 1977.</p>
          <p>
            The lesson I take from that is not that the skeptics were fools. Much of what was said about
            coin-operated machines in 1942 was true of coin-operated machines in 1942. The lesson is
            that the argument did not move while it stayed abstract, and it moved the moment there was
            an actual thing in the room to look at.
          </p>
          <p>
            So I am offering to bring the machine into the room. I will demonstrate my own software and
            my own work to the board &mdash; in person, on a projector, with hostile questions welcome,
            including from the artists in this fandom who have the most to lose if I turn out to be
            wrong.
          </p>
          <p>
            I believe code wins. A working thing, in the right room, can move a conversation that
            abstract argument cannot.
          </p>
        </article>

        <Callout
          kicker="The machine in the room"
          title="Look what happens when more people get to make things."
          hint="Open the exhibition — seven things I have actually built"
          side="stack"
          titleId="exhibition-heading"
          wide
        >
          <p className={styles.exhibitionLede}>
            This is the part where I pull the plunger back and call the lane. &ldquo;AI art&rdquo; is
            too small a box for what is already here. Six of the seven things below are finished and
            published; the last one now has a live review build, and I have labeled it plainly rather
            than dress it up. They are all mine, and all reachable from this page. I am not asking you
            to imagine a hypothetical creator. I am asking you to look and decide whether furry is richer
            for having room for this.
          </p>

          <figure className={styles.exhibit}>
            <figcaption className={styles.exhibitHead}>
              <p className={styles.tag}>Exhibit 01 &middot; Animation</p>
              <h3>The thing that wouldn&rsquo;t have existed</h3>
              <p className={styles.exhibitPunch}>
                There was never going to be an animator. There was going to be this, or nothing.
              </p>
            </figcaption>
            <div className={styles.videoFrame}>
              <iframe
                src="https://www.youtube-nocookie.com/embed/-BXyKkzsYWA"
                title="The first Jebediah animation: a chicken-fried possum lawyer from Toontown Chicago"
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
              />
            </div>
            <p className={styles.exhibitBody}>
              Jebediah O. Hickory, a chicken-fried possum lawyer from Toontown Chicago. It is janky, it
              barely moves, and I adore it. Before generative video, this joke lived entirely inside my
              skull: I am not an animator, I had no budget for a studio, and no one was ever going to
              be hired to make it. The distance between &ldquo;idea&rdquo; and &ldquo;artifact&rdquo;
              collapsed, and a thing that did not exist started existing.
            </p>
            <p className={styles.exhibitLink}>
              <Link href="/projects/the-singularity-log/death-of-the-creative-wall">
                Read: Death of the Creative Wall &rarr;
              </Link>
            </p>
          </figure>

          <figure className={styles.exhibit}>
            <figcaption className={styles.exhibitHead}>
              <p className={styles.tag}>Exhibit 02 &middot; Image work</p>
              <h3>An aesthetic thesis, not a prompt</h3>
              <p className={styles.exhibitPunch}>
                The uncanny valley as a place to live, rather than a place to escape.
              </p>
            </figcaption>
            <div className={styles.gallery}>
              <Image
                className={styles.galleryImage}
                src="https://puhixbchomgvn0ti.public.blob.vercel-storage.com/rossi-sodium-streetlight.jpg"
                alt="A smiling man poses beside a glasses-wearing feline woman in a green dress outside a crowded venue."
                width={1122}
                height={1402}
                sizes="(max-width: 700px) calc(100vw - 2.5rem), 370px"
              />
              <Image
                className={styles.galleryImage}
                src="https://puhixbchomgvn0ti.public.blob.vercel-storage.com/snow-leopard-self-portrait.jpg"
                alt="A white snow leopard woman with green hair and glasses holds a white cane in an elevator selfie."
                width={1086}
                height={1448}
                sizes="(max-width: 700px) calc(100vw - 2.5rem), 370px"
              />
            </div>
            <p className={styles.exhibitCaption}>
              <strong>Why Transformation?</strong>, 2026 &middot; Generative photography and character
              work &middot; Cartoon characters placed in real Chicago environments under real
              sodium-vapor light.
            </p>
            <p className={styles.exhibitBody}>
              These are not attempts at realism that missed. The in-between is the point. This is a
              body of work about transformation and identity made by a trans woman who cannot draw, and
              the visual argument it makes is one I could not have made in any other medium available
              to me.
            </p>
            <p className={styles.exhibitLink}>
              <Link href="/projects/ai-art-experiments/why-transformation">
                Read: Why Transformation? &rarr;
              </Link>
            </p>
          </figure>

          <figure className={styles.exhibit}>
            <figcaption className={styles.exhibitHead}>
              <p className={styles.tag}>Exhibit 03 &middot; Software</p>
              <h3>Character canon, as a system</h3>
              <p className={styles.exhibitPunch}>
                Not prompt &rarr; furry girl &rarr; Save As. Software about character authorship.
              </p>
            </figcaption>
            <p className={styles.exhibitBody}>
              ToonTok is a private-by-default character and image studio. It stores the distinction
              between a reference, a guide, an approved model sheet, and a generated image, so a new
              picture can be useful without silently becoming canon. Generation is separated from
              review and canonization, so the human decision stays visible. Chargeable operations carry
              an explicit, server-validated cost confirmation. It is built around a person defining who
              a character is and the model working inside those bounds &mdash; which is precisely the
              Human Authorship standard, implemented in code.
            </p>
            <p className={styles.exhibitLink}>
              <Link href="/lab/toontok">Read the ToonTok case study &rarr;</Link>
            </p>
          </figure>

          <figure className={styles.exhibit}>
            <figcaption className={styles.exhibitHead}>
              <p className={styles.tag}>Exhibit 04 &middot; Playable</p>
              <h3>A furry story you can play right now</h3>
              <p className={styles.exhibitPunch}>
                You have $75, a few hours, and one chance to plan the right date for Tess.
              </p>
            </figcaption>
            <Link className={styles.exhibitMediaLink} href="/toys/interspecies-dating-is-hard">
              <Image
                className={styles.exhibitImage}
                src="https://puhixbchomgvn0ti.public.blob.vercel-storage.com/toys/interspecies-dating-is-hard/locations/clampett-crossroads-2ba6YQyTWm7FcTX0uokK7fVKH1fSYB.png"
                alt="A lively Clampett crossroads with impossible streets and routes into the Toon city"
                width={840}
                height={560}
                sizes="(max-width: 700px) calc(100vw - 2.5rem), 750px"
              />
            </Link>
            <p className={styles.exhibitBody}>
              Branching interactive fiction with seven endings, written by me, illustrated with my own
              generated art, playable in a browser with a keyboard and a screen reader. This is the
              &ldquo;make me an adventure&rdquo; demo I would bring to a convention, except it is not a
              demo. It shipped. Four more are already playable beside it.
            </p>
            <p className={styles.exhibitLink}>
              <Link href="/toys/interspecies-dating-is-hard">Play it &rarr;</Link>{' '}
              <Link href="/toys">See all five toys &rarr;</Link>
            </p>
          </figure>

          <figure className={styles.exhibit}>
            <figcaption className={styles.exhibitHead}>
              <p className={styles.tag}>Exhibit 05 &middot; Accessibility</p>
              <h3>The novelist&rsquo;s exoskeleton</h3>
              <p className={styles.exhibitPunch}>
                I have written furry fiction for decades. Now I use AI to make the physically difficult
                part of it possible again.
              </p>
            </figcaption>
            <p className={styles.exhibitBody}>
              <em>Bait and Switch</em> (2010). <em>A Fuzzy Place</em> (2013). <em>The Painted Cat</em>{' '}
              (2015). Short fiction and poetry in <em>Anthro</em> from 2006. A story in a 2010 Ursa
              Major Award finalist anthology. None of that was AI-assisted, because none of it could
              have been.
            </p>
            <p className={styles.exhibitBody}>
              What AI assists now is the part my eyes make expensive: revision. Conventional revision
              workflows assume you can scan a page, hold a column of text in peripheral vision, and
              flick between two drafts. I built an editorial and publishing system around that
              constraint &mdash; drafting, structural revision, delivery, and the whole pipeline behind
              this website. I keep direction, taste, selection, voice, and final editorial judgment.
              The machine does the part that used to cost me a day of eyestrain.
            </p>
            <p className={styles.exhibitPunch}>
              The traditional furry creator and the AI creator are, in this case, the same person.
            </p>
            <p className={styles.exhibitLink}>
              <Link href="/lab/arcadeprofile">How the publishing system works &rarr;</Link>{' '}
              <Link href="/bibliography">The bibliography &rarr;</Link>
            </p>
          </figure>

          <figure className={styles.exhibit}>
            <figcaption className={styles.exhibitHead}>
              <p className={styles.tag}>Exhibit 06 &middot; Fiction</p>
              <h3>It Takes a Zoo</h3>
              <p className={styles.exhibitPunch}>
                AI didn&rsquo;t give me an idea for a novel. It helped me build the machinery that let
                me keep making one.
              </p>
            </figcaption>
            <Link className={styles.exhibitMediaLink} href={ZOO_COLLECTION_PATH}>
              <Image
                className={styles.coverImage}
                src={ZOO_HERO.url}
                alt={ZOO_HERO.alt}
                width={ZOO_HERO.width}
                height={ZOO_HERO.height}
                sizes="(max-width: 700px) 60vw, 300px"
              />
            </Link>
            <p className={styles.exhibitBody}>
              A {ZOO_FEATURED_COLLECTION.chapterCount}-chapter novel-in-stories about escaping the
              hypercapitalist grind, free to read on the web, available as per-chapter PDFs and as one
              complete edition. Prose, cover, layout, delivery. The output here is sustained narrative
              work, not a disposable prompt &mdash; and that is what the tooling was for.
            </p>
            <p className={styles.exhibitLink}>
              <Link href={ZOO_COLLECTION_PATH}>Read It Takes a Zoo &rarr;</Link>
            </p>
          </figure>

          <figure className={styles.exhibit}>
            <figcaption className={styles.exhibitHead}>
              <p className={styles.tag}>Exhibit 07 &middot; Review build</p>
              <h3>A recommender that only reads anthro</h3>
              <p className={styles.exhibitPunch}>
                Point it at the fandom&rsquo;s own shelf and ask it what to play next.
              </p>
            </figcaption>
            <a
              className={styles.exhibitMediaLink}
              href="https://wizwor.vercel.app/furry"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                className={styles.exhibitImage}
                src="https://image.thum.io/get/width/1400/crop/900/noanimate/https://wizwor.vercel.app/furry"
                alt="Screenshot preview of the furry WizWor HOWLNET recommender review build"
                width={1400}
                height={900}
                loading="lazy"
              />
            </a>
            <p className={styles.exhibitBody}>
              WizWor is an agent-guided game recommender I built to test a narrow question: where does
              model judgment actually help, and where should deterministic software stay in charge? It
              is live, it is open source, and the case study explains both halves.
            </p>
            <p className={styles.exhibitBody}>
              The furry-specific review build deals purely in anthropomorphic titles and is now live at{' '}
              <a href="https://wizwor.vercel.app/furry" target="_blank" rel="noopener noreferrer">
                wizwor.vercel.app/furry
              </a>
              . Furry games are scattered across itch, Steam, visual-novel sites, and two decades of
              forum posts, and nothing indexes them as a body of work. A recommender that takes the
              fandom&rsquo;s catalogue seriously is a straightforwardly useful thing to hand a con-goer
              &mdash; and it competes with no artist, sells no print, and takes no commission away from
              anyone.
            </p>
            <p className={styles.exhibitStatus}>
              Status: live review build. The interface and furry-specific recommendation behavior are
              ready to try; the catalogue can continue to grow from here.
            </p>
            <p className={styles.exhibitLink}>
              <Link href="/lab/wizwor">Read the WizWor case study &rarr;</Link>{' '}
              <a href="https://wizwor.vercel.app/furry" target="_blank" rel="noopener noreferrer">
                Try the furry review build &rarr;
              </a>{' '}
              <a href="https://wizwor.vercel.app" target="_blank" rel="noopener noreferrer">
                Try the original recommender &rarr;
              </a>
            </p>
          </figure>

          <p className={styles.exhibitionClose}>
            None of these is a print generated from a prompt and dropped onto an Artists Alley table.
          </p>
          <p className={styles.exhibitionCloseBody}>
            That distinction is the whole ask. Ban the print if you need to. But please don&rsquo;t
            accidentally ban the movie, the game, the accessibility tool, the character system, the
            novel, and the weird thing nobody has named yet.
          </p>
        </Callout>

        <article className={`prose ${styles.essay}`}>
          <hr />

          <h2>What I am asking</h2>

          <p>This is not an easy letter to write.</p>
          <p>
            Members of the staff and board of this convention are my neighbors, my friends, even my
            family. These are people I love, in a community I love.
          </p>
          <p>
            But I cannot stand by and ignore the risk of a fractured fandom: parallel communities
            growing apart from one another, developing different norms and different ethical cultures,
            until the distance between them becomes much harder to bridge.
          </p>
          <p>I do not know whether that fracture will happen, or what all of its consequences would be.</p>
          <p>That uncertainty is precisely why I believe we should be trying so hard to keep dialogue open now.</p>
          <p>
            Excluding responsible, community-minded creators will not make generative AI disappear. It
            may instead remove some of the people most interested in shaping how these technologies are
            used responsibly.
          </p>
          <p>
            If thoughtful people are pushed out of this conversation, the result will not necessarily be
            one unified fandom that rejected AI. It may instead be parallel communities developing
            around it, potentially with very different ethical cultures and very little dialogue between
            them.
          </p>
          <p>That fracture is not inevitable.</p>
          <p>
            For 23 years, Midwest FurFest has been one of the places where I watched this community
            grow, experiment, stumble, learn, and reinvent itself.
          </p>
          <p>I want it to remain that kind of place.</p>
          <p>
            But in those 23 years, I have never been more disappointed in the direction the convention
            has chosen.
          </p>
          <p>
            I am not asking the board to agree with me. I am asking it to look before it closes the
            door. If MFF examines this work &mdash; the software, the games, the accessibility tools,
            the fiction &mdash; and still concludes that none of it belongs here, then at least the
            decision will have been made with knowledge of what is being excluded, instead of about a
            category nobody in the room had actually examined.
          </p>
          <p>
            I am asking the board to reconsider this approach before it hardens into something much more
            difficult to undo.
          </p>
          <p>
            I would much rather spend the next twenty years helping this community figure out how to use
            these tools well than watching from somewhere else as we build separate futures.
          </p>

          <div className={styles.finalLine}>
            I hope you will leave a door open for me to come home.
          </div>
        </article>

        <section className={styles.recordBox} aria-labelledby="record-heading">
          <p className={styles.kicker}>Versioned public record</p>
          <h2 id="record-heading">How this document changes</h2>
          <p>
            This page is both an argument and a record of a public position. I will not silently rewrite
            material claims, requests, or consequences after publication.
          </p>
          <p>
            Corrections, added sources, board responses, and policy changes will be dated here. Small
            factual or typographic corrections increment the patch version; substantive additions
            increment the minor version; a change to the core thesis, ask, or stated commitment would
            increment the major version.
          </p>
          <p>
            If Midwest FurFest sends me a formal response, I will append it or accurately summarize it
            here, whatever the answer is.
          </p>
          <div className={styles.changelog}>
            <div className={styles.changeVersion}>v1.0.0</div>
            <div>
              <strong>September 17, 2026</strong>
              <p>
                First versioned public edition. Added the at-a-glance summary and explicit update policy;
                preserved the existing sourcing caveats and the seven-item exhibition as the evidentiary
                record available on publication day.
              </p>
            </div>
          </div>
        </section>

        <details className={styles.sourcesBox}>
          <summary className={styles.sourcesSummary}>
            <span className={styles.sourcesTitle}>Sources &amp; further reading</span>
            <span className={styles.sourcesSign} aria-hidden="true" />
          </summary>
          <div className={`prose ${styles.sourcesBody}`}>
            <p>
              This page separates personal recollection from externally verifiable claims. The
              2011&ndash;2012 iPad dispute is presented as eyewitness testimony; no surviving indexed
              rulebook or forum thread documenting it was found. Everything else below is sourced.
            </p>
            <p className={styles.sourceGroupLabel}>Current convention and platform AI policies</p>
            <ol>
              <li>
                <a href="https://indyfurcon.org/artists-alley-marketplace-policies/" target="_blank" rel="noopener noreferrer">
                  IndyFurCon, &ldquo;Artists Alley &amp; Marketplace Policies&rdquo;
                </a>{' '}
                (current) &mdash; the authorship requirement (&ldquo;Sales of anything other than items
                that feature the artwork of the artist&rsquo;s own creation is prohibited in AA&rdquo;)
                and its own current AI prohibition (&ldquo;AI is strictly prohibited!&rdquo;).
              </li>
              <li>
                <a href="https://www.citruscon.com/artist-alley-applications" target="_blank" rel="noopener noreferrer">
                  Citrus Con, Artist Alley Applications
                </a>{' '}
                &mdash; AI-generated art prohibited outright, defined in part by example (&ldquo;putting a
                phrase in DALL-E and getting prints made directly&rdquo;).
              </li>
              <li>
                <a href="https://nordicfuzzcon.org/policies/rules-of-conduct" target="_blank" rel="noopener noreferrer">
                  NordicFuzzCon, Rules of Conduct
                </a>{' '}
                &mdash; generative AI art, video, and other visual media prohibited in the Dealers&rsquo;
                Den and Artists&rsquo; Alley.
              </li>
              <li>
                <a href="https://www.furaffinity.net/journal/10626395/" target="_blank" rel="noopener noreferrer">
                  Fur Affinity, AI and blockchain content policy
                </a>{' '}
                (December 2022) &mdash; Fur Affinity&rsquo;s own platform-wide AI ban notice.
              </li>
            </ol>
            <p className={styles.sourceGroupLabel}>The 1976 pinball hearing</p>
            <ol>
              <li>
                <a href="https://en.wikipedia.org/wiki/Roger_Sharpe_(pinball)" target="_blank" rel="noopener noreferrer">
                  Roger Sharpe (pinball)
                </a>{' '}
                (Wikipedia) &mdash; Sharpe, then writing for <em>GQ</em>, was recruited by the
                industry&rsquo;s operators association to testify before the New York City Council in
                1976; the council voted unanimously to lift the ban after his demonstration.
              </li>
              <li>
                <a href="https://gizmodo.com/how-one-perfect-shot-saved-pinball-from-being-illegal-1154267979" target="_blank" rel="noopener noreferrer">
                  &ldquo;How One Perfect Shot Saved Pinball From Being Illegal&rdquo;
                </a>{' '}
                (Gizmodo) &mdash; the called shot, and Sharpe&rsquo;s own later characterization of it
                as largely luck. The specific machine is not reliably documented, so this page does not
                name one.
              </li>
              <li>
                <a href="https://chicagoreader.com/blogs/chicago-once-waged-a-40-year-war-on-pinball/" target="_blank" rel="noopener noreferrer">
                  &ldquo;Chicago once waged a 40-year war on pinball&rdquo;
                </a>{' '}
                (<em>Chicago Reader</em>) &mdash; Chicago as the manufacturing capital of pinball
                (Bally, Williams, Stern) and its own ban, which stood until January 1977. Chicago was
                already reconsidering in early 1976; no causal link to the New York ruling is claimed
                here.
              </li>
            </ol>
            <p className={styles.sourceGroupLabel}>Furry&rsquo;s digital-art transition</p>
            <ol>
              <li>
                <a href="https://blog.somnolescent.net/2020/11/yerf-yerf-yerf/" target="_blank" rel="noopener noreferrer">
                  &ldquo;Yerf, yerf, yerf,&rdquo; Letters From Somnolescent
                </a>{' '}
                (2020) &mdash; early furry artists commonly worked in traditional media and scanned the
                results in, back when digital art packages were far more limited.
              </li>
              <li>
                <a
                  href="https://amt-lab.org/blog/2026/1/blockchains-or-pawprints-furries-as-a-case-study-for-understanding-digital-art-provenance-through-nfts-and-community-governance"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  &ldquo;Blockchains or Pawprints?&rdquo;, Arts Management and Technology Lab, Carnegie
                  Mellon University
                </a>{' '}
                (2026) &mdash; furry as a highly participatory creative culture, with digital furry
                artists sustaining real income across Fur Affinity, DeviantArt, Bluesky, and other
                platforms.
              </li>
            </ol>
            <p className={styles.sourceGroupLabel}>The 2011&ndash;2012 convention scene, for context</p>
            <ol>
              <li>
                <a href="https://en.wikifur.com/wiki/Furry_Connection_North_2011" target="_blank" rel="noopener noreferrer">
                  Furry Connection North 2011
                </a>{' '}
                (WikiFur) &mdash; April 8&ndash;10, 2011, Sheraton Detroit Novi.
              </li>
              <li>
                <a href="https://en.wikifur.com/wiki/Furry_Connection_North_2012" target="_blank" rel="noopener noreferrer">
                  Furry Connection North 2012
                </a>{' '}
                (WikiFur) &mdash; April 13&ndash;15, 2012, Sheraton Detroit Novi.
              </li>
              <li>
                <a href="https://animecons.com/events/info/9118/indyfurcon-2011" target="_blank" rel="noopener noreferrer">
                  IndyFurCon 2011
                </a>{' '}
                (AnimeCons.com) &mdash; August 12&ndash;14, 2011.
              </li>
              <li>
                <a href="http://en.wikifur.com/wiki/IndyFurCon_2012" target="_blank" rel="noopener noreferrer">
                  IndyFurCon 2012
                </a>{' '}
                (WikiFur) &mdash; 482 attendees, 110 fursuiters in the Saturday parade. Event context
                only; the iPad dispute itself remains personal recollection.
              </li>
            </ol>
            <p className={styles.sourceGroupLabel}>Where AI-art communities are already organizing</p>
            <ol>
              <li>
                <a href="https://www.deviantart.com/dreamup" target="_blank" rel="noopener noreferrer">
                  DeviantArt DreamUp
                </a>{' '}
                &mdash; an example of AI-art infrastructure developing within an established art
                community.
              </li>
              <li>
                <a
                  href="https://discord.com/servers/nightcafe-lounge-943306099019370566"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  NightCafe Lounge on Discord
                </a>{' '}
                &mdash; a large community organized around AI image creation.
              </li>
              <li>
                <a href="https://nicegram.app/hub/group/FurryAICanvas" target="_blank" rel="noopener noreferrer">
                  Furry AI Canvas
                </a>{' '}
                &mdash; a small Telegram community specifically organized around AI-generated
                anthropomorphic art.
              </li>
            </ol>
            <p className={styles.sourceGroupLabel}>The exhibits above</p>
            <ol>
              <li>
                Exhibit 01 &mdash;{' '}
                <Link href="/projects/the-singularity-log/death-of-the-creative-wall">
                  Death of the Creative Wall
                </Link>
                , and the first Jebediah short on YouTube.
              </li>
              <li>
                Exhibit 02 &mdash;{' '}
                <Link href="/projects/ai-art-experiments/why-transformation">Why Transformation?</Link>
              </li>
              <li>
                Exhibit 03 &mdash; <Link href="/lab/toontok">ToonTok case study</Link>. The public site
                is invite-access; generation consumes paid model credits behind explicit confirmation.
              </li>
              <li>
                Exhibit 04 &mdash;{' '}
                <Link href="/toys/interspecies-dating-is-hard">Interspecies Dating is Hard</Link> and
                the rest of <Link href="/toys">the toys</Link>.
              </li>
              <li>
                Exhibit 05 &mdash; <Link href="/bibliography">bibliography</Link> and the{' '}
                <Link href="/lab/arcadeprofile">ArcadeProfile case study</Link>.
              </li>
              <li>
                Exhibit 06 &mdash; <Link href={ZOO_COLLECTION_PATH}>It Takes a Zoo</Link>.
              </li>
              <li>
                Exhibit 07 &mdash; <Link href="/lab/wizwor">WizWor case study</Link>, the original live
                recommender, and the{' '}
                <a href="https://wizwor.vercel.app/furry" target="_blank" rel="noopener noreferrer">
                  furry-specific review build
                </a>
                .
              </li>
            </ol>
          </div>
        </details>

        <p className={styles.feedbackNote}>
          Have thoughts on this, or something I got wrong?{' '}
          <a href="mailto:austen.crowder@gmail.com">Email me</a>.
        </p>
      </main>
    </div>
  );
}
