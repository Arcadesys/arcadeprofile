import type { Audience } from './subscribe-types';

// These public Kit IDs belong to the existing forms and tags used by each site.
// The writing forms retain their deployment-specific configuration.
const forms: Record<Audience, string> = {
  all: 'KIT_FORM_ALL_ID',
  fiction: 'KIT_FORM_FICTION_ID',
  essays: 'KIT_FORM_ESSAYS_ID',
  lab: 'KIT_FORM_LAB_ID',
  'queer-columns': '9954454',
  'work-ai': '9953061',
  th4f: '9953071',
};

const tags: Record<Audience, string> = {
  all: 'KIT_TAG_ALL_WRITING_ID',
  fiction: 'KIT_TAG_FICTION_ID',
  essays: 'KIT_TAG_ESSAYS_ID',
  lab: 'KIT_TAG_LAB_ID',
  'queer-columns': '23866437',
  'work-ai': '23806915',
  th4f: '23808390',
};

function resolve(value: string, env: Record<string, string | undefined> = process.env): string {
  return /^\d+$/.test(value) ? value : env[value]?.trim() ?? '';
}

export function kitFormId(audience: Audience): string { return resolve(forms[audience]); }
export function kitTagSource(audience: Audience): string { return tags[audience]; }
export function kitTagIdFromEnv(audience: Audience, env: Record<string, string | undefined> = process.env): string { return resolve(tags[audience], env); }
export function kitTagId(audience: Audience): string { return kitTagIdFromEnv(audience); }
export function isArcadesAudience(audience: Audience): boolean {
  return audience !== 'work-ai' && audience !== 'th4f';
}
