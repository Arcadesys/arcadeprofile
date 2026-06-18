import * as migration_20260327_232005 from './20260327_232005';
import * as migration_20260401_000000_add_pages from './20260401_000000_add_pages';
import * as migration_20260425_190000_add_post_samples from './20260425_190000_add_post_samples';
import * as migration_20260426_000000_add_users_api_key from './20260426_000000_add_users_api_key';
import * as migration_20260426_150000_add_user_api_key_fields from './20260426_150000_add_user_api_key_fields';
import * as migration_20260426_153000_fix_user_api_key_column_name from './20260426_153000_fix_user_api_key_column_name';
import * as migration_20260430_000000_add_groups_fields from './20260430_000000_add_groups_fields';
import * as migration_20260501_000000_add_chapters from './20260501_000000_add_chapters';
import * as migration_20260502_000000_add_posts_newsletter_sent from './20260502_000000_add_posts_newsletter_sent';
import * as migration_20260502_000000_groups_image_upload from './20260502_000000_groups_image_upload';
import * as migration_20260502_010000_add_nav_items from './20260502_010000_add_nav_items';
import * as migration_20260502_030000_drop_posts_drafts from './20260502_030000_drop_posts_drafts';
import * as migration_20260502_040000_add_nav_items_locked_docs_rel from './20260502_040000_add_nav_items_locked_docs_rel';
import * as migration_20260502_050000_fix_array_table_ids from './20260502_050000_fix_array_table_ids';
import * as migration_20260503_000000_add_groups_home_highlight from './20260503_000000_add_groups_home_highlight';
import * as migration_20260504_000000_relabel_blog_nav_item_to_latest from './20260504_000000_relabel_blog_nav_item_to_latest';
import * as migration_20260505_000000_promote_scheduled_drafts from './20260505_000000_promote_scheduled_drafts';
import * as migration_20260505_220000_drop_subscribers from './20260505_220000_drop_subscribers';
import * as migration_20260506_000000_set_publish_time_to_5am from './20260506_000000_set_publish_time_to_5am';
import * as migration_20260507_000000_add_social_credentials_global from './20260507_000000_add_social_credentials_global';
import * as migration_20260507_000000_add_subscribe_nav_item from './20260507_000000_add_subscribe_nav_item';
import * as migration_20260510_000000_add_groups_format from './20260510_000000_add_groups_format';
import * as migration_20260512_000000_drop_social_tables from './20260512_000000_drop_social_tables';
import * as migration_20260513_000000_add_posts_newsletter_sends from './20260513_000000_add_posts_newsletter_sends';
import * as migration_20260513_010000_replace_newsletter_sent_with_suppress from './20260513_010000_replace_newsletter_sent_with_suppress';
import * as migration_20260513_020000_add_publish_queue_global from './20260513_020000_add_publish_queue_global';
import * as migration_20260513_030000_add_posts_preview_token from './20260513_030000_add_posts_preview_token';
import * as migration_20260514_000000_add_books_meta_fields from './20260514_000000_add_books_meta_fields';
import * as migration_20260514_010000_add_post_reactions from './20260514_010000_add_post_reactions';
import * as migration_20260515_000000_add_post_reactions_locked_docs_rel from './20260515_000000_add_post_reactions_locked_docs_rel';
import * as migration_20260520_000000_replace_newsletter_sends_with_ac_campaign from './20260520_000000_replace_newsletter_sends_with_ac_campaign';
import * as migration_20260606_000000_replace_ac_campaign_with_newsletter_send from './20260606_000000_replace_ac_campaign_with_newsletter_send';
import * as migration_20260618_000000_add_postmark_events from './20260618_000000_add_postmark_events';
import * as migration_20260618_010000_add_groups_jacket_description from './20260618_010000_add_groups_jacket_description';

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
    up: migration_20260502_000000_groups_image_upload.up,
    down: migration_20260502_000000_groups_image_upload.down,
    name: '20260502_000000_groups_image_upload',
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
  {
    up: migration_20260503_000000_add_groups_home_highlight.up,
    down: migration_20260503_000000_add_groups_home_highlight.down,
    name: '20260503_000000_add_groups_home_highlight',
  },
  {
    up: migration_20260504_000000_relabel_blog_nav_item_to_latest.up,
    down: migration_20260504_000000_relabel_blog_nav_item_to_latest.down,
    name: '20260504_000000_relabel_blog_nav_item_to_latest',
  },
  {
    up: migration_20260505_000000_promote_scheduled_drafts.up,
    down: migration_20260505_000000_promote_scheduled_drafts.down,
    name: '20260505_000000_promote_scheduled_drafts',
  },
  {
    up: migration_20260505_220000_drop_subscribers.up,
    down: migration_20260505_220000_drop_subscribers.down,
    name: '20260505_220000_drop_subscribers',
  },
  {
    up: migration_20260506_000000_set_publish_time_to_5am.up,
    down: migration_20260506_000000_set_publish_time_to_5am.down,
    name: '20260506_000000_set_publish_time_to_5am',
  },
  {
    up: migration_20260507_000000_add_social_credentials_global.up,
    down: migration_20260507_000000_add_social_credentials_global.down,
    name: '20260507_000000_add_social_credentials_global',
  },
  {
    up: migration_20260507_000000_add_subscribe_nav_item.up,
    down: migration_20260507_000000_add_subscribe_nav_item.down,
    name: '20260507_000000_add_subscribe_nav_item',
  },
  {
    up: migration_20260510_000000_add_groups_format.up,
    down: migration_20260510_000000_add_groups_format.down,
    name: '20260510_000000_add_groups_format',
  },
  {
    up: migration_20260512_000000_drop_social_tables.up,
    down: migration_20260512_000000_drop_social_tables.down,
    name: '20260512_000000_drop_social_tables',
  },
  {
    up: migration_20260513_000000_add_posts_newsletter_sends.up,
    down: migration_20260513_000000_add_posts_newsletter_sends.down,
    name: '20260513_000000_add_posts_newsletter_sends',
  },
  {
    up: migration_20260513_010000_replace_newsletter_sent_with_suppress.up,
    down: migration_20260513_010000_replace_newsletter_sent_with_suppress.down,
    name: '20260513_010000_replace_newsletter_sent_with_suppress',
  },
  {
    up: migration_20260513_020000_add_publish_queue_global.up,
    down: migration_20260513_020000_add_publish_queue_global.down,
    name: '20260513_020000_add_publish_queue_global',
  },
  {
    up: migration_20260513_030000_add_posts_preview_token.up,
    down: migration_20260513_030000_add_posts_preview_token.down,
    name: '20260513_030000_add_posts_preview_token',
  },
  {
    up: migration_20260514_000000_add_books_meta_fields.up,
    down: migration_20260514_000000_add_books_meta_fields.down,
    name: '20260514_000000_add_books_meta_fields',
  },
  {
    up: migration_20260514_010000_add_post_reactions.up,
    down: migration_20260514_010000_add_post_reactions.down,
    name: '20260514_010000_add_post_reactions',
  },
  {
    up: migration_20260515_000000_add_post_reactions_locked_docs_rel.up,
    down: migration_20260515_000000_add_post_reactions_locked_docs_rel.down,
    name: '20260515_000000_add_post_reactions_locked_docs_rel',
  },
  {
    up: migration_20260520_000000_replace_newsletter_sends_with_ac_campaign.up,
    down: migration_20260520_000000_replace_newsletter_sends_with_ac_campaign.down,
    name: '20260520_000000_replace_newsletter_sends_with_ac_campaign',
  },
  {
    up: migration_20260606_000000_replace_ac_campaign_with_newsletter_send.up,
    down: migration_20260606_000000_replace_ac_campaign_with_newsletter_send.down,
    name: '20260606_000000_replace_ac_campaign_with_newsletter_send',
  },
  {
    up: migration_20260618_000000_add_postmark_events.up,
    down: migration_20260618_000000_add_postmark_events.down,
    name: '20260618_000000_add_postmark_events',
  },
  {
    up: migration_20260618_010000_add_groups_jacket_description.up,
    down: migration_20260618_010000_add_groups_jacket_description.down,
    name: '20260618_010000_add_groups_jacket_description'
  },
];
