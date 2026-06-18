import type { GlobalConfig } from 'payload';

import { Books } from './Books';
import { Demos } from './Demos';
import { Groups } from './Groups';
import { Media } from './Media';
import { NavItems } from './NavItems';
import { Pages } from './Pages';
import { PostReactions } from './PostReactions';
import { PostmarkEvents } from './PostmarkEvents';
import { Posts } from './Posts';
import { Users } from './Users';
import { PublishQueue } from '../globals/PublishQueue';

export const collections = [
  Users,
  Posts,
  PostReactions,
  PostmarkEvents,
  Groups,
  Books,
  Demos,
  Pages,
  Media,
  NavItems,
];

export const globals: GlobalConfig[] = [PublishQueue];
