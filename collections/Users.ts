import type { CollectionConfig } from 'payload'
import { isAuthenticated } from './shared/access'
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
  // No public consumer of /api/users — every read goes through Payload admin
  // or an authenticated session. Only override `read`; leaving create/update/
  // delete unset keeps Payload's built-in defaults (e.g. self-update) instead
  // of widening to "any authenticated user".
  access: {
    read: isAuthenticated,
  },
  fields: [],
}
