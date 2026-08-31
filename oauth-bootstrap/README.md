# NOVRA OAuth bootstrap

A temporary, single-purpose service that mints a WordPress.com access token for
the deployment pipeline and shows it once. **Delete it once the token is stored.**

It exists so nobody has to paste a client secret into a browser tool, build a
Shortcut, or hand an authorization code to a chat assistant. The code and the
secret meet only inside a server-side function.

## Endpoints

    GET /api/wordpress/oauth/start      mint state, redirect to WordPress
    GET /api/wordpress/oauth/callback   verify state, exchange, validate, show once

## Environment variables

Set through the hosting provider's encrypted store. Never in a file, never in
git, never in a build log.

| Name | Value |
| --- | --- |
| `NOVRA_WP_CLIENT_ID` | `147112` |
| `NOVRA_WP_CLIENT_SECRET` | human-held; never printed or requested in chat |
| `NOVRA_WP_OAUTH_REDIRECT_URI` | the deployed callback URL, character-for-character |
| `NOVRA_WP_SITE` | `novraintelligence.com` |

`NOVRA_WP_OAUTH_REDIRECT_URI` must match the value registered on the WordPress
application exactly — WordPress compares the string, and a trailing slash
difference fails the exchange with an unhelpful error.

## What it deliberately does not do

- **No scope parameter.** WordPress.com issues a token scoped to one site when
  no scope is requested. `scope=global` would return a token valid for every
  site on the account; a deployment token for one site has no business reaching
  the others.
- **No writes.** Validation is a single GET against the site endpoint. A token
  proven by creating a test page is a token that leaves a test page behind.
- **No storage.** No database, no KV, no session. The state is signed rather
  than stored, which is also why deleting this service leaves nothing behind.
- **No logging of the code, the secret, or the token.** Every error path runs
  through `scrub()` before anything reaches a response body.

## One thing the platform does that this cannot prevent

Vercel's request logs record the request line, and on the callback that line
contains `?code=…`. The authorization code is single-use and is spent by the
exchange microseconds later, so the exposure window is small — but it is real,
and it is a platform behaviour, not something this code can turn off.

It is one more reason to delete the project as soon as the token is stored.

## Removing it

1. Confirm `NOVRA_WP_ACCESS_TOKEN` is stored in the GitHub `production`
   environment and that a deploy dry run authenticates with it.
2. Delete the Vercel project. That removes the only deployment holding the
   client secret.
3. Optionally remove the callback URL from the WordPress application.

The access token keeps working. It does not depend on this service existing —
that is the point of bootstrapping rather than proxying.

## Tests

`test/novra/oauth.test.ts` in the repository root. Fake credentials, mocked
WordPress, no network.

    npm test
