import * as migration_20260327_232005 from './20260327_232005';
import * as migration_20260401_000000_add_pages from './20260401_000000_add_pages';

export const migrations = [
  {
    up: migration_20260327_232005.up,
    down: migration_20260327_232005.down,
    name: '20260327_232005'
  },
  {
    up: migration_20260401_000000_add_pages.up,
    down: migration_20260401_000000_add_pages.down,
    name: '20260401_000000_add_pages'
  },
];
