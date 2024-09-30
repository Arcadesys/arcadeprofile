export function renderMenu() {
  return `
    <header class="floating-menu">
      <div class="menu-container">
        <input type="checkbox" id="menu-toggle" />
        <label for="menu-toggle" class="hamburger">&#9776;</label>
        <nav class="menu-drawer">
          <ul class="menu-items">
            <li><a href="/"><strong>Austen Tucker</strong></a></li>
            <li><a href="https://cdn.glitch.global/9d56f6a7-9813-4899-b879-cc8bdeaad695/AustenTuckerCSM.pdf?v=1690224612421">Resume</a></li>
            <li><a href="https://www.linkedin.com/in/austen-tucker-0968a914/">LinkedIn</a></li>
            <li><a href="/did">Why the Arcades?</a></li>
            <li><a href="/books">Books</a></li>
            <li><a href="/projects">Projects</a></li>
            <li><a href="/contact">Contact</a></li>
            <li><a href="/music">Music</a></li>
            <li><a href="https://github.com/Arcadesys">Github</a></li>
          </ul>
        </nav>
      </div>
    </header>
  `;
}
