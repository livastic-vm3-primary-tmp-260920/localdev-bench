# LocalDev Bench — 8 core developer tools + free Batch JSONL matcher (EN/한국어)

**Live English (Trendbridge):** https://devtools.trendbridged.com/

**한국어 바로 사용:** https://devtools.trendbridged.com/ko/

**Ad-free educational source demos:** [English](https://livastic-vm3-primary-tmp-260920.github.io/localdev-bench/) · [한국어](https://livastic-vm3-primary-tmp-260920.github.io/localdev-bench/ko/)

Eight original working browser-only tools based on common developer tasks;
not copied from another product's proprietary source or branding.
**All processing remains entirely in the browser.** No account, API
credentials, file upload, cookies or analytics are required. On the branded
site, the two informational homepages each offer a **single Adsterra 300×250
banner only after affirmative, optional visitor consent**, with equal Decline
access. The separate Batch troubleshooting guide has its **own independent
opt-in preference**. **All 18 data-processing tool pages are ad-free**, regardless
of advertising consent on informational pages.
The GitHub Pages code/demo itself has no ads or tracking.

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

## New: Match OpenAI Batch JSONL results by custom_id (free)

**[Live English](https://devtools.trendbridged.com/batch-jsonl-reconcile/)** · **[한국어 무료 도구](https://devtools.trendbridged.com/ko/batch-jsonl-reconcile/)** · [MIT source and tests](extras/batch-jsonl-reconcile/)

OpenAI Batch API result rows can arrive in a different order from their input
requests, and failed rows can be stored in a separate error file. The additional
standalone **browser-local Batch JSONL Result Matcher** joins the original input,
output and error JSONL files by their exact `custom_id` value, catches missing,
duplicate, unexpected and failed records, and downloads local CSV reviews with
line numbers. The example demonstrates two successes out of order and one error.

This add-on is offered on the existing **Adsterra-approved commercial-compatible
Cloudflare site**; it is not an ad-supported GitHub Pages application. **The Batch
file processing pages themselves contain zero advertising or analytics**, never
upload file contents, require no account and make no API requests. The separate
branded EN/KO landing pages retain their optional visitor-consent-only banner.
Try the complete [English Batch troubleshooting walkthrough](https://devtools.trendbridged.com/guides/reconcile-openai-batch-jsonl/)
or [한국어 가이드](https://devtools.trendbridged.com/ko/guides/reconcile-openai-batch-jsonl/) for seven practical
steps, four fictional requests and three downloadable input/output/error JSONL files.
Only the guides, not the file-processing pages, offer a *separately consented*
optional ad banner. Declining advertising never restricts the files or matcher.
No action on this site can confirm an actual OpenAI batch status or current
Publisher revenue. Follow the [official Batch guide](https://developers.openai.com/api/docs/guides/batch)
for provider acceptance and job-level status.

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

### Where the ads run (and do not run)

- **Branded commercial deployment:** https://devtools.trendbridged.com/ —
  independently approved Adsterra Publisher site ID **6156887**, with one
  approved Active 300×250 banner unit **31964651**. The informational
  **EN/KO homepages** have an Allow/Decline choice. The independent
  [English](https://devtools.trendbridged.com/guides/reconcile-openai-batch-jsonl/)
  and [한국어](https://devtools.trendbridged.com/ko/guides/reconcile-openai-batch-jsonl/)
  Batch troubleshooting guides provide a separate **guide-only** Allow/Decline
  preference, which does not inherit earlier homepage consent. No third-party
  ad request occurs before an affirmative choice or after Decline. Provider
  partners may process device/browser data if Allow is chosen.
- **16 original tool-editor pages + 2 Batch reconciliation pages:** remain
  completely ad-free and browser-local even after opting in on the homepage.
- **GitHub Pages code/demo:** free and ad-free, not the commercial hosting
  for the approved Publisher site. The repository's canonical homepage
  and intended entry point is the branded Trendbridge host.
- **Existing CSV/JSON service:** https://tools.trendbridged.com/ is a
  separate already-approved Adsterra website whose informational landing
  pages also require explicit advertising consent and whose editors remain
  ad-free.

The production deployment uses Cloudflare Pages Direct Upload; the original
source and ad-free demo remain reproducible from this public repository. The
Cloudflare build adds optional advertising only to informational homepages and
the separate Batch guide under independent consent, plus a maintained
MIT Batch JSONL result matcher from `extras/`, and the site-specific
Publisher-approved banner configuration. We do
not force redirects, incentivize advertising clicks, spoof visits, embed
ads in token inspection or file editors, or fabricate search traffic.

**Revenue and audience status:** A new website and advertising approval
do not prove real human visitors, Google organic clicks, valid advertising
impressions or earnings. These must be checked in first-party Search
Console and Adsterra Publisher reports after real users discover the site.

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
Bilingual 18 source/demo pages and sitemap in docs/. GitHub Pages is
published from main:/docs as an **ad-free source demo** with HTTPS.
The independent commercial Cloudflare Pages deployment uses the branded
domain and publishes its **own branded canonical/hreflang and 20-URL sitemap**
(18 original pages plus two standalone Batch result reconciliation pages).

The underlying tool application stores no user processing inputs and
sends no user data to server endpoints. The separate consent controller on
the branded informational homepages and guide can store only their
respective Allow/Decline choices locally; it does not store pasted tool data. Hosts may process ordinary
HTTP metadata when serving files. The regex Web Worker is
terminated after a short deadline; security-critical production
regex must still be reviewed. JWT claim decoding never verifies
issuer, signature, audience or authorization. Test with fictional
data, never customer secrets.

MIT licensed. Maintained by LocalCSV Lab contributors.
