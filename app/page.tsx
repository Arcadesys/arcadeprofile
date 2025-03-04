import Image from "next/image";

const IntroContent = () => (
  <div className="austenbox" style={{ margin: "0 auto", marginTop: "5%", marginBottom: "5%" }}>
    <div className="intro-content">
      <Image 
        src="/images/avatars/twi.JPG"
        alt="Austen Tucker"
        className="avatar" 
        width={500} 
        height={500} 
      />
      <div className="intro-text"> 
        <h1 className="gaysparkles" style={{ color: "white", textAlign: "center" }}>Hi. I'm Austen Tucker.</h1>
        <h2>You may know me as <span className="gaysparkles">the Arcades.</span></h2>
        <h2 style={{ textAlign: "center" }}>I make a lot of things.</h2>
        <div className="arcadetext" style={{ textAlign: "left" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <tr>
                <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                  <h2>Books</h2>
                </td>
                <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                  <p>I'm a published author who mostly writes YA fantasy. Check out my catalog <a href="/books">here</a>.</p>
                </td>
              </tr>
              <tr>
                <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                  <h2>Web App Development</h2>
                </td>
                <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                  <p>I'm a full stack developer mostly working in Python, Javascript, and Next.js. My passion is building useful tools for the neurodivergent and blind communities. Check out my projects <a href="/projects">here</a>.</p>
                </td>
              </tr>
              <tr>
                <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                  <h2>Professional Contacts</h2>
                </td>
                <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                  <p>In my dayjob I'm a scrum master and project manager. If you're looking for that professional persona, check out my <a href="/resume/TuckerAustenScrumMaster.pdf">Resume</a> or <a href="https://www.linkedin.com/in/austen-tucker-0968a914/">LinkedIn</a>.</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
);

export default function Home() {
  return <IntroContent />;
}
