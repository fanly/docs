# Frontend Engineering Standards

## 1. Scope

This standard applies to all React/TypeScript code in this repository, including `app/`, `components/`, `lib/`, and `tests/`.

## 2. Architecture Boundaries

- `app/`: route composition and server/client boundary orchestration only.
- `components/`: presentational and interaction components; no DOCX parsing logic.
- `lib/word/`: domain engine modules for parsing, mapping, and render-apply pipeline.
- `lib/assets/`: external storage integrations.
- `tests/`: behavior-driven tests for parser/mapping/pagination/compatibility.

Rules:

- Keep parsing logic out of UI components.
- Keep DOM mutation strategies centralized in `lib/word/renderApply.ts` and related modules.
- Avoid introducing cross-layer dependencies from `lib/` to `app/`.

## 3. TypeScript Rules

- No `any`. Prefer exact interfaces and discriminated unions.
- Prefer `type` for unions/composition and `interface` for object contracts.
- Export domain contracts from a single module when shared.
- Keep function signatures explicit for public module APIs.

## 4. React and Next.js Rules

- Use App Router conventions.
- Keep server components default; opt into client components only when interactivity is required.
- Do not use `next/dynamic({ ssr: false })` inside server components.
- Isolate browser-only code behind client component boundaries.

## 5. Naming and File Conventions

- Components: `PascalCase.tsx`
- Utilities/modules: `camelCase.ts`
- CSS Modules: `*.module.css`
- Tests: `*.test.ts`

Naming:

- Boolean variables start with `is/has/can/should`.
- Parser functions use `parse*` prefix.
- Render pipeline functions use `apply*` or `render*` prefix.

## 6. Styling Rules

- Prefer CSS Modules over global selectors.
- Use design tokens via CSS custom properties in `app/globals.css`.
- Keep component-local styling in colocated module files.
- Avoid hardcoded magic numbers; extract shared constants.

## 7. Performance Rules

- Prefer incremental block updates over full document rerender.
- Avoid expensive layout thrashing loops; batch DOM reads then writes.
- Keep iframe operations idempotent and scoped.
- Parse DOCX once per upload; reuse computed profile across render passes.

## 8. Testing Rules

- Every new engine feature requires tests in `tests/lib/word/`.
- Add regression tests for discovered fidelity mismatches.
- Keep tests deterministic and independent from network/file system.
- Validate both happy path and fallback path.

## 9. Quality Gates

Run before each push:

```bash
npm run typecheck
npm run lint
npm run test
```

No merge should happen with failing gates.

## 10. Commit and Review

- Use Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`).
- Keep each commit focused and reversible.
- Include rationale for compatibility changes (what Word behavior is being aligned).

## 11. Security and Secrets

- Never commit credential values into source files.
- Access third-party storage credentials only through environment variables.
- Keep client code free of secret-bearing tokens.
