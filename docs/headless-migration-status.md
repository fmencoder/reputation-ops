# Headless migration — status

Recorded 2026-09-03, at commit `aadce79` on `claude/fredrick-mendez-reputation-ijjnbq`.

## Root cause, confirmed

The site runs on WordPress.com Free, where Custom CSS is plan-gated. Every rule
in `site/novra.css` was therefore flattened into inline `style` attributes by
`site/build-inline.mjs` and then filtered by the platform sanitiser. An inline
style cannot express a media query, a hover state, a pseudo-element or a
stacking context, so breakpoint-specific composition, art direction, layered
visual environments and interaction states were not weakened by that pipeline —
they were removed from the design before any visitor saw it. The measured
sanitiser strip list (`box-sizing`, `background-clip`, `<style>`, `<picture>`,
`<source>`, inline SVG) is recorded in `site/launch-state.json`.

## What is built

`frontend/` — Next.js 16.3.4, App Router, TypeScript, CSS Modules, real
breakpoints at 620/1024/1440, inline SVG graphic environments. WordPress is the
CMS and nothing else: `frontend/lib/cms` fetches the live REST surface, strips
presentation at the boundary, and falls back to a committed snapshot generated
from the exact payloads that were published.

Verified locally, against the real application in a real browser:

    npm run build      15 routes prerendered (6 pages, 5 articles, sitemap, robots, 404)
    npm run typecheck  clean
    npm run lint       clean
    browser QA         PASS — 28 renders at 390/620/1024/1600

Screenshots for every page at every width: `artifacts/frontend-qa/`.

## What is not done: the hosted preview

A preview deployment exists (see *Deployment recovery* below), but its build
outcome and its pages could not be verified from this environment, so it is not
yet something the founder can be pointed at with any claim attached.

An earlier version of this document named two blockers — that the Vercel GitHub
App could not see the repository, and that the source tree exceeded the
deployment call's payload ceiling. The second is real and was solved with a
gzipped archive that unpacks as the first build step. The first was wrong; the
forensics below give the actual cause.

## Production is untouched

No DNS record, domain assignment, WordPress setting, page, post, permalink,
media item or T0 artefact was changed in this pass. `artifacts/phase0-production-record.json`
records the state that had to be preserved, and the WordPress site is still
serving novraintelligence.com.

## Deployment recovery, 2026-09-03

A preview deployment was created by direct upload:

    https://novra-intelligence-preview-6yqwy56qt-fmencoder.vercel.app
    dpl_Gg2iJHkF8wRic2xAyRk9hAqftLm4

Three files were uploaded: `package.json`, `unpack.mjs`, and `payload.b64` — a
gzipped, base64-encoded JSON archive of 63 source files, expanded by `unpack.mjs`
as the first step of the build command (`node unpack.mjs && next build`). The
archive route exists because the deployment API call is bounded well below the
size of the source tree. Its content is `frontend/` at commit aadce79, plus a
synthetic `.env.production` that points `NEXT_PUBLIC_MEDIA_ORIGIN` at the
WordPress Media Library for the preview only. `content/cms-snapshot.json` was
deliberately left out: Vercel's build network reaches the WordPress REST API, and
if it does not the build fails loudly, which is the invariant we want.

### What the Vercel access actually permits

Forensics, in order:

1. `create_git_project` — three attempts (`novra-intelligence`,
   `novra-intelligence-web`, `novra-preview`). Each reported the project created
   and then the git link unverifiable, with the project atomically rolled back:

       Project "novra-preview" was created (project id: prj_Cd3GjNCf2HmwLaLAEd10aqZVZ7sv),
       but its git link to fmencoder/reputation-ops could not be verified.
       The verification request failed: Vercel API error 404: API error occurred:
       Status 404 Content-Type "application/json; charset=utf-8".
       Body: {"error":{"code":"not_found","message":"Project not found."}}

2. `deploy_to_vercel` to the name `novra-intelligence` — HTTP 403:

       You don't have permission to create a Preview Deployment for this Vercel
       project: novra-intelligence.

3. A one-file probe to an unused name (`novra-scope-probe`) — succeeded, READY.
   A first call to `novra-frontend-preview` — succeeded. A *second* call to that
   same, now-existing project — the identical 403.

The token can create a project together with its first deployment. It cannot
deploy into a project that already exists, and `novra-intelligence` already
existed from step 1. That is the whole blocker: not repository permission, not
the team, not repository visibility.

### What cannot be verified from here

`list_projects`, `get_deployment`, `get_deployment_build_logs`,
`get_project_deployment_protection`, `web_fetch_vercel_url` and
`get_access_to_vercel_url` all fail against the deployments this session created
— 404 "Deployment not found", or "Unable to create shareable URL" — including for
the probe deployment that reported READY. The same token that can create a
deployment cannot read one back.

Direct HTTP is also unavailable: `*.vercel.app` returns 000 from the sandbox, and
the proxy records `connect_rejected` / "gateway answered 403 to CONNECT (policy
denial or upstream failure)" for `vercel.com`, `api.vercel.com` and
`example.vercel.app`. That is an organization policy denial, which the proxy
documentation says to report rather than retry.

So the build outcome and the hosted pages are unverified. Browser QA at
390/620/1024/1600 against the hosted URL was not run and cannot be run from this
environment. The equivalent QA against a local production build of the same
commit did pass — 28 renders in `artifacts/frontend-qa/` — but that is not the
hosted deployment and is not offered as a substitute.

### Left behind

Two throwaway projects, safe to delete in the dashboard: `novra-scope-probe`
(a one-file access probe) and `novra-frontend-preview` (a first call that omitted
`payload.b64`, so its build cannot succeed).
