import { writeFileSync } from 'node:fs';
import { buildAnalyticsPublicPaths, buildMffAnalyticsLabels } from './analytics-manifest';

// Generate completely before writing either file; a catalog error fails the build.
const paths = buildAnalyticsPublicPaths();
const labels = buildMffAnalyticsLabels();
writeFileSync('data/analytics-public-paths.json', `${JSON.stringify(paths, null, 2)}\n`);
writeFileSync('data/analytics-mff-labels.json', `${JSON.stringify(labels, null, 2)}\n`);
