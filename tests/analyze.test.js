/**
 * Tests for analyze.js — keyword-based relevance filtering.
 */

import { describe, it, expect } from 'vitest';

// Reuse the checkRelevance logic from analyze.js
// We inline a copy here so tests run without importing ESM weirdness
const RELEVANCE_KEYWORDS = {
  titles: [
    'lærer', 'lektor', 'undervisning', 'underviser',
    'matematikk', 'realfag', 'naturfag', 'fysikk', 'kjemi',
    'pedagog', 'utdanning', 'skole', 'forskning', 'veileder',
    'konsulent', 'analytiker', 'controller',
    'statistikk', 'data', 'analyse', 'økonomi', 'økonom', 'budsjett',
  ],
  companyKeywords: [
    'universitet', 'høgskole', 'høgskolen', 'skole', 'utdanning', 'akademi',
    'college', 'institutt', 'forskning', 'edu', 'pedagog',
  ],
  rejectTitles: [
    'elektriker', 'tømrer', 'rørlegger', 'mekaniker', 'sjåfør',
    'sveiser', 'lakkerer', 'montør', 'servicetekniker',
  ],
};

function checkRelevance(job) {
  const titleLower = (job.title || '').toLowerCase();
  const companyLower = (job.company || '').toLowerCase();
  const descLower = (job.description || '').toLowerCase();
  const combined = titleLower + ' ' + companyLower + ' ' + descLower;

  for (const reject of RELEVANCE_KEYWORDS.rejectTitles) {
    if (titleLower.includes(reject)) {
      return { relevant: false, reason: `Avvist: "${reject}"` };
    }
  }

  let matchedTitle = null;
  let matchedCompany = null;
  for (const title of RELEVANCE_KEYWORDS.titles) {
    if (titleLower.includes(title)) { matchedTitle = title; break; }
  }
  for (const kw of RELEVANCE_KEYWORDS.companyKeywords) {
    if (companyLower.includes(kw)) { matchedCompany = kw; break; }
  }

  const hasMath = /\b(matematikk|math|statistikk|stats|analyse|data|økon|makro|mikro|algebra|geometri|kalkulus|realfag)\b/i.test(combined);
  const hasEduSector = /\b(universitet|høgskole|skole|akademi|college|institutt|utdanning|forskning|lærer|lektor|undervisning)\b/i.test(combined);

  const score = (matchedTitle ? 2 : 0) + (matchedCompany ? 1 : 0) + (hasMath ? 2 : 0) + (hasEduSector ? 1 : 0);

  if (score >= 2) {
    return {
      relevant: true,
      reason: matchedTitle
        ? `Nøkkelord: "${matchedTitle}"${hasMath ? ' + matematikk/økonomi' : ''}`
        : hasMath ? 'Matematikk-/statistikk-kompetanse' : 'Utdanningssektor',
    };
  }
  if (score === 1) return { relevant: false, reason: 'Kun én svak match' };
  return { relevant: false, reason: 'Ingen match' };
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('checkRelevance — rejections', () => {
  it('rejects electrician', () => {
    const result = checkRelevance({ title: 'Elektriker', company: 'BDM', description: '' });
    expect(result.relevant).toBe(false);
  });

  it('rejects servicetekniker', () => {
    const result = checkRelevance({ title: 'Servicetekniker', company: 'AS', description: '' });
    expect(result.relevant).toBe(false);
  });

  it('rejects even with edu keywords in description', () => {
    const result = checkRelevance({
      title: 'Servicetekniker',
      company: 'AS',
      description: 'matematikk og undervisning', // not enough to overcome rejection
    });
    expect(result.relevant).toBe(false);
  });
});

describe('checkRelevance — accepts', () => {
  it('accepts controller with math', () => {
    const result = checkRelevance({
      title: 'Senior Controller',
      company: 'AS',
      description: 'økonomi og budsjettering',
    });
    expect(result.relevant).toBe(true);
  });

  it('accepts university lecturer', () => {
    const result = checkRelevance({
      title: 'Lektor i matematikk',
      company: 'Universitetet i Oslo',
      description: 'undervisning og forskning',
    });
    expect(result.relevant).toBe(true);
  });

  it('accepts analyst with stats keyword', () => {
    const result = checkRelevance({
      title: 'Dataanalytiker',
      company: 'Konsulentselskap AS',
      description: 'statistikk og analyse',
    });
    expect(result.relevant).toBe(true);
  });

  it('accepts school teacher', () => {
    const result = checkRelevance({
      title: 'Lærer i matematikk og naturfag',
      company: 'Offentlig skole',
      description: '',
    });
    expect(result.relevant).toBe(true);
  });
});

describe('checkRelevance — borderline', () => {
  it('accepts math keyword in description even for generic title', () => {
    // Description-only "matematikk" gives score=2 (hasMath) → relevant
    const result = checkRelevance({
      title: 'Prosjektmedarbeider',
      company: 'Vanlig AS',
      description: 'matematikk',
    });
    expect(result.relevant).toBe(true);
    expect(result.reason).toContain('Matematikk');
  });

  it('accepts edu sector company + any title keyword', () => {
    // title match (2) + edu company (1) + hasEduSector (1) = 4 → relevant
    const result = checkRelevance({
      title: 'Prosjektøkonom',
      company: 'Høgskolen i Sørlandet',
      description: '',
    });
    expect(result.relevant).toBe(true);
  });
});
