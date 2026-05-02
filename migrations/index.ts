import * as migration_20260327_232005 from './20260327_232005';
import * as migration_20260401_000000_add_pages from './20260401_000000_add_pages';
import * as migration_20260425_190000_add_post_samples from './20260425_190000_add_post_samples';
import * as migration_20260426_000000_add_users_api_key from './20260426_000000_add_users_api_key';
import * as migration_20260426_150000_add_user_api_key_fields from './20260426_150000_add_user_api_key_fields';
import * as migration_20260426_153000_fix_user_api_key_column_name from './20260426_153000_fix_user_api_key_column_name';
import * as migration_20260430_000000_add_groups_fields from './20260430_000000_add_groups_fields';
import * as migration_20260501_000000_add_chapters from './20260501_000000_add_chapters';
import * as migration_20260502_000000_add_posts_newsletter_sent from './20260502_000000_add_posts_newsletter_sent';
import * as migration_20260502_010000_add_nav_items from './20260502_010000_add_nav_items';
import * as migration_20260502_030000_drop_posts_drafts from './20260502_030000_drop_posts_drafts';
import * as migration_20260502_040000_add_nav_items_locked_docs_rel from './20260502_040000_add_nav_items_locked_docs_rel';
import * as migration_20260502_050000_fix_array_table_ids from './20260502_050000_fix_array_table_ids';

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
    up: migration_20260426_000000_add_users_api_key.up,
    down: migration_20260426_000000_add_users_api_key.down,
    name: '20260426_000000_add_users_api_key',
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
  {
    up: migration_20260430_000000_add_groups_fields.up,
    down: migration_20260430_000000_add_groups_fields.down,
    name: '20260430_000000_add_groups_fields',
  },
  {
    up: migration_20260501_000000_add_chapters.up,
    down: migration_20260501_000000_add_chapters.down,
    name: '20260501_000000_add_chapters',
  },
  {
    up: migration_20260502_000000_add_posts_newsletter_sent.up,
    down: migration_20260502_000000_add_posts_newsletter_sent.down,
    name: '20260502_000000_add_posts_newsletter_sent',
  },
  {
    up: migration_20260502_010000_add_nav_items.up,
    down: migration_20260502_010000_add_nav_items.down,
    name: '20260502_010000_add_nav_items',
  },
  {
    up: migration_20260502_030000_drop_posts_drafts.up,
    down: migration_20260502_030000_drop_posts_drafts.down,
    name: '20260502_030000_drop_posts_drafts',
  },
  {
    up: migration_20260502_040000_add_nav_items_locked_docs_rel.up,
    down: migration_20260502_040000_add_nav_items_locked_docs_rel.down,
    name: '20260502_040000_add_nav_items_locked_docs_rel',
  },
  {
    up: migration_20260502_050000_fix_array_table_ids.up,
    down: migration_20260502_050000_fix_array_table_ids.down,
    name: '20260502_050000_fix_array_table_ids',
  },
];
