# LocalDev Bench — 8 free, original developer utilities (EN/한국어)

**Live English:** https://livastic-vm3-primary-tmp-260920.github.io/localdev-bench/

**Live Korean:** https://livastic-vm3-primary-tmp-260920.github.io/localdev-bench/ko/

Eight working browser-only tools based on common developer tasks—not copied
from a competitor's protected code, layout or branding. Every input is
processed in the browser. No login, cookies, analytics, advertising scripts,
network API requests, account credentials, backend service or npm dependencies.

1. **Regex Tester**: JavaScript patterns and flags, named capture groups,
   offsets, match highlighting, replacement preview. Untrusted expressions
   run in an isolated Worker killed after a short timeout.
2. **Cron Explainer**: Standard five-field Unix cron, numeric wildcards,
   lists and step intervals; five next run times in UTC or device-local time,
   explicit day-of-month/weekday OR rules. No Quartz/EventBridge assumptions.
3. **Unix Timestamp Converter**: Seconds/milliseconds, negative Unix
   epochs, explicit unit and Z/offset ISO input; UTC and Seoul display.
4. **JWT Decoder**: Decode three-part JWT header and payload and annotate
   exp/nbf claims. **Does not verify cryptographic signatures**; the demo
   uses a fictional string. Do not paste live bearer credentials.
5. **UTF-8 Base64**: Unicode text encode/decode with strict input padding
   and invalid UTF-8 errors. Text-only, not encryption or binary files.
6. **URL Encoder & Query Inspector**: Percent encoding/decoding of
   components and duplicate-preserving query parameter inspection
   without opening or fetching the inspected URL.
7. **UUID v4 Generator**: 1 to 100 new cryptographically random UUID v4
   strings using secure built-in crypto.randomUUID.
8. **JSONL / NDJSON Validator**: Per-line JSON parser with exact error
   line numbers, type/count summary and locally downloaded JSON array
   only when every nonempty line passes.

Every utility has an independent real EN/KO page, use-case explanation,
multiple genuine limitations, three FAQ answers, unique title/description,
canonical and hreflang. Original front-end HTML/CSS, no copycat scraping.

## Traffic and revenue honesty

A competitor's popularity proves that a broad task exists; it does
**not** prove that our new domain will rank, receive real human visitors
or earn money. The publicly reported September 2026 Semrush estimate
for regex101.com is about 482,330 visits, which is third-party modeled
traffic for that COMPETITOR, NOT analytics for our tool:
https://www.semrush.com/website/regex101.com/overview/
GCHQ CyberChef is a long-running open-source example of demand for
encoding/transformation workflows: https://github.com/gchq/CyberChef .
It is not the source of our code.

This free GitHub Pages repo is **not** the original Adsterra-approved
tools.trendbridged.com domain and does not load Adsterra ads. The
JSONL/CSV related pages include an honest contextual link to the
separate original **free** LocalCSV Lab tools whose informational
pages offer optional ads only if a visitor affirmatively consents;
separate file editors are ad-free. We don't force redirect, demand
ad clicks, monetize sensitive JWT content, or request own ads.

The original site's last authenticated Adsterra dashboard showed
$0.00 balance with 123 period impressions, all Linux/Chrome/KR
Desktop, potentially dominated by owner QA; this new development
cannot be called "new revenue". Hosting credit guard prevents new
Netlify production deploy on the original site until actual available
credits are sufficient for a safe deployment. No purchases or paid ads.

## Build and test

Requires Python 3.11+ and Node.js 22+. No npm install needed.

Commands:
  python3 scripts/build_site.py
  python3 scripts/build_site.py --check
  node --test
  node scripts/browser-smoke.mjs

Source of pure core logic: src/core.mjs
Reproducible production copy: docs/assets/core.mjs
Original browser UI: docs/assets/app.mjs
Regex sandbox: docs/assets/regex-worker.mjs
Bilingual 18 canonical pages and sitemap in docs/.
GitHub Pages is published from main:/docs with HTTPS enforced.

This project keeps no browser storage and sends no user input
to server endpoints. GitHub Pages may receive ordinary HTTP
request metadata to serve static files. The regex Web Worker is
terminated after a short deadline; security-critical production
regex must still be reviewed. JWT claim decoding never verifies
issuer, signature, audience or authorization. Test with fictional
data, never customer secrets.

MIT licensed. Maintained by LocalCSV Lab contributors.
