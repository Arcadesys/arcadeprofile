/** Local-only Heinlein edition build; no sends, uploads or archive writes.
 * Usage: node scripts/generate-broomsticks.mjs [--python /path/to/python]
 *        [--epub-only] [--debug-dir /tmp/broomsticks-proof]
 * Uses the installed Heinlein CLI's Python unless --python is supplied.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const pythonIndex = args.indexOf('--python');
let python;
if (pythonIndex !== -1) {
  python = args[pythonIndex + 1];
  if (!python) throw new Error('--python requires a Python executable with Heinlein installed.');
  args.splice(pythonIndex, 2);
} else {
  const cli = execFileSync('which', ['heinlein'], { encoding: 'utf8' }).trim();
  python = readFileSync(cli, 'utf8').split('\n')[0].replace(/^#!/, '').trim();
  if (!path.isAbsolute(python) || python.includes(' ')) {
    throw new Error('Pass --python /path/to/python with Heinlein installed.');
  }
}
execFileSync(python, [path.resolve('scripts/build-broomsticks.py'), ...args], { stdio: 'inherit' });
