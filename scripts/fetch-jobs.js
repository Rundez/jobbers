import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = 'https://www.finn.no/job/search';
const PARAMS = 'location=2.20001.20007.20110&location=2.20001.20007.20125&published=1';

const outputDir = path.join(__dirname, '../public');
const outputPath = path.join(outputDir, 'jobs-raw.json');

async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml',
          'Accept-Language': 'nb-NO,nb;q=0.9',
        }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

function extractJobIds(html) {
  const matches = html.match(/card-(\d+)/g);
  if (!matches) return [];
  return [...new Set(matches.map(m => m.replace('card-', '')))];
}

async function fetchJobDetails(jobId) {
  const html = await fetchWithRetry(`https://www.finn.no/job/ad/${jobId}`);
  const ldJsonMatch = html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/);
  if (!ldJsonMatch) return null;
  let data;
  try {
    data = JSON.parse(ldJsonMatch[1]);
  } catch {
    return null;
  }
  if (data['@type'] !== 'JobPosting') return null;
  return {
    id: jobId,
    title: data.title,
    company: data.hiringOrganization?.name,
    location: data.jobLocation?.address?.addressLocality,
    description: (data.description || '').replace(/<[^>]+>/g, '').trim(),
    url: `https://www.finn.no/job/ad/${jobId}`,
    datePosted: data.datePosted,
    employmentType: data.employmentType,
    requirements: null,
  };
}

async function main() {
  console.log(`Fetching FINN job search page...`);
  const html = await fetchWithRetry(`${BASE_URL}?${PARAMS}`);
  const jobIds = extractJobIds(html);
  console.log(`Found ${jobIds.length} job IDs: ${jobIds.join(', ')}`);

  const jobs = [];
  for (const id of jobIds) {
    try {
      console.log(`Fetching job ${id}...`);
      const job = await fetchJobDetails(id);
      if (job) {
        jobs.push(job);
        console.log(`  ✓ ${job.title} @ ${job.company}`);
      } else {
        console.log(`  ✗ No JobPosting data for ${id}`);
      }
    } catch (err) {
      console.error(`  ✗ Failed to fetch ${id}: ${err.message}`);
    }
    await new Promise(r => setTimeout(r, 300));
  }

  fs.mkdirSync(outputDir, { recursive: true });
  const payload = { fetched: new Date().toISOString(), count: jobs.length, jobs };
  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2));
  console.log(`\nSaved ${jobs.length} jobs to ${outputPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
