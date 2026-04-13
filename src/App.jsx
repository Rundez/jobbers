import { useState, useEffect, useMemo } from 'react';

const RESULTS_URL = './results.json';

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Simple seeded random based on date string
function getDateSeed(dateStr = new Date().toISOString().slice(0, 10)) {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash << 5) - hash + dateStr.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function pickRandomSeeded(items, seed) {
  if (!items || items.length === 0) return null;
  return items[seed % items.length];
}

function groupByDate(jobs) {
  const groups = {};
  for (const job of jobs) {
    const date = job.datePosted || 'ukjent';
    if (!groups[date]) groups[date] = [];
    groups[date].push(job);
  }
  // Sort dates descending (newest first)
  return Object.entries(groups)
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([date, jobs]) => ({ date, jobs }));
}

function formatDate(dateStr) {
  try {
    return new Date(dateStr).toLocaleDateString('nb-NO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

// ─── Keyword chips helper ─────────────────────────────────────────────────

function extractKeywords(matchReason) {
  if (!matchReason) return [];
  // Skip rejected/filtered jobs entirely
  if (matchReason.includes('avvist') || matchReason.includes('Ingen match') || matchReason.includes('Bare én')) return [];
  const keywords = [];
  // Extract quoted keywords (e.g. "controller", "lektor")
  const quoted = matchReason.match(/"([^"]+)"/g) || [];
  quoted.forEach(m => keywords.push(m.replace(/"/g, '')));
  // Also catch "matematikk/økonomi" suffix even when NOT in quotes (e.g. '... + matematikk/økonomi')
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

function KeywordChips({ keywords }) {
  if (!keywords || keywords.length === 0) return null;
  return (
    <div className="keyword-chips">
      {keywords.map((kw, i) => (
        <span key={i} className="chip">{kw}</span>
      ))}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function JobCard({ job, dimmed = false }) {
  const keywords = extractKeywords(job.matchReason);
  return (
    <a
      href={job.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`job-card${dimmed ? ' job-card--dimmed' : ''}`}
    >
      <div className="job-header">
        <h3>{job.title}</h3>
        <span className="company">{job.company}</span>
      </div>
      <div className="job-meta">
        <span className="location">{job.location}</span>
        <span className="employment">{job.employmentType?.[0] || 'Ikke spesifisert'}</span>
      </div>
      {keywords.length > 0 && <KeywordChips keywords={keywords} />}
      <p className="match-reason">{job.matchReason}</p>
      <span className="apply-link">Søk på FINN →</span>
    </a>
  );
}

function BonusJobCard({ job }) {
  return (
    <a
      href={job.url}
      target="_blank"
      rel="noopener noreferrer"
      className="job-card job-card--bonus"
    >
      <div className="bonus-badge">🎲 Dagens overraskelse</div>
      <div className="job-header">
        <h3>{job.title}</h3>
        <span className="company">{job.company}</span>
      </div>
      <div className="job-meta">
        <span className="location">{job.location}</span>
        <span className="employment">{job.employmentType?.[0] || 'Ikke spesifisert'}</span>
      </div>
      <p className="match-reason">Kanskje noe for deg? 🎲</p>
      <span className="apply-link">Søk på FINN →</span>
    </a>
  );
}

function DayPage({ date, jobs, showFiltered }) {
  return (
    <div className="day-page">
      <div className="day-header">
        <h2>{formatDate(date)}</h2>
        <span className="day-count">{jobs.length} {jobs.length === 1 ? 'jobb' : 'jobber'}</span>
      </div>
      <div className="job-list">
        {jobs.map(job => (
          <JobCard key={job.id} job={job} dimmed={showFiltered} />
        ))}
      </div>
    </div>
  );
}

function Pagination({ currentIndex, totalPages, onPrev, onNext }) {
  if (totalPages <= 1) return null;
  return (
    <div className="pagination">
      <button
        className="page-btn"
        onClick={onPrev}
        disabled={currentIndex === totalPages - 1}
        aria-label="Eldre jobber"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Eldre
      </button>
      <span className="page-indicator">{currentIndex + 1} / {totalPages}</span>
      <button
        className="page-btn"
        onClick={onNext}
        disabled={currentIndex === 0}
        aria-label="Nyere jobber"
      >
        Nyere
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  );
}

function Toggle({ mode, onToggle }) {
  return (
    <div className="toggle-wrap">
      <button
        className={`toggle-btn${mode === 'relevant' ? ' toggle-btn--active' : ''}`}
        onClick={() => onToggle('relevant')}
      >
        Relevante
      </button>
      <button
        className={`toggle-btn${mode === 'all' ? ' toggle-btn--active' : ''}`}
        onClick={() => onToggle('all')}
      >
        Alle
      </button>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="state-card">
      <div className="spinner" />
      <p>Laster jobber…</p>
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <div className="state-card state-card--error">
      <p>Kunne ikke laste jobber: {message}</p>
    </div>
  );
}

function EmptyState({ mode }) {
  return (
    <div className="state-card">
      <p>
        {mode === 'relevant'
          ? 'Ingen relevante jobber funnet.'
          : 'Ingen jobber funnet.'}
      </p>
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRelevant, setShowRelevant] = useState(true);
  const [pageIndex, setPageIndex] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [displayedJobs, setDisplayedJobs] = useState(null);

  // Load data
  useEffect(() => {
    fetch(RESULTS_URL)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(json => {
        setData(json);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // When filter mode or page changes, animate transition
  useEffect(() => {
    if (!data) return;
    setAnimating(true);
    const timeout = setTimeout(() => {
      setDisplayedJobs(data);
      setAnimating(false);
      setPageIndex(0);
    }, 150);
    return () => clearTimeout(timeout);
  }, [showRelevant, data]);

  // Current job list based on filter
  const jobs = useMemo(() => {
    if (!data) return [];
    return showRelevant
      ? (data.relevantJobs || [])
      : [...(data.relevantJobs || []), ...(data.filteredJobs || [])];
  }, [data, showRelevant]);

  // Group by date
  const dayGroups = useMemo(() => groupByDate(jobs), [jobs]);

  // Random job of the day (stable per day via seeded selection)
  const bonusJob = useMemo(() => {
    const filtered = data?.filteredJobs || [];
    if (filtered.length === 0) return null;
    const seed = getDateSeed();
    return pickRandomSeeded(filtered, seed);
  }, [data]);

  // Current page
  const currentPage = dayGroups[pageIndex] || null;

  const handleToggle = (mode) => {
    setShowRelevant(mode === 'relevant');
  };

  const goNext = () => {
    if (pageIndex < dayGroups.length - 1) setPageIndex(i => i + 1);
  };

  const goPrev = () => {
    if (pageIndex > 0) setPageIndex(i => i - 1);
  };

  const filteredCount = (data?.filteredJobs?.length || 0);

  return (
    <div className="app">
      <header>
        <div className="header-top">
          <h1>Jobbmuligheter</h1>
          <p className="subtitle">Lektor med mastergrad i matematikkpedagogikk</p>
        </div>

        {data && (
          <div className="header-controls">
            <Toggle mode={showRelevant ? 'relevant' : 'all'} onToggle={handleToggle} />
            {filteredCount > 0 && (
              <span className="filtered-hint">
                {filteredCount} filtrert bort
              </span>
            )}
          </div>
        )}

        {data && (
          <p className="meta">
            {data.relevant} relevante av {data.total} jobber
            <span className="separator">·</span>
            Oppdatert {new Date(data.analyzed).toLocaleString('nb-NO', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        )}
      </header>

      <main className={animating ? 'main--fading' : 'main--visible'}>
        {loading && <LoadingState />}
        {error && <ErrorState message={error} />}
        {!loading && !error && !currentPage && <EmptyState mode={showRelevant ? 'relevant' : 'all'} />}
        {!loading && !error && currentPage && (
          <>
            <DayPage
              date={currentPage.date}
              jobs={currentPage.jobs}
              showFiltered={!showRelevant && currentPage.jobs.some(j => j.matchReason?.startsWith('Tittel'))}
            />
            {showRelevant && bonusJob && (
              <BonusJobCard job={bonusJob} />
            )}
            <Pagination
              currentIndex={pageIndex}
              totalPages={dayGroups.length}
              onPrev={goNext}
              onNext={goPrev}
            />
          </>
        )}
      </main>

      <footer>
        <p>Data fra <a href="https://www.finn.no" target="_blank" rel="noopener noreferrer">FINN.no</a></p>
      </footer>
    </div>
  );
}
