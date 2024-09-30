import { VercelRequest, VercelResponse } from '@vercel/node';
import render from './index';
import { renderMenu } from '../components/menu';
import { renderDidContent } from '../components/did-content';

export default function (req: VercelRequest, res: VercelResponse) {
  res.status(200).send('Hello, World!');
}
