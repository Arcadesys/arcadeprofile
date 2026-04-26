import type { CollectionConfig } from 'payload'
import { publicReadAccess } from './shared/access'
import { adminGroups } from './shared/admin'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    useAPIKey: true,
  },
  admin: {
    group: adminGroups.system,
    useAsTitle: 'email',
  },
  access: publicReadAccess,
  fields: [],
}
