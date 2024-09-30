export function renderMenu() {
  return `
    <header class="menu-bar" style="position: fixed; top: 0; left: 0; width: 100%; z-index: 1000; background-color: var(--foreground-color);">
      <div class="menu-container" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 20px;">
        <div class="menu-logo">
          <a href="/" style="color: var(--text-color); text-decoration: none;"><strong>Austen Tucker</strong></a>
        </div>
        <nav class="menu-items" style="display: flex; gap: 15px;">
          <a href="https://cdn.glitch.global/9d56f6a7-9813-4899-b879-cc8bdeaad695/AustenTuckerCSM.pdf?v=1690224612421" class="text-link">Resume</a>
          <a href="https://www.linkedin.com/in/austen-tucker-0968a914/" class="text-link">LinkedIn</a>
          <a href="/did" class="text-link">Why the Arcades?</a>
          <a href="/books" class="text-link">Books</a>
          <a href="/projects" class="text-link">Projects</a>
          <a href="/contact" class="text-link">Contact</a>
          <a href="/music" class="text-link">Music</a>
          <a href="https://github.com/Arcadesys" class="text-link">Github</a>
        </nav>
      </div>
    </header>
  `;
}
