import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Resume',
  description: 'Professional resume of Austen Tucker — full-stack developer, scrum master, novelist, and accessibility advocate.',
  openGraph: {
    title: 'Resume — Austen Tucker',
    description: 'Professional resume of Austen Tucker — full-stack developer, scrum master, and accessibility advocate.',
    url: 'https://thearcades.me/resume',
  },
};

export default function ResumePage() {
  return (
    <div style={{ maxWidth: "740px", margin: "0 auto", padding: "2rem 1rem" }}>

      {/* Header */}
      <section style={{ marginBottom: "2.5rem", marginTop: "2rem", textAlign: "center" }}>
        <h1 className="gaysparkles" style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
          Austen Tucker
        </h1>
        <p style={{ color: "var(--fg-muted)", fontSize: "1.1rem", margin: "0 0 1rem" }}>
          Full-Stack Developer &middot; Scrum Master &middot; Author
        </p>
        <p style={{ color: "var(--fg-muted)", fontSize: "0.95rem", margin: 0 }}>
          Chicago, IL
        </p>
      </section>

      {/* Summary */}
      <section style={{ marginBottom: "2.5rem" }}>
        <h2 style={{ fontSize: "1.3rem", marginBottom: "1rem", color: "var(--accent)", borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem" }}>
          Summary
        </h2>
        <p style={{ lineHeight: 1.8, margin: 0 }}>
          {/* Resume content goes here — Austen will provide */}
          Full-stack developer and certified scrum master with deep experience building accessible, user-centered software. Published novelist with twelve books written. Builds AI-assisted editorial pipelines and developer tools designed for neurodivergent and visually impaired users.
        </p>
      </section>

      {/* Experience */}
      <section style={{ marginBottom: "2.5rem" }}>
        <h2 style={{ fontSize: "1.3rem", marginBottom: "1rem", color: "var(--accent)", borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem" }}>
          Experience
        </h2>

        <div style={{
          padding: "1.25rem",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          marginBottom: "1rem",
        }}>
          <p style={{ margin: "0 0 0.25rem", fontStyle: "italic", color: "var(--fg-muted)", fontSize: "0.9rem" }}>
            Resume content pending &mdash; Austen is locating their resume.
          </p>
          <p style={{ margin: 0, color: "var(--fg-muted)", fontSize: "0.85rem" }}>
            This section will be populated with professional experience.
          </p>
        </div>
      </section>

      {/* Skills */}
      <section style={{ marginBottom: "2.5rem" }}>
        <h2 style={{ fontSize: "1.3rem", marginBottom: "1rem", color: "var(--accent)", borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem" }}>
          Skills
        </h2>

        <div style={{
          padding: "1.25rem",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
        }}>
          <p style={{ margin: "0 0 0.25rem", fontStyle: "italic", color: "var(--fg-muted)", fontSize: "0.9rem" }}>
            Resume content pending &mdash; Austen is locating their resume.
          </p>
          <p style={{ margin: 0, color: "var(--fg-muted)", fontSize: "0.85rem" }}>
            This section will be populated with technical and professional skills.
          </p>
        </div>
      </section>

      {/* Education */}
      <section style={{ marginBottom: "2.5rem" }}>
        <h2 style={{ fontSize: "1.3rem", marginBottom: "1rem", color: "var(--accent)", borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem" }}>
          Education
        </h2>

        <div style={{
          padding: "1.25rem",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
        }}>
          <p style={{ margin: "0 0 0.25rem", fontStyle: "italic", color: "var(--fg-muted)", fontSize: "0.9rem" }}>
            Resume content pending &mdash; Austen is locating their resume.
          </p>
          <p style={{ margin: 0, color: "var(--fg-muted)", fontSize: "0.85rem" }}>
            This section will be populated with education history.
          </p>
        </div>
      </section>

      {/* Publications */}
      <section style={{ marginBottom: "2.5rem" }}>
        <h2 style={{ fontSize: "1.3rem", marginBottom: "1rem", color: "var(--accent)", borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem" }}>
          Publications
        </h2>

        <div style={{
          padding: "1.25rem",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
        }}>
          <p style={{ margin: "0 0 0.25rem", fontStyle: "italic", color: "var(--fg-muted)", fontSize: "0.9rem" }}>
            Resume content pending &mdash; Austen is locating their resume.
          </p>
          <p style={{ margin: 0, color: "var(--fg-muted)", fontSize: "0.85rem" }}>
            This section will list published novels and other works.
          </p>
        </div>
      </section>

    </div>
  );
}
