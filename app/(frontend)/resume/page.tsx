import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Resume',
  description: 'Professional resume of Austen Tucker-Crowder — AI Enablement and Transformation, Program Manager, and Agile Coach.',
  openGraph: {
    title: 'Resume — Austen Tucker-Crowder',
    description: 'AI Enablement and Transformation, Program Manager, and Agile Coach with 16+ years delivering customer-focused software solutions.',
    url: 'https://thearcades.me/resume',
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
    <div style={{ maxWidth: "740px", margin: "0 auto", padding: "2rem 1rem" }}>

      {/* Header */}
      <section style={{ marginBottom: "2.5rem", marginTop: "2rem", textAlign: "center" }}>
        <h1 className="gaysparkles" style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
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
          <a href="https://thearcades.me">thearcades.me</a>
          {" "}&middot;{" "}
          <a href="https://github.com/Arcadesys">github.com/Arcadesys</a>
        </p>
      </section>

      {/* Summary */}
      <section style={{ marginBottom: "2.5rem" }}>
        <h2 style={sectionHeadingStyle}>Summary</h2>
        <p style={{ lineHeight: 1.8, margin: 0 }}>
          AI Enablement and Transformation, Program Manager, and Agile Coach with 16+ years
          delivering customer-focused software solutions. Currently leading ActiveCampaign&apos;s
          company-wide pivot from traditional marketing automation to an autonomous AI-first
          platform. I design facilitation methodologies, build AI-powered operational tooling,
          and drive cross-functional alignment across engineering, product, and executive
          leadership. Accessibility-first facilitator and builder of scalable enablement programs.
        </p>
      </section>

      {/* Key Accomplishments */}
      <section style={{ marginBottom: "2.5rem" }}>
        <h2 style={sectionHeadingStyle}>Key Accomplishments</h2>
        <ul style={{ margin: 0, paddingLeft: "1.25rem", lineHeight: 1.8 }}>
          <li>Coordinated ActiveCampaign&apos;s full AI transformation across three strategic pillars, elevated to ELT-level ePMO governance</li>
          <li>Created &ldquo;Worksites&rdquo; methodology — intensive problem-solving sessions using board game prototyping principles; adopted for international rollout</li>
          <li>Designed and delivered Cursor IDE bootcamp for non-technical staff; participants produced working artifacts in-session</li>
          <li>Built 7+ Claude AI skills automating daily briefings, executive digests, meeting synthesis, and DRI investigation</li>
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
          dates="06/2025 – Present"
          bullets={[
            "Coordinated full pivot from traditional marketing automation to autonomous AI-first marketing across three strategic pillars: Contextual AI, AI-First Marketing Campaigns, and AI Foundations & Data Intelligence",
            "Served as cross-pillar intelligence hub synthesizing insights to identify dependencies, risks, and acceleration opportunities",
            "Portfolio elevated to formal ePMO governance with ELT-level visibility and quarterly reviews",
            "Designed outcomes framework with mandatory success and failure criteria — pre-loading decisions so teams act on signals, not vibes",
            "Created \"Worksites\" — intensive one-day problem-solving sessions using board game prototyping principles; adopted for international rollout across Poland, Ireland, and Costa Rica",
            "Designed and ran 90-minute Cursor/IDE bootcamp for designers and product owners who had never written code — participants produced working artifacts in-session",
            "Built suite of 7+ Claude skills pulling from Google Calendar, Drive, Slack, Jira, and Airtable for daily briefings, executive digests, and meeting synthesis",
            "Built custom LLM-as-judge evaluation prompts in Langfuse to assess AI agent response quality",
            "Led cross-pillar effort to define north star metrics for AI transformation; consolidated disparate metrics into a unified framework",
            "Redesigned failing daily standup into cross-pillar tactical decision-making meeting with structured decision capture and ownership enforcement",
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
