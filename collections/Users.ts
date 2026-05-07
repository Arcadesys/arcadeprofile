import type { CollectionConfig } from 'payload'
import { authenticatedAccess } from './shared/access'
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
  // or an authenticated session. Locking read down to auth-only prevents
  // anonymous enumeration of email addresses, hashed passwords, and API keys.
  access: authenticatedAccess,
  fields: [],
}
