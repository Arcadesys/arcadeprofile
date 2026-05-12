import type { GlobalConfig } from 'payload';

import { Books } from './Books';
import { Demos } from './Demos';
import { Groups } from './Groups';
import { Media } from './Media';
import { NavItems } from './NavItems';
import { Pages } from './Pages';
import { Posts } from './Posts';
import { Users } from './Users';

export const collections = [
  Users,
  Posts,
  Groups,
  Books,
  Demos,
  Pages,
  Media,
  NavItems,
];

export const globals: GlobalConfig[] = [];
