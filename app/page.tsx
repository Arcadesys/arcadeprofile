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
        <h1 className="gaysparkles" style={{ color: "white", textAlign: "center" }}>Hi. I'm Austen Tucker, and I use they/them pronouns.</h1>
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
                  <h2>Music</h2>
                </td>
                <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                  <p>I make music. Check out my Soundcloud <a href="https://soundcloud.com/thearcadesystem">here</a>.</p>
                </td>
              </tr>
              <tr>
                <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                  <h2>Other Projects</h2>
                </td>
                <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                  <p>I love to tinker with video production, streaming, and more. Check out my other projects <a href="/projects">here</a>.</p>
                </td>
              </tr>
              <tr>
                <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                  <h2>Professional Contacts</h2>
                </td>
                <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                  <p>In my dayjob I'm a project manager for a Fortune 100 company. I'm currently transitioning to business work after 15 years in software development. If you're looking for that professional persona, check out my <a href="https://cdn.glitch.global/9d56f6a7-9813-4899-b879-cc8bdeaad695/AustenTuckerCSM.pdf?v=1690224612421">Resume</a> or <a href="https://www.linkedin.com/in/austen-tucker-0968a914/">LinkedIn</a>.</p>
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
