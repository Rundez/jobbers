import { useState, useEffect } from 'react';

const RESULTS_URL = '/results.json';

function JobCard({ job }) {
  return (
    <a href={job.url} target="_blank" rel="noopener noreferrer" className="job-card">
      <div className="job-header">
        <h3>{job.title}</h3>
        <span className="company">{job.company}</span>
      </div>
      <div className="job-meta">
        <span className="location">{job.location}</span>
        <span className="date">{new Date(job.datePosted).toLocaleDateString('nb-NO')}</span>
      </div>
      <p className="match-reason">{job.matchReason}</p>
      <span className="apply-link">Søk på FINN →</span>
    </a>
  );
}

function LoadingState() {
  return (
    <div className="loading">
      <div className="spinner" />
      <p>Laster jobber...</p>
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <div className="error">
      <p>Kunne ikke laste jobber: {message}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="empty">
      <p>Ingen relevante jobber funnet ennå.</p>
      <p className="hint">Sjekk tilbake senere eller oppdater søket.</p>
    </div>
  );
}

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  return (
    <div className="app">
      <header>
        <h1>Jobbmuligheter</h1>
        <p className="subtitle">Lektor med mastergrad i matematikkpedagogikk</p>
        {data && (
          <p className="meta">
            {data.relevant} relevante av {data.total} jobber
            <span className="separator">·</span>
            Oppdatert {new Date(data.analyzed).toLocaleString('nb-NO')}
          </p>
        )}
      </header>

      <main>
        {loading && <LoadingState />}
        {error && <ErrorState message={error} />}
        {!loading && !error && data && data.jobs.length === 0 && <EmptyState />}
        {!loading && !error && data && data.jobs.length > 0 && (
          <div className="job-list">
            {data.jobs.map(job => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </main>

      <footer>
        <p>Data fra <a href="https://www.finn.no" target="_blank" rel="noopener noreferrer">FINN.no</a></p>
      </footer>
    </div>
  );
}
