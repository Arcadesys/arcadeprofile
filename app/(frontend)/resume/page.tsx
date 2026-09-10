import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Resume',
  description: 'Professional resume of Austen Tucker-Crowder — builder, AI enablement leader, program manager, and accessibility-first facilitator.',
  alternates: { canonical: '/resume' },
  openGraph: {
    type: 'profile',
    title: 'Resume — Austen Tucker-Crowder',
    description: 'Builder, AI enablement leader, program manager, and accessibility-first facilitator with 16+ years delivering customer-focused software.',
    url: '/resume',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Resume — Austen Tucker-Crowder',
    description: 'Builder, AI enablement leader, program manager, and accessibility-first facilitator with 16+ years delivering customer-focused software.',
  },
};

const sectionHeadingStyle = {
  fontSize: "1.3rem",
  marginBottom: "1rem",
  color: "var(--accent)",
  borderBottom: "1px solid var(--border)",
  paddingBottom: "0.5rem",
} as const;

const cardStyle = {
  padding: "1.25rem",
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "12px",
  marginBottom: "1rem",
} as const;

function JobCard({
  company,
  location,
  title,
  dates,
  bullets,
}: {
  company: string;
  location: string;
  title: string;
  dates: string;
  bullets: string[];
}) {
  return (
    <div style={cardStyle}>
      <h3 style={{ margin: "0 0 0.25rem", fontSize: "1.1rem" }}>{company}</h3>
      <p style={{ margin: "0 0 0.15rem", fontWeight: 600, fontSize: "0.95rem" }}>{title}</p>
      <p style={{ margin: "0 0 0.75rem", color: "var(--fg-muted)", fontSize: "0.85rem" }}>
        {location} &middot; {dates}
      </p>
      <ul style={{ margin: 0, paddingLeft: "1.25rem", lineHeight: 1.7 }}>
        {bullets.map((b, i) => (
          <li key={i} style={{ marginBottom: "0.35rem", fontSize: "0.95rem" }}>{b}</li>
        ))}
      </ul>
    </div>
  );
}

function SkillCategory({ label, skills }: { label: string; skills: string }) {
  return (
    <p style={{ margin: "0 0 0.5rem", fontSize: "0.95rem", lineHeight: 1.7 }}>
      <strong>{label}:</strong> {skills}
    </p>
  );
}

export default function ResumePage() {
  return (
    <div style={{ maxWidth: "740px", margin: "0 auto", padding: "clamp(1rem, 4vw, 2rem) 1rem" }}>

      {/* Header */}
      <section style={{ marginBottom: "2.5rem", marginTop: "1.5rem", textAlign: "center" }}>
        <h1 className="gaysparkles" style={{ fontSize: "clamp(1.5rem, 5vw, 2rem)", marginBottom: "0.5rem" }}>
          Austen Tucker-Crowder
        </h1>
        <p style={{ color: "var(--fg-muted)", fontSize: "1.1rem", margin: "0 0 0.5rem" }}>
          AI Enablement and Transformation &middot; Program Manager &middot; Agile Coach
        </p>
        <p style={{ color: "var(--fg-muted)", fontSize: "0.95rem", margin: "0 0 0.5rem" }}>
          Chicago, IL
        </p>
        <p style={{ fontSize: "0.9rem", margin: 0 }}>
          <a href="mailto:austen.crowder@gmail.com">austen.crowder@gmail.com</a>
          {" "}&middot;{" "}
          <a href="https://www.thearcades.me">www.thearcades.me</a>
          {" "}&middot;{" "}
          <a href="https://github.com/Arcadesys">github.com/Arcadesys</a>
        </p>
      </section>

      {/* Summary */}
      <section style={{ marginBottom: "2.5rem" }}>
        <h2 style={sectionHeadingStyle}>Summary</h2>
        <p style={{ lineHeight: 1.8, margin: 0 }}>
          Builder, AI enablement leader, program manager, and agile coach with 16+ years delivering
          customer-focused software. I build the operating systems, learning experiences, and
          decision-making practices that help teams adopt AI in their everyday work. An
          accessibility-first facilitator, I turn complex transformation work into usable tools,
          shared goals, and concrete next steps.
        </p>
      </section>

      {/* Key Accomplishments */}
      <section style={{ marginBottom: "2.5rem" }}>
        <h2 style={sectionHeadingStyle}>Key Accomplishments</h2>
        <ul style={{ margin: 0, paddingLeft: "1.25rem", lineHeight: 1.8 }}>
          <li>Helped raise agentic-coding adoption from roughly 2% to 43% of merge requests; it was still climbing at departure</li>
          <li>Led Devin adoption with goals and KPIs, including a game used to communicate the operating model</li>
          <li>Ran a March 2026 PM roadshow across three continents; attendees began producing prototypes afterward</li>
          <li>Built Wavelength, an MCP-enabled operating artifact for tasks, RAID-log items, and program state</li>
          <li>Facilitated an onsite that multiple attendees called one of their best within four days of arrival</li>
          <li>Reduced planning time by 50% at Arity via data-driven prioritization for 50+ engineers</li>
          <li>Increased feature throughput by 400% at WorkTango during merger-driven agile transformation</li>
          <li>Generated $1.5B in locked loans with one sprint of work at Guaranteed Rate</li>
        </ul>
      </section>

      {/* Experience */}
      <section style={{ marginBottom: "2.5rem" }}>
        <h2 style={sectionHeadingStyle}>Experience</h2>

        <JobCard
          company="ActiveCampaign"
          location="Chicago, IL"
          title="AI Enablement and Transformation"
          dates="06/2025–09/2026"
          bullets={[
            "Led AI enablement and transformation across engineering, product, and leadership, turning adoption goals into measurable, repeatable practice",
            "Helped raise agentic-coding adoption from roughly 2% to 43% of merge requests; adoption was still climbing at departure",
            "Led Devin adoption with goals and KPIs, using a game to communicate the operating model",
            "Ran a March 2026 PM roadshow across three continents; attendees began producing prototypes afterward",
            "Built Wavelength, an MCP-enabled operating artifact containing tasks, RAID-log items, and program state",
            "Designed accessibility-first Cursor and agentic-AI learning experiences that gave participants room to build working prototypes",
            "Within four days of arrival, facilitated an onsite that multiple attendees called one of their best; this was separate from the Worksites methodology",
            "Created Worksites, intensive problem-solving sessions using board-game prototyping principles, and built operational tools for shared decisions and program visibility",
          ]}
        />

        <JobCard
          company="Allstate"
          location="Chicago, IL"
          title="Senior Program Manager"
          dates="08/2023 – 02/2025"
          bullets={[
            "Led cross-functional teams to deliver key initiatives across the Allstate Family of Companies",
            "Enhanced decision-making through robust metrics and streamlined project management tools",
            "Championed agile practices and AI adoption by co-designing an AI training curriculum for the product department",
          ]}
        />

        <JobCard
          company="Arity"
          location="Chicago, IL"
          title="Senior Scrum Master & Agile Coach"
          dates="06/2020 – 08/2023"
          bullets={[
            "Slashed planning time by 50% for quarterly planning for 50+ engineers",
            "Mentored Scrum Masters, enabling three promotions and strengthening agile alignment within the org",
          ]}
        />

        <JobCard
          company="WorkTango"
          location="Chicago, IL"
          title="Senior Scrum Master & Head of Agile PMO"
          dates="01/2019 – 06/2020"
          bullets={[
            "Spearheaded agile transformation during a merger, boosting feature delivery throughput by 400%",
            "Redesigned workflows to double team velocity",
            "Built a mentorship program within the technology organization to nurture future leaders",
          ]}
        />

        <JobCard
          company="Guaranteed Rate"
          location="Chicago, IL"
          title="Scrum Master & Project Lead"
          dates="11/2015 – 12/2018"
          bullets={[
            "Rescoped a delayed initiative to deliver an MVP in two months, cutting production time by 75%",
            "Acted as product owner for a data mining tool, generating $1.5B in locked loans",
            "Developed a measurement plan that streamlined app functionality and elevated user engagement",
          ]}
        />
      </section>

      {/* Earlier Experience */}
      <section style={{ marginBottom: "2.5rem" }}>
        <h2 style={sectionHeadingStyle}>Earlier Experience</h2>
        <div style={cardStyle}>
          <p style={{ margin: "0 0 0.35rem", fontSize: "0.95rem" }}>
            <strong>Chicago Housing Authority</strong> — Business Analyst & Scrum Master (2012–2015)
          </p>
          <p style={{ margin: 0, fontSize: "0.95rem" }}>
            <strong>Technology Partnership Group</strong> — Business Analyst (2009–2012)
          </p>
        </div>
      </section>

      {/* Skills */}
      <section style={{ marginBottom: "2.5rem" }}>
        <h2 style={sectionHeadingStyle}>Tools & Skills</h2>
        <div style={cardStyle}>
          <SkillCategory label="AI & Automation" skills="Claude Code, Cursor.ai, Langfuse, Glean, Agentic Development, LLM Evaluation, MCP Development, Claude Skills Development" />
          <SkillCategory label="Facilitation & PM" skills="Jira, Digital.ai, Confluence, Airtable, Trello, Mural, Remote/Hybrid Facilitation, Offshore Coordination" />
          <SkillCategory label="Development" skills="Next.js, React, Node.js, Python, Express, Bootstrap, Postgres, Amazon Lambdas" />
          <SkillCategory label="Tracking & Analysis" skills="Google Analytics, Hotjar, Datadog, Grafana, Tableau" />
          <SkillCategory label="Communication" skills="Video, Audio, and Graphic Production, Training Production, Professional Writing, Accessibility-First Design" />
          <SkillCategory label="Methodologies" skills="Paper Prototyping, Constructivism, Kolb's Experiential Learning, Think-Pair-Share, MoSCoW, Rose/Thorn/Bud, Spotify Squad Health Check" />
        </div>
      </section>

      {/* Education */}
      <section style={{ marginBottom: "2.5rem" }}>
        <h2 style={sectionHeadingStyle}>Education & Certifications</h2>
        <div style={cardStyle}>
          <p style={{ margin: "0 0 0.35rem", fontSize: "0.95rem" }}>
            <strong>Wabash College</strong> — B.A. in English, Rhetoric, and Teacher Education, 2007
          </p>
          <p style={{ margin: 0, fontSize: "0.95rem" }}>
            <strong>Certified Scrum Master (CSM)</strong> — 2011–Present
          </p>
        </div>
      </section>

    </div>
  );
}
