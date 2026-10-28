# Batch JSONL Result Matcher — browser-only utility

Original, dependency-free MIT JavaScript under the same license as this repository.

**Running public application:** https://devtools.trendbridged.com/batch-jsonl-reconcile/

**Korean:** https://devtools.trendbridged.com/ko/batch-jsonl-reconcile/

OpenAI Batch output rows can arrive out of order and failures can appear in a separate `error_file_id` download. The matcher reads your original input JSONL, success output JSONL and error JSONL in your browser, matches records by **exact `custom_id`**, and creates a CSV review listing succeeded, failed, not-found, duplicate and unexpected IDs plus line numbers. It does not assume result row order. It accepts up to 8 MiB / 25,000 lines per file, versus the larger limits in the actual Batch API.

The tool is independent from OpenAI and **does not connect to OpenAI's API**, know your Batch job status, or check whether you downloaded all result files. **Not-found means absent from the provided files**, not guaranteed unprocessed. It does not certify model outputs, billing, API acceptance or complete downloads. The examples are entirely fictional, and production API keys should never be entered. It displays and exports no input prompt or response body. CSV exports quote cells and neutralize spreadsheet formula injection in IDs.

The hosted two-language utility uses local CSS and ES modules only with restrictive `Content-Security-Policy` (`connect-src 'none'` and `form-action 'none'`). File content is never transmitted, persisted or used for tracking. This route has **no advertisement scripts**. The separate information homepage on the Cloudflare site has optional, explicitly accepted Adsterra advertising, while all processing workspaces are ad-free. No payment, account or advertising consent is needed to use this matcher.

Source files:

- `core.mjs`: pure `reconcileBatch`, `rowsCsv`, and `issuesCsv` functions.
- `app.mjs`: event-driven file/paste UI logic. The published bundle changes its import from `./core.mjs` to `./batch-reconcile-core.mjs` without modifying source behavior.
- `style.css`: local responsive utility styles.
- `core.test.mjs`: unit tests for matching, errors, privacy and CSV sanitization.

Run the logic suite locally using Node.js 22+:

```sh
node --test extras/batch-jsonl-reconcile/core.test.mjs
```

Official reference: https://developers.openai.com/api/docs/guides/batch .

No code or ads are inserted into GitHub Pages by this extra source directory; its commercial-capable running service is hosted separately at `devtools.trendbridged.com`.
