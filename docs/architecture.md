# Architecture decisions

## Static client with a worker-owned dataset

Next.js emits static HTML for every public route. A Web Worker owns DuckDB-Wasm, imported bytes and record tables. App controls send typed queries to that worker. There is no analytics server or credential requirement. Build-time downloads of the pinned ICU and Parquet extensions are verified against SHA-256. The deployed app retrieves those extensions and the basemap from its own origin.

Each import stages a separate worker. An import replaces the current workspace only after format validation, profiling and preview succeed. Failed imports preserve the previous file and workspace. Cancellation invalidates the pending operation and terminates its worker once available.

## Typed query contract

The Zod schemas in `src/contracts.ts` define versioned dataset, query, result, fact, card and workspace data. The query compiler resolves fields against the actual schema, quotes identifiers and binds all filter and selection values. Dates accept ISO strings. Source values without an offset are interpreted as UTC, while filter boundaries without an offset use the selected timezone. Calendar bucketing uses the selected IANA timezone. Raw timestamps use UTC. User files are never treated as executable SQL.

An aggregate and its contributing row count use the same query definition. Rows with missing or invalid X values are excluded. Missing or invalid measures follow the selected exclusion or zero policy. Histograms show record counts across 12 equal-width bins over the filtered range. Maps group records by numeric longitude and latitude. Geographic coordinates outside their valid ranges are excluded. A snapshot has a 5,000-group display cap and each evidence preview returns at most 100 matching rows.

Baseline calculations run independently of the current query. The comparison uses both complete filter states and checks that they share a compatible row domain, measure, aggregation, unit, and missing-value policy. Selecting a mark changes the evidence and source records for that mark.

## Snapshot and export

IndexedDB stores a versioned project and the source Blob together, in one transaction. The editable storyboard keeps its captured query and results when the source is replaced or its types are corrected. A change to source bytes or column types marks the captured evidence stale. Transport bundles validate the recorded file length, SHA-256 and column names before restoring. CSV export quotes fields and neutralizes spreadsheet formula prefixes. Story HTML uses escaped content with a restrictive content security policy and a 2 MiB limit.

A production service worker caches previously fetched files, including engine assets. Versioned Next.js assets are served from cache when available. Pages, data snapshots, and other mutable files are refreshed from the network while connected and use the saved response while offline. Cache versions are derived from the full export and scoped to this deployment path. Offline reload is available once the route and its required assets have been fetched under service-worker control. Browser eviction and quota policies can remove cached assets or local workspaces. Export project JSON for a portable copy.
