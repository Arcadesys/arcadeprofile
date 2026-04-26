import * as migration_20260327_232005 from './20260327_232005';
import * as migration_20260401_000000_add_pages from './20260401_000000_add_pages';
import * as migration_20260425_190000_add_post_samples from './20260425_190000_add_post_samples';
import * as migration_20260426_150000_add_user_api_key_fields from './20260426_150000_add_user_api_key_fields';
import * as migration_20260426_153000_fix_user_api_key_column_name from './20260426_153000_fix_user_api_key_column_name';

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
  {
    up: migration_20260426_150000_add_user_api_key_fields.up,
    down: migration_20260426_150000_add_user_api_key_fields.down,
    name: '20260426_150000_add_user_api_key_fields',
  },
  {
    up: migration_20260426_153000_fix_user_api_key_column_name.up,
    down: migration_20260426_153000_fix_user_api_key_column_name.down,
    name: '20260426_153000_fix_user_api_key_column_name',
  },
];
