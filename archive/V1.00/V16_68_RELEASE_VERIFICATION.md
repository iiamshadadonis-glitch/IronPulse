# V16.68 Release Verification

Verification is performed against the V16.68 working tree and repeated against a clean extraction of the final ZIP.

## Package/static checks

- All JavaScript files pass `node --check`.
- All relative JavaScript imports resolve.
- All local Admin `src` / `href` references in `public/admin/index.html` resolve to existing files.
- No existing V16.67 file is removed.
- The V16.67 AI table schema is SQLite-compatible, and V16.68's runtime column additions are verified against an existing V16.67 table.
- Targeted V16.68 implementation assertions pass.
- Final ZIP integrity is checked with `unzip -t`.
- The final ZIP is extracted to a clean directory and JavaScript/import/Admin-reference checks are repeated.

## Functional AI checks

- OpenAI model discovery uses `/v1/models`, filters non-chat model families, and caches model IDs.
- Gemini model discovery keeps only models advertising `generateContent`.
- Anthropic model discovery reads `/v1/models` model IDs.
- Per-flow model IDs are sent to the provider generation request.
- Per-flow system instructions are sent to the provider request.
- Legacy integration-level system prompts are not injected into new V16.68 AI generation requests.
- A disabled-but-configured provider can be Test Connected before it is enabled.
- A provider cannot be enabled until Test Connection succeeds.

## UI/Flow Builder checks

- AI providers use themed collapsed integration cards and summary statuses.
- The shared themed information control and circular back control are used.
- Provider help is brand-aware and solution-oriented.
- Built-in integration cards no longer show a Model field or Default system instructions field.
- AI Response blocks show a Chat model dropdown.
- AI Response blocks show System instructions for this flow.
- `aiModel` is normalized, validated and persisted in flow definitions.

## Recorded working-tree results

- JavaScript syntax: **279 files, 0 errors**.
- Relative JavaScript imports: **310 checked, 0 missing**.
- Admin local JS/CSS/assets references: **147 checked, 0 missing**.
- Targeted V16.68 assertions: **31/31 passed**.
- OpenAI/Gemini/Anthropic mocked model-discovery + per-flow generation test: **passed**.
- Test Connection while provider is disabled: **passed**.
- Runtime AI schema upgrade from V16.67 table shape: **passed**.

## Final package verification

- Clean extraction JavaScript syntax: **279 files, 0 errors**.
- Clean extraction relative imports: **310 checked, 0 missing**.
- Clean extraction Admin local references: **147 checked, 0 missing**.
- Final package file count: **583 files**.
- ZIP archive integrity: **passed; no compressed-data errors**.
