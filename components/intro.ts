import { renderMenu } from './menu';

export function renderIntro() {
const html = `
<div
      class="austenbox"
      style="margin: 0 auto; margin-top: 5%; margin-bottom: 5%"
    >
      <div class="intro-content">
        <img
          src="https://cdn.glitch.global/9d56f6a7-9813-4899-b879-cc8bdeaad695/thearcades.jpg?v=1669768929578"
          alt="Austen Tucker"
          class="avatar"
        />
        <div class="intro-text">
          <h2 style="color: white">Hi. I'm Austen Tucker (they/them), and I make a lot of things.</h2>
          <ul class="arcadetext" style="text-align: left">
            <li><strong>Books:</strong> I'm a published author who mostly writes YA fantasy. Check out my catalog <a href="/books">here</a>.</li>
            <li><strong>Web App Development:</strong> I'm a full stack developer mostly working in Node, Express, and Handlebars. My passion is building useful tools for the neurodivergent and blind communities. Check out my projects <a href="/projects">here</a>.</li>
            <li><strong>Music:</strong> I make music. Check out my Soundcloud <a href="https://soundcloud.com/thearcadesystem">here</a>.</li>
            <li><strong>Other Projects:</strong> I love to tinker with video production, streaming, and more. Check out my other projects <a href="/projects"></a>here</a>.</li>
          </ul>
          <p class="arcadetext" style="text-align: left">
            If you're looking for my professional persona, links are below.
          </p>
        </div>
      </div>
      <p>Insert your socials (github, youtube, goodreads, Linkedin) here</p>
      <div class="links container">
           
            <div class="button-grid">
                <a class="button-link" href="https://cdn.glitch.global/9d56f6a7-9813-4899-b879-cc8bdeaad695/AustenTuckerCSM.pdf?v=1690224612421">Resume</a>
                <a class="button-link" href="https://www.linkedin.com/in/austen-tucker-0968a914/">LinkedIn</a>
                <a class="button-link" href="/did">Why the Arcades?</a>
                <a class="button-link" href="/books">Books</a>
                <a class="button-link" href="/projects">Projects</a>
                <a class="button-link" href="/contact">Contact</a>
                <a class="button-link" href="/music">Music</a>
                <a class="button-link" href="https://github.com/Arcadesys">Github</a>
            </div>

      </div>
    </div>
  `;

  return html;
}