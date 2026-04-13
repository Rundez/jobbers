/**
 * Analyze script.
 *
 * Reads jobs-raw.json, analyzes each job for relevance to a math pedagogy educator,
 * and outputs results.json with both relevant and filtered jobs.
 *
 * The LLM analysis is done in "one go" via request-based provider.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const resultsPath = path.join(__dirname, '../public/results.json');
const rawPath = path.join(__dirname, '../public/jobs-raw.json');

/**
 * Relevance criteria for a "lektor med mastergrad i matematikkpedagogikk".
 * Tweak these to adjust which jobs are considered relevant.
 */
const RELEVANCE_KEYWORDS = {
  // Job titles that match
  titles: [
    'lærer', 'lektor', 'lærer', 'undervisning', 'underviser',
    'matematikk', 'realfag', 'naturfag', 'fysikk', 'kjemi',
    'pedagog', 'utdanning', 'skole', 'forskning', 'veileder',
    'veileder', 'konsulent', 'analytiker', 'controller',
    'statistikk', 'data', 'analyse', 'økonomi', 'økonom', 'budsjett',
  ],
  // Companies that are always relevant (universities, schools, edu-tech)
  companyKeywords: [
    'universitet', 'høgskole', 'høgskolen', 'skole', 'utdanning', 'akademi',
    'college', 'institutt', 'forskning', 'edu', 'pedagog',
  ],
  // Reject these clearly (blue-collar, trade work)
  rejectTitles: [
    'elektriker', 'tømrer', 'rørlegger', 'mekaniker', 'sjåfør',
    'sveiser', 'lakkerer', 'montør', 'servicetekniker', 'verktøy',
    'håndverker', 'snikker', 'murer', 'blikkenslager',
  ],
};

/**
 * Simple keyword-based relevance check.
 * Returns { relevant: boolean, reason: string }
 */
function checkRelevance(job) {
  const titleLower = (job.title || '').toLowerCase();
  const companyLower = (job.company || '').toLowerCase();
  const descLower = (job.description || '').toLowerCase();
  const combined = titleLower + ' ' + companyLower + ' ' + descLower;

  // Explicit rejections
  for (const reject of RELEVANCE_KEYWORDS.rejectTitles) {
    if (titleLower.includes(reject)) {
      return {
        relevant: false,
        reason: `Tittel inneholder avvist nøkkelord: "${reject}"`,
      };
    }
  }

  // Positive matching
  let matchedTitle = null;
  let matchedCompany = null;
  for (const title of RELEVANCE_KEYWORDS.titles) {
    if (titleLower.includes(title)) {
      matchedTitle = title;
      break;
    }
  }
  for (const kw of RELEVANCE_KEYWORDS.companyKeywords) {
    if (companyLower.includes(kw)) {
      matchedCompany = kw;
      break;
    }
  }

  // Boost: math/stats explicitly mentioned
  const hasMath = /\b(matematikk|math|statistikk|stats|analyse|data|økon|makro|mikro|algebra|geometri|kalkulus|realfag)\b/i.test(combined);
  // Boost: education sector
  const hasEduSector = /\b(universitet|høgskole|skole|akademi|college|institutt|utdanning|forskning|lærer|lektor|undervisning)\b/i.test(combined);

  const score = (matchedTitle ? 2 : 0) + (matchedCompany ? 1 : 0) + (hasMath ? 2 : 0) + (hasEduSector ? 1 : 0);

  if (score >= 2) {
    return {
      relevant: true,
      reason: matchedTitle
        ? `Matcher nøkkelord: "${matchedTitle}"${hasMath ? ' + matematikk/økonomi' : ''}`
        : hasMath
          ? 'Matematikk-, statistikk- eller analytisk kompetanse'
          : 'Utdanningssektor',
    };
  }

  if (score === 1) {
    return {
      relevant: false,
      reason: 'Bare én svak match, ikke relevant nok',
    };
  }

  return {
    relevant: false,
    reason: 'Ingen match med lektor/matematikk-kriteriene',
  };
}

async function main() {
  if (!fs.existsSync(rawPath)) {
    console.error('Error: jobs-raw.json not found. Run fetch first.');
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(rawPath, 'utf8'));
  const jobs = raw.jobs || [];

  const relevantJobs = [];
  const filteredJobs = [];

  for (const job of jobs) {
    const { relevant, reason } = checkRelevance(job);
    const jobWithReason = { ...job, matchReason: reason };

    if (relevant) {
      relevantJobs.push(jobWithReason);
    } else {
      filteredJobs.push(jobWithReason);
    }
  }

  const results = {
    analyzed: new Date().toISOString(),
    total: jobs.length,
    relevant: relevantJobs.length,
    relevantJobs,
    filteredJobs,
  };

  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));

  console.log(`Analysis complete:`);
  console.log(`  Total jobs:     ${results.total}`);
  console.log(`  Relevant:       ${results.relevant}`);
  console.log(`  Filtered out:   ${results.filteredJobs.length}`);
  console.log(`  Analyzed at:    ${results.analyzed}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
