# Browser performance

One cold import and one warm filtered query were measured for each synthetic CSV on November 26, 2026. Tests used headless Chromium 156.0.8078.79, Node.js 24.22.3, and a managed Linux environment reporting an AMD EPYC 9V74 CPU. The production build was served from local loopback. Each file contained three columns: ISO date, region, and sales.

| Rows | File size | Import and profiling | Apply region filter | Peak browser RSS increase |
| ---: | ---: | ---: | ---: | ---: |
| 10,000 | 158,980 B | 2,521 ms | 315 ms | 314 MiB |
| 100,000 | 1,589,709 B | 2,071 ms | 382 ms | 303 MiB |
| 1,000,000 | 15,896,919 B | 6,599 ms | 1,855 ms | 660 MiB |

Import timing includes starting DuckDB, loading ICU, parsing, profiling and showing the completion message. Query timing includes the Playwright click, debounce, execution and the result panel becoming visible. RSS was sampled every 100 ms for Chrome processes reported by CDP. Summing per-process RSS can count shared pages more than once. These are single runs. The smaller fixture happened to have a slower import on this run.

The 100,000-row synthetic query completed within one second in this Linux test. The 150 ms small-data target was missed. The 1,000,000-row result applies to this narrow fixture and environment. Safari, a reference Mac, Lighthouse, and wide datasets require separate measurements.

With the production preview running, use `npm run benchmark` on Linux.
