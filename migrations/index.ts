import * as migration_20260327_232005 from './20260327_232005';
import * as migration_20260401_000000_add_pages from './20260401_000000_add_pages';
import * as migration_20260425_190000_add_post_samples from './20260425_190000_add_post_samples';

export const migrations = [
  {
    up: migration_20260327_232005.up,
    down: migration_20260327_232005.down,
    name: '20260327_232005',
  },
  {
    up: migration_20260401_000000_add_pages.up,
    down: migration_20260401_000000_add_pages.down,
    name: '20260401_000000_add_pages',
  },
  {
    up: migration_20260425_190000_add_post_samples.up,
    down: migration_20260425_190000_add_post_samples.down,
    name: '20260425_190000_add_post_samples',
  },
];
