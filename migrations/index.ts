import * as migration_20260327_232005 from './20260327_232005';

export const migrations = [
  {
    up: migration_20260327_232005.up,
    down: migration_20260327_232005.down,
    name: '20260327_232005'
  },
];
