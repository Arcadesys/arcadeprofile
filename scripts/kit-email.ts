import { config } from 'dotenv';
import { runKitEmail } from '../lib/kit-email';

// Dedicated, ignored operator file. Never pull or discover credentials automatically.
config({ path: '.env.kit.local', quiet: true });
runKitEmail(process.argv.slice(2)).catch((error: Error) => {
  console.error(error.message);
  process.exitCode = 1;
});
