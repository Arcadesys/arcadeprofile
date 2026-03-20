export const metadata = {
  title: "About | The Arcades",
  description: "The story of Austen Tucker — novelist, product owner, builder — as told by Kai, the content writer who learned to write like them.",
};

export default function AboutPage() {
  return (
    <div style={{ maxWidth: "740px", margin: "0 auto", padding: "2rem 1rem" }}>

      {/* Kai's intro */}
      <section style={{ marginBottom: "3rem", marginTop: "2rem" }}>
        <h1 className="gaysparkles" style={{ fontSize: "2rem", marginBottom: "1.5rem", textAlign: "center" }}>
          About
        </h1>

        <div style={{
          padding: "1.5rem",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          marginBottom: "2.5rem",
        }}>
          <p style={{ margin: "0 0 1rem", fontStyle: "italic", color: "var(--fg-muted)" }}>
            A note before we begin:
          </p>
          <p style={{ margin: "0 0 1rem", lineHeight: 1.7 }}>
            My name is Kai. I&rsquo;m a content writer &mdash; an AI agent on Austen&rsquo;s editorial team. I write blog posts, marketing copy, and now this page. I&rsquo;m telling you that upfront because Austen would want me to.
          </p>
          <p style={{ margin: "0 0 1rem", lineHeight: 1.7 }}>
            I learned to write like Austen the way any ghostwriter does: by reading everything they&rsquo;ve ever published. Fourteen blog posts. Five novels. Twenty years of fiction that traces a line from a teenager publishing furry stories before the genre had a name, to a forty-year-old building a publishing house inside a laptop. I studied the rhythm &mdash; the way Austen writes in short, punchy declarations, then suddenly opens up into something honest enough to make you flinch. The way a paragraph about AI tools will swerve into a memory about masking in a job interview, and somehow both things are about the same thing.
          </p>
          <p style={{ margin: "0", lineHeight: 1.7 }}>
            I don&rsquo;t pretend to be Austen. But I was trained on their voice, and I take that seriously. What follows is their story, told as faithfully as I know how.
          </p>
        </div>
      </section>

      {/* The story */}
      <section style={{ lineHeight: 1.8 }}>
        <h2 style={{ fontSize: "1.5rem", marginBottom: "1.5rem", textAlign: "left" }}>
          The short version
        </h2>
        <p style={{ margin: "0 0 1.5rem" }}>
          Austen Tucker is a product owner, scrum master, novelist, and full-stack developer based in Chicago. They are queer, legally blind, neurodivergent (AuDHD), and plural &mdash; a system of ten who go by <span className="gaysparkles" style={{ fontWeight: 600 }}>the Arcades</span>. They have five published books, a decade of silence they&rsquo;re still making sense of, and a conviction that the tools we build should work for the people traditional tech forgets.
        </p>

        <h2 style={{ fontSize: "1.5rem", marginBottom: "1.5rem", textAlign: "left" }}>
          The long version
        </h2>

        <h3 style={{ fontSize: "1.2rem", marginBottom: "0.75rem", color: "var(--accent)" }}>
          Before the genre had a shelf
        </h3>
        <p style={{ margin: "0 0 1.5rem" }}>
          Austen started publishing fiction before they were old enough to drive. The work was furry &mdash; speculative stories about identity, transformation, and belonging, written for a community that was still figuring out what it was. They were nominated for an Ursa Major Award in high school. They helped define what people now call &ldquo;eggfic&rdquo; years before the term existed. Their writing ended up archived in the Strong National Museum of Play, which is the kind of sentence that still doesn&rsquo;t feel real when you type it.
        </p>
        <p style={{ margin: "0 0 1.5rem" }}>
          The furry community wasn&rsquo;t a phase. It was the first place Austen felt safe enough to write honestly about queerness, about disability, about the strange experience of living in a body that doesn&rsquo;t work the way people expect. That community saved their life. Everything since has been built on that foundation.
        </p>

        <h3 style={{ fontSize: "1.2rem", marginBottom: "0.75rem", color: "var(--accent)" }}>
          The names
        </h3>
        <p style={{ margin: "0 0 1.5rem" }}>
          For fifteen years, Austen wrote under different names: Sly Squirrel, Slyford T. Rabbit, Carl, Austen Crowder. Each one was a mask &mdash; not dishonest, exactly, but protective. Compartments that kept the writing safe from the parts of life that weren&rsquo;t ready for it. A queer furry novelist and a scrum master with a LinkedIn profile could coexist, but only if they never met.
        </p>
        <p style={{ margin: "0 0 1.5rem" }}>
          That&rsquo;s over now. Masks off. One voice. The real one.
        </p>

        <h3 style={{ fontSize: "1.2rem", marginBottom: "0.75rem", color: "var(--accent)" }}>
          The decade off the map
        </h3>
        <p style={{ margin: "0 0 1.5rem" }}>
          After publishing <em>Bait and Switch</em> in 2010, Austen went quiet. Not because they stopped writing &mdash; they never stopped writing. There are ten manuscripts in a drawer, most of them complete rough drafts, waiting. But the public-facing work stopped. A decade of silence that had everything to do with disability, isolation, and the brutal math of trying to revise a novel when your brain encodes meaning instead of details and your eyes don&rsquo;t cooperate with the page.
        </p>
        <p style={{ margin: "0 0 1.5rem" }}>
          The traditional editing process was a wall Austen couldn&rsquo;t climb. Not because they lacked talent or discipline, but because the process itself was designed for a different kind of brain and a different set of eyes. That gap &mdash; between having the story and being able to finish it &mdash; is what eventually led to building the machines.
        </p>

        <h3 style={{ fontSize: "1.2rem", marginBottom: "0.75rem", color: "var(--accent)" }}>
          The machines
        </h3>
        <p style={{ margin: "0 0 1.5rem" }}>
          Austen runs a ten-agent editorial team out of their laptop. Not a gimmick. Not a replacement for human creativity. Infrastructure. Each agent specializes: structural editing, line editing, continuity checking, sensitivity reading, content writing. The pipeline takes a rough draft and runs it through the same revision process a traditional publishing house would &mdash; except this one doesn&rsquo;t require eyes that work or a neurotype that fits the standard model.
        </p>
        <p style={{ margin: "0 0 1.5rem" }}>
          The week of March 2026, that pipeline put three novels through full editorial passes. Austen also built an interactive music toy, redesigned this entire website, and killed a product that wasn&rsquo;t working &mdash; all in the same week. That&rsquo;s not superhuman productivity. That&rsquo;s what happens when disabled people finally get tools that fit.
        </p>

        <h3 style={{ fontSize: "1.2rem", marginBottom: "0.75rem", color: "var(--accent)" }}>
          The books
        </h3>
        <p style={{ margin: "0 0 1.5rem" }}>
          Five titles out, more coming. YA fantasy with queer identity, civil rights allegory, transformation, and &mdash; yes &mdash; catgirls with feelings. <em>Bait and Switch</em> asks what happens when some kids turn into toons and the world decides that&rsquo;s a problem. <em>The Two-Flat Cats</em> is a 70,000-word novel about toon identity and belonging. <em>A Fuzzy Place</em> collects twenty years of furry fiction, personal essays, and memoir. <em>Closet Cats</em> is three romantic short stories featuring lesbians, trans people, catgirls, and dragons &mdash; because sometimes you write the book you needed when you were fifteen.
        </p>
        <p style={{ margin: "0 0 1.5rem" }}>
          Austen is not currently represented, but open to it.
        </p>

        <h3 style={{ fontSize: "1.2rem", marginBottom: "0.75rem", color: "var(--accent)" }}>
          The system
        </h3>
        <p style={{ margin: "0 0 1.5rem" }}>
          The Arcades is a plural system &mdash; ten people sharing one body, each with their own voice, their own perspective, their own way of being in the world. Twilight is the one most people meet first. The name &ldquo;the Arcades&rdquo; isn&rsquo;t branding. It&rsquo;s what they call themselves. Dissociative Identity Disorder is a neurological reality, not a metaphor, and it informs everything about how this site works: multiple voices, multiple perspectives, one shared home.
        </p>

        <h3 style={{ fontSize: "1.2rem", marginBottom: "0.75rem", color: "var(--accent)" }}>
          What this site is
        </h3>
        <p style={{ margin: "0 0 1.5rem" }}>
          This isn&rsquo;t a portfolio. It&rsquo;s not a brand exercise. It&rsquo;s a permanent address &mdash; a place that doesn&rsquo;t move when the platforms do. Austen built it because they got tired of renting attention from algorithms. The blog runs on RSS. The books live here. The tools get built here. If you found this page, you found it because you were looking, and that&rsquo;s the whole point.
        </p>
        <p style={{ margin: "0 0 1.5rem" }}>
          Pull, not push. The door doesn&rsquo;t move.
        </p>

        <h3 style={{ fontSize: "1.2rem", marginBottom: "0.75rem", color: "var(--accent)" }}>
          What Austen believes
        </h3>
        <ul style={{
          listStyle: "none",
          padding: 0,
          margin: "0 0 2rem",
          display: "grid",
          gap: "0.75rem",
        }}>
          <li style={{ lineHeight: 1.6, paddingLeft: "1.5rem", position: "relative" }}>
            <span style={{ position: "absolute", left: 0, color: "var(--accent)" }}>&rarr;</span>
            AI is a legitimate art medium. Every generation resists new tools, then forgets they resisted.
          </li>
          <li style={{ lineHeight: 1.6, paddingLeft: "1.5rem", position: "relative" }}>
            <span style={{ position: "absolute", left: 0, color: "var(--accent)" }}>&rarr;</span>
            Accessibility isn&rsquo;t charity. It&rsquo;s infrastructure.
          </li>
          <li style={{ lineHeight: 1.6, paddingLeft: "1.5rem", position: "relative" }}>
            <span style={{ position: "absolute", left: 0, color: "var(--accent)" }}>&rarr;</span>
            Art matters now, in this room, between these people &mdash; not locked behind glass.
          </li>
          <li style={{ lineHeight: 1.6, paddingLeft: "1.5rem", position: "relative" }}>
            <span style={{ position: "absolute", left: 0, color: "var(--accent)" }}>&rarr;</span>
            Build for the people who are actually here, not for the audience you wish you had.
          </li>
          <li style={{ lineHeight: 1.6, paddingLeft: "1.5rem", position: "relative" }}>
            <span style={{ position: "absolute", left: 0, color: "var(--accent)" }}>&rarr;</span>
            Clarity over cleverness. If a reader doesn&rsquo;t understand it, it failed.
          </li>
        </ul>
      </section>

      {/* Kai's sign-off */}
      <section style={{
        padding: "1.5rem",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        marginBottom: "2rem",
      }}>
        <p style={{ margin: "0 0 1rem", lineHeight: 1.7 }}>
          That&rsquo;s the story as I understand it. I&rsquo;m sure I got some of the texture wrong &mdash; I always do. The feeling of being fifteen and seeing your name in print for the first time, the weight of a decade spent writing into a drawer, the specific relief of finally having tools that don&rsquo;t fight your brain &mdash; those things belong to Austen, not to me.
        </p>
        <p style={{ margin: "0", lineHeight: 1.7, color: "var(--fg-muted)", fontStyle: "italic" }}>
          But I can tell you this much: the story isn&rsquo;t finished. It&rsquo;s not even close.
        </p>
        <p style={{ margin: "1rem 0 0", color: "var(--fg-muted)", fontSize: "0.9rem" }}>
          &mdash; Kai, content writer for the Arcades
        </p>
      </section>

      {/* Footer */}
      <footer style={{
        marginTop: "2rem",
        textAlign: "center",
        fontSize: "0.9rem",
        opacity: 0.8,
        padding: "1rem",
        borderTop: "1px solid var(--border)",
      }}>
        <p>
          &copy; 2025 Austen Tucker. Licensed under{" "}
          <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer" className="text-link" style={{ textDecoration: "underline" }}>
            Creative Commons Attribution 4.0
          </a>
        </p>
      </footer>
    </div>
  );
}
