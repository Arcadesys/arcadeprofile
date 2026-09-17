import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { SITE_NAME } from '@/lib/site-brand';
import { ZOO_HERO, ZOO_COLLECTION_PATH, ZOO_FEATURED_COLLECTION } from '@/lib/zoo-collection-meta';

import { Callout } from './Callout';
import styles from './mff.module.css';

const TITLE = 'Leave the Door Open';
const DESCRIPTION = 'On Midwest FurFest, generative AI, and the community I still want to call home.';
const CANONICAL_PATH = '/mff';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: CANONICAL_PATH },
  robots: { index: false, follow: true },
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
        </div>
      </section>

      <main className={styles.magazine}>
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
          <p>Apparently, that also makes me a pariah.</p>
          <p>I do not believe it should.</p>

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

          <p>
            I would be happy to give the board an interactive demonstration of some of my own software
            and show, rather than merely tell, what I believe these technologies can make possible for
            furry creators.
          </p>
          <p>
            I believe code wins. A solid demonstration, in the right room, can sometimes change a
            conversation that abstract arguments cannot.
          </p>

          <hr />

          <p>
            Until Midwest FurFest&rsquo;s anti-AI policy is materially revised or eliminated, I will not
            be volunteering for or attending the convention.
          </p>
          <p>That is not a decision I make lightly.</p>
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

          <hr />

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
            But I do not think we should assume that exclusion makes the underlying community
            disappear.
          </p>
        </article>

        <section className={styles.exhibition} aria-labelledby="exhibition-heading">
          <p className={styles.kicker}>Don&rsquo;t imagine it. Try it.</p>
          <h2 id="exhibition-heading" className={styles.exhibitionTitle}>
            Look what happens when more people get to make things.
          </h2>
          <p className={styles.exhibitionLede}>
            &ldquo;AI art&rdquo; is too small a box for what is already here. Everything below exists.
            It is all published, all mine, and all reachable from this page. I am not asking you to
            imagine a hypothetical creator. I am asking you to look at six things and decide whether
            furry is richer for having room for them.
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

          <p className={styles.exhibitionClose}>
            None of these is a print generated from a prompt and dropped onto an Artists Alley table.
          </p>
          <p className={styles.exhibitionCloseBody}>
            That distinction is the whole ask. Ban the print if you need to. But please don&rsquo;t
            accidentally ban the movie, the game, the accessibility tool, the character system, the
            novel, and the weird thing nobody has named yet.
          </p>
        </section>

        <article className={`prose ${styles.essay}`}>
          <hr />

          <p>This is not an easy letter to write.</p>
          <p>
            Members of the staff and board of this convention are my neighbors, my friends, even my
            family. These are people I love, in a community I love.
          </p>
          <p>
            But I cannot stand by and watch us open the door to a fractured fandom: parallel communities
            growing apart from one another, developing different norms and different ethical cultures,
            until the distance between them becomes much harder to bridge.
          </p>
          <p>I do not know what all the consequences of that fracture would be.</p>
          <p>That is precisely why I believe we should be trying so hard to prevent it now.</p>
          <p>
            Excluding responsible, community-minded creators will not make generative AI disappear. It
            will simply remove many of the people most interested in shaping how these technologies are
            used responsibly.
          </p>
          <p>The vacuum will still be filled.</p>
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
                <a href="https://www.flayrah.com/8747/fur-affinity-bans-artworks-generated-artificial-intelligence-programs" target="_blank" rel="noopener noreferrer">
                  Flayrah, &ldquo;Fur Affinity bans artworks generated by artificial intelligence programs&rdquo;
                </a>{' '}
                (September 2022) &mdash; Fur Affinity&rsquo;s platform-wide AI ban, folded into its existing
                &ldquo;lacks artistic merit&rdquo; content policy.
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
            </ol>
          </div>
        </details>
      </main>
    </div>
  );
}
