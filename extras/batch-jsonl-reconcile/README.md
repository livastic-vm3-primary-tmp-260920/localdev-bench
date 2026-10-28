# Batch JSONL Result Matcher — browser-only utility

Original, dependency-free MIT JavaScript under the same license as this repository.

**Running public application:** https://devtools.trendbridged.com/batch-jsonl-reconcile/

**Korean:** https://devtools.trendbridged.com/ko/batch-jsonl-reconcile/

**Practical seven-step guides with three downloadable fictional JSONL files:**
[English](https://devtools.trendbridged.com/guides/reconcile-openai-batch-jsonl/)
· [한국어](https://devtools.trendbridged.com/ko/guides/reconcile-openai-batch-jsonl/).
The guides are informational pages with a *separate, explicit opt-in-only*
advertising preference; the matcher itself has **no ads or data upload**.

OpenAI Batch output rows can arrive out of order and failures can appear in a separate `error_file_id` download. The matcher reads your original input JSONL, success output JSONL and error JSONL in your browser, matches records by **exact `custom_id`**, and creates a CSV review listing succeeded, failed, not-found, duplicate and unexpected IDs plus line numbers. It does not assume result row order. It accepts up to 8 MiB / 25,000 lines per file, versus the larger limits in the actual Batch API.

The tool is independent from OpenAI and **does not connect to OpenAI's API**, know your Batch job status, or check whether you downloaded all result files. **Not-found means absent from the provided files**, not guaranteed unprocessed. It does not certify model outputs, billing, API acceptance or complete downloads. The examples are entirely fictional, and production API keys should never be entered. The standard status and issues CSV reports display and export **no** input prompt or response body. An **additional, explicitly acknowledged manual failed-request JSONL download** is different: it intentionally preserves the full original request line, including any prompts and sensitive data, **only in a locally downloaded file**. The tool never uploads this file or calls an API. It excludes successes, unobserved/missing, duplicate and unknown results. Users must independently confirm terminal provider Batch state, failure causes, possible charges and duplicate execution risk before taking any manual retry action. CSV exports quote cells and neutralize spreadsheet formula injection in IDs.

## Larger Batch JSONL files: free local streaming CLI (Node.js 22+)

The browser UI is intentionally capped at **8 MiB / 25,000 lines per file**.
OpenAI's real Batch API may accept an input file up to **200 MB** and up to
**50,000 requests**. For jobs exceeding the browser limit, this directory now
includes a **zero-dependency, offline streaming `cli.mjs`**. It uses bounded
per-line memory and retains only request IDs / line references—not prompts or
provider response bodies—in the report data structures. Files never leave the
user's computer; no OpenAI, Adsterra, tracking or other network calls occur.

With the [MIT source repository](https://github.com/livastic-vm3-primary-tmp-260920/localdev-bench)
cloned locally, run the following (replace paths with files downloaded from
*your own* completed or interrupted Batch operation):

```sh
node extras/batch-jsonl-reconcile/cli.mjs \
  --input /private/requests.jsonl \
  --output /private/output.jsonl \
  --errors /private/errors.jsonl \
  --report-dir ./new-local-batch-review
```

`--output` and `--errors` are optional individually, but **at least one**
actual result/error file must be provided. `--report-dir` **must not already
exist**; the CLI creates it privately (0700), produces `matches.csv`,
`issues.csv`, and `summary.json` with private 0600 permissions and refuses to
overwrite prior results. It streams each file, supports up to 220 MiB of input
and 350 MiB for each result/error file, with a 16 MiB maximum JSONL line and
100,000-line fail-closed limit. The caps protect the local process, not a
promise of provider acceptance. The CLI has no npm dependencies or account
sign-in. It will not certify terminal Batch state, billing, model correctness,
complete result downloads or whether an absent ID was actually unprocessed.

**Optional risky manual review:** Only if you independently checked the
terminal provider Batch state, failure cause, extra costs and duplicate-charge
risks, add **both** flags:

```sh
  --manual-failed-only --confirm-provider-state-and-cost
```

Then, and only when reconciliation has **zero structural/mapping issues**, it
creates `failed-original-requests-MANUAL-REVIEW.jsonl` containing *uniquely
matched explicit provider/HTTP failures*. This is **not an automatic retry**.
Successful, absent-from-provided-files, duplicate, unexpected, unknown and
invalid requests are **never** inferred as safe for replay. The manual file
intentionally **contains the original full prompt/request body** (potentially
sensitive); store it securely and never share it without reviewing its data.
Other CSV/JSON reports contain request IDs and line numbers only, and CSV
formula-injection payloads from arbitrary `custom_id` values are neutralized.

Run the actual streamed CLI tests, including out-of-order results, duplicate
fail-closed mapping, explicit acknowledgment, private file permissions,
**26,000 streamed rows**, a **9 MiB** local sample, invalid UTF-8, a
16 MiB per-line hard stop, and a missing model safety check:

```sh
node --test extras/batch-jsonl-reconcile/cli.test.mjs
```

The running [English free Batch reconciliation guide](https://devtools.trendbridged.com/guides/reconcile-openai-batch-jsonl/)
and [한국어 실전 가이드](https://devtools.trendbridged.com/ko/guides/reconcile-openai-batch-jsonl/)
provide a guided smaller browser example and non-technical explanation. The
informational guides have a separate *optional, consent-only* banner, but the
browser matcher, CLI and GitHub source are ad-free.

The hosted two-language utility uses local CSS and ES modules only with restrictive `Content-Security-Policy` (`connect-src 'none'` and `form-action 'none'`). File content is never transmitted, persisted or used for tracking. This route has **no advertisement scripts**. The separate informational homepages and the Batch guide can show an optional
independently consented Adsterra banner, while all processing workspaces are
ad-free. No payment, account or advertising consent is needed to use this matcher.

Source files:

- `core.mjs`: pure `reconcileBatch`, `rowsCsv`, and `issuesCsv` functions.
- `app.mjs`: event-driven file/paste UI logic. The published bundle changes its import from `./core.mjs` to `./batch-reconcile-core.mjs` without modifying source behavior.
- `style.css`: local responsive utility styles.
- `core.test.mjs`: unit tests for matching, errors, privacy and CSV sanitization.
- `manual-retry.test.mjs`: eight tests for failed-only browser export, duplicates, missing/unknown, invalid input and sensitive Unicode.
- `cli.mjs`: independent no-dependency Node.js 22+ local streaming CLI for larger JSONL files.
- `cli.test.mjs`: thirteen local CLI integration tests (private CSVs, strict UTF-8, high-volume streams, failed-only safeguards).
- `examples/`: three fully fictional input/output/error JSONL files. No valid model,
  API token or real personal information is included; do not submit as live jobs.

Run the logic suite locally using Node.js 22+:

```sh
node --test extras/batch-jsonl-reconcile/core.test.mjs extras/batch-jsonl-reconcile/manual-retry.test.mjs extras/batch-jsonl-reconcile/cli.test.mjs
```

Official reference: https://developers.openai.com/api/docs/guides/batch .

No code or ads are inserted into GitHub Pages by this extra source directory; its commercial-capable running service is hosted separately at `devtools.trendbridged.com`.
