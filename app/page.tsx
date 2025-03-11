import Image from "next/image";
import Link from "next/link";

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
                  <p>I'm a published author who mostly writes YA fantasy. I'm currently not represented, but open to it! Check out my catalog <Link href="/previews" className="text-link">here</Link>.</p>
                </td>
              </tr>
              <tr>
                <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                  <h2>Web App Development</h2>
                </td>
                <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                  <p>I'm a full stack developer mostly working in Python, Javascript, and Next.js. My passion is building useful tools for the neurodivergent and blind communities. Check out my projects on my <a href="https://blog.thearcades.me" className="text-link" target="_blank" rel="noopener noreferrer">Eleventy blog</a>.</p>
                </td>
              </tr>
              <tr>
                <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                  <h2>Professional Contacts</h2>
                </td>
                <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                  <p>In my dayjob I'm a scrum master and project manager. If you're looking for that professional persona, check out my professional links below:</p>
                  
                  <div className="flex flex-wrap gap-4 mt-4 justify-center">
                    <a 
                      href="/resume/TuckerAustenScrumMaster.pdf" 
                      className="button-link flex items-center gap-2 hover:scale-105 transition-transform"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M4 0h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2zm0 1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H4z"/>
                        <path d="M4.603 12.087a.81.81 0 0 1-.438-.42c-.195-.388-.13-.776.08-1.102.198-.307.526-.568.897-.787a7.68 7.68 0 0 1 1.482-.645 19.701 19.701 0 0 0 1.062-2.227 7.269 7.269 0 0 1-.43-1.295c-.086-.4-.119-.796-.046-1.136.075-.354.274-.672.65-.823.192-.077.4-.12.602-.077a.7.7 0 0 1 .477.365c.088.164.12.356.127.538.007.187-.012.395-.047.614-.084.51-.27 1.134-.52 1.794a10.954 10.954 0 0 0 .98 1.686 5.753 5.753 0 0 1 1.334.05c.364.065.734.195.96.465.12.144.193.32.2.518.007.192-.047.382-.138.563a1.04 1.04 0 0 1-.354.416.856.856 0 0 1-.51.138c-.331-.014-.654-.196-.933-.417a5.716 5.716 0 0 1-.911-.95 11.642 11.642 0 0 0-1.997.406 11.311 11.311 0 0 1-1.021 1.51c-.29.35-.608.655-.926.787a.793.793 0 0 1-.58.029zm1.379-1.901c-.166.076-.32.156-.459.238-.328.194-.541.383-.647.547-.094.145-.096.25-.04.361.01.022.02.036.026.044a.27.27 0 0 0 .035-.012c.137-.056.355-.235.635-.572a8.18 8.18 0 0 0 .45-.606zm1.64-1.33a12.647 12.647 0 0 1 1.01-.193 11.666 11.666 0 0 1-.51-.858 20.741 20.741 0 0 1-.5 1.05zm2.446.45c.15.162.296.3.435.41.24.19.407.253.498.256a.107.107 0 0 0 .07-.015.307.307 0 0 0 .094-.125.436.436 0 0 0 .059-.2.095.095 0 0 0-.026-.063c-.052-.062-.2-.152-.518-.209a3.881 3.881 0 0 0-.612-.053zM8.078 5.8a6.7 6.7 0 0 0 .2-.828c.031-.188.043-.343.038-.465a.613.613 0 0 0-.032-.198.517.517 0 0 0-.145.04c-.087.035-.158.106-.196.283-.04.192-.03.469.046.822.024.111.054.227.09.346z"/>
                      </svg>
                      Resume
                    </a>
                    
                    <a 
                      href="https://www.linkedin.com/in/austen-tucker-0968a914/" 
                      className="button-link flex items-center gap-2 hover:scale-105 transition-transform"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854V1.146zm4.943 12.248V6.169H2.542v7.225h2.401zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248-.822 0-1.359.54-1.359 1.248 0 .694.521 1.248 1.327 1.248h.016zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016a5.54 5.54 0 0 1 .016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225h2.4z"/>
                      </svg>
                      LinkedIn
                    </a>
                    
                    <a 
                      href="https://github.com/Arcadesys" 
                      className="button-link flex items-center gap-2 hover:scale-105 transition-transform"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
                      </svg>
                      GitHub
                    </a>
                    
                    <a 
                      href="mailto:austen@thearcades.me" 
                      className="button-link flex items-center gap-2 hover:scale-105 transition-transform"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4Zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1H2Zm13 2.383-4.708 2.825L15 11.105V5.383Zm-.034 6.876-5.64-3.471L8 9.583l-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.741ZM1 11.105l4.708-2.897L1 5.383v5.722Z"/>
                      </svg>
                      Email Me
                    </a>
                  </div>
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
