import { VercelRequest, VercelResponse } from '@vercel/node';
import render from './index';
import { renderMenu } from '../components/menu';
import { renderDidChat } from '../components/did-chat';


export default function handler(req: VercelRequest, res: VercelResponse) {
  const html = `
    ${renderMenu()}
    ${renderDidChat()}
  `;

  res.status(200).send(html);
}