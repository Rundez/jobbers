# FINN Job Analyzer Agent

Du kjører etter at `scripts/fetch-jobs.js` har kjørt og `public/jobs-raw.json` eksisterer.

## Oppgaver

### 1. Les rå jobbdata
Les `public/jobs-raw.json`. Inneholder `{ fetched, count, jobs }` der hver jobb har:
- `id`, `title`, `company`, `location`, `description`, `url`, `datePosted`

### 2. Analyser jobbene
For hver jobb i `jobs-raw.json`, avgjør om den er relevant for en **lektor med mastergrad i matematikkpedagogikk** (tenk "white collar" - undervisning, utdanning, statistikk, analyse, kursing, consulting, corporate training, etc.).

Regler for inkludering:
- RELEVANT hvis tittelen eller beskrivelsen inneholder: undervisning, matematikk, statistikk, analyse, data, kurs, opplæring, pedagogikk, lærer, lektor, utdanning, konsulent, treningsprogram, coaching, regnskap, økonomi, kvantitativ, research, forskning, Excel, modellering, rapport, presentasjon
- IKKE RELEVANT hvis: elektriker, helse, sjåfør, lager, produksjon, butikk, håndverker, servitør, renhold, operative roller, fysisk arbeid

Vær konservativ - ta med jobber som *kan* være relevante selv om det er uklart.

### 3. Skriv results.json
Skriv til `public/results.json`:
```json
{
  "analyzed": "<ISO timestamp>",
  "total": <count from jobs-raw>,
  "relevant": <count of relevant jobs>,
  "jobs": [
    {
      "id": "<finn job id>",
      "title": "<job title>",
      "company": "<company name>",
      "location": "<location>",
      "url": "https://www.finn.no/job/ad/<id>",
      "datePosted": "<date>",
      "matchReason": "<1-2 setninger som forklarer hvorfor dette er relevant>"
    }
  ]
}
```

### 4. Ferdig
Ikke gjør noe mer. cron jobben tar seg av bygg og deploy.
