import { VercelRequest, VercelResponse } from '@vercel/node';
import { renderMenu } from '../components/menu';
import { renderIntro } from '../components/intro';

export default function render(req: VercelRequest, res: VercelResponse) {
  const menu = renderMenu();
  const intro = renderIntro();
  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="../styles/style.css">
        <title>Austen Tucker, CSM</title>
      </head>
      <body>
      ${renderMenu()}
      ${renderIntro()}
      </body>
    </html>
  `;
  res.send(html);
}
