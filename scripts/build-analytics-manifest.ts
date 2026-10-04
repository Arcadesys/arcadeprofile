import { writeFileSync } from 'node:fs';
import { buildAnalyticsPublicPaths, buildAnalyticsReaderPaths, buildMffAnalyticsLabels } from './analytics-manifest';

// Generate completely before writing any file; a catalog error fails the build.
const paths = buildAnalyticsPublicPaths();
const labels = buildMffAnalyticsLabels();
const readerPaths = await buildAnalyticsReaderPaths(paths);
writeFileSync('data/analytics-public-paths.json', `${JSON.stringify(paths, null, 2)}\n`);
writeFileSync('data/analytics-mff-labels.json', `${JSON.stringify(labels, null, 2)}\n`);
writeFileSync('data/analytics-reader-paths.json', `${JSON.stringify(readerPaths, null, 2)}\n`);
