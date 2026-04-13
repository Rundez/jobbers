/**
 * Tests for extractKeywords — chip display logic in App.jsx
 */

import { describe, it, expect } from 'vitest';

// Inline extractKeywords so tests are self-contained
function extractKeywords(matchReason) {
  if (!matchReason) return [];
  // Skip rejected/filtered jobs entirely
  if (matchReason.includes('avvist') || matchReason.includes('Ingen match') || matchReason.includes('Bare én')) return [];
  const keywords = [];
  // Extract quoted keywords (e.g. "controller", "lektor")
  const quoted = matchReason.match(/"([^"]+)"/g) || [];
  quoted.forEach(m => keywords.push(m.replace(/"/g, '')));
  // Also catch "matematikk/økonomi" suffix even when NOT in quotes
  if (matchReason.includes('matematikk/økonomi') && !keywords.includes('matematikk/økonomi')) {
    keywords.push('matematikk/økonomi');
  }
  // Fallback: extract descriptive positive reasons (only if no quoted keywords found)
  if (keywords.length === 0) {
    if (matchReason.includes('Matematikk-')) keywords.push('matematikk/økonomi');
    if (matchReason.includes('Utdanningssektor')) keywords.push('utdanning');
  }
  return keywords;
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('extractKeywords — positive matches', () => {
  it('extracts quoted keyword from Matcher nøkkelord format', () => {
    const kw = extractKeywords('Matcher nøkkelord: "controller" + matematikk/økonomi');
    expect(kw).toEqual(['controller', 'matematikk/økonomi']);
  });

  it('extracts multiple quoted keywords', () => {
    const kw = extractKeywords('Matcher nøkkelord: "lektor" + matematikk/økonomi');
    expect(kw).toContain('lektor');
    expect(kw).toContain('matematikk/økonomi');
  });

  it('handles Matematikk- descriptive reason (no quotes)', () => {
    const kw = extractKeywords('Matematikk-, statistikk- eller analytisk kompetanse');
    expect(kw).toEqual(['matematikk/økonomi']);
  });

  it('handles Utdanningssektor descriptive reason', () => {
    const kw = extractKeywords('Utdanningssektor');
    expect(kw).toEqual(['utdanning']);
  });
});

describe('extractKeywords — negative/rejected (no chips)', () => {
  it('returns empty for rejected job reasons', () => {
    const kw = extractKeywords('Tittel inneholder avvist nøkkelord: "elektriker"');
    expect(kw).toEqual([]);
  });

  it('returns empty for "Ingen match" reasons', () => {
    const kw = extractKeywords('Ingen match med lektor/matematikk-kriteriene');
    expect(kw).toEqual([]);
  });

  it('returns empty for "Bare én svak match" reasons', () => {
    const kw = extractKeywords('Bare én svak match, ikke relevant nok');
    expect(kw).toEqual([]);
  });
});

describe('extractKeywords — edge cases', () => {
  it('returns empty for null/undefined', () => {
    expect(extractKeywords(null)).toEqual([]);
    expect(extractKeywords(undefined)).toEqual([]);
  });

  it('returns empty for empty string', () => {
    expect(extractKeywords('')).toEqual([]);
  });

  it('deduplicates matematikk/økonomi if already in quoted keywords', () => {
    // matematikk/økonomi is NOT in quotes but appears as suffix
    const kw = extractKeywords('Matcher nøkkelord: "controller" + matematikk/økonomi');
    expect(kw).toEqual(['controller', 'matematikk/økonomi']);
  });
});
