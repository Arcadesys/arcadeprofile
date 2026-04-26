import type { Access, CollectionConfig } from 'payload';

const isAuthenticated: Access = ({ req }) => Boolean(req.user);

export const publicReadAccess = {
  read: () => true,
} satisfies CollectionConfig['access'];

export const authenticatedAccess = {
  read: isAuthenticated,
  create: isAuthenticated,
  update: isAuthenticated,
  delete: isAuthenticated,
} satisfies CollectionConfig['access'];
