/**
 * Analyze script — stub.
 *
 * The actual analysis is done by Hermes agent (triggered by cron).
 * This script just validates that results.json was already written.
 *
 * Run AFTER the agent has completed its work.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const resultsPath = path.join(__dirname, '../public/results.json');

const rawPath = path.join(__dirname, '../public/jobs-raw.json');

async function main() {
  // Verify raw data exists
  if (!fs.existsSync(rawPath)) {
    console.error('Error: jobs-raw.json not found. Run fetch first.');
    process.exit(1);
  }

  // Verify analysis was done
  if (!fs.existsSync(resultsPath)) {
    console.error('Error: results.json not found. Run the Hermes agent to analyze jobs first.');
    console.error('  hermes cron run finn-jobs-analyze');
    process.exit(1);
  }

  let results;
  try {
    results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
  } catch {
    console.error('Error: results.json is malformed.');
    process.exit(1);
  }

  console.log(`Analysis check passed:`);
  console.log(`  Total jobs: ${results.total}`);
  console.log(`  Relevant:   ${results.relevant}`);
  console.log(`  Analyzed:   ${results.analyzed}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
