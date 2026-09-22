# Contact inquiry form — architecture, configuration and limits

Added 2026-09-22 on `claude/novra-founder-worldmap-0rf06p`. **The form is built,
validated and tested, but it cannot deliver mail until the two environment
variables below are set — and it cannot deliver to its own default destination
until the domain publishes an MX record.** Both are stated up front because a
contact form that silently fails is worse than no contact form.

---

## 1. Shape

    browser (components/ContactForm.tsx, client)
      -> POST /api/contact/            (app/api/contact/route.ts, nodejs runtime)
         -> validateContact()          (lib/contact/schema.ts, shared with the client)
            -> deliverInquiry()        (lib/contact/mailer.ts, server only)
               -> Resend HTTPS API
                  -> contact@novraintelligence.com

`lib/contact/schema.ts` is the same module on both sides. The browser runs it to
put a message next to the offending field; the route runs it again and trusts
only its own result. Client validation is a convenience and never a gate.

Nothing is persisted. No table, no queue, no file: an inquiry exists in the
mailbox it was addressed to and nowhere else. The runtime log records delivery
faults — status codes and the provider's own words — never the visitor's
address and never the message body.

## 2. Required configuration

Set on the Vercel project, not in the repository. Neither is `NEXT_PUBLIC_`;
both are read only on the server.

| Variable | Required | What it is |
| --- | --- | --- |
| `RESEND_API_KEY` | **Yes** | Resend API key. Without it the route answers 502 and the form shows its error state. |
| `CONTACT_FROM_EMAIL` | **Yes** | The `From:` address. Must be on a domain verified with Resend. |
| `CONTACT_INBOX` | No | Overrides the destination. Defaults to the `contact@novraintelligence.com` constant in `frontend/lib/site.ts`. |

Neither required variable is set anywhere today — not in the repository, not in
the sandbox, and not on the Vercel project (checked: the project has no
environment variables at all). **No test send has been made, and no claim of
inbox delivery is made anywhere in this repository.**

## 3. The blocker: the destination cannot receive mail yet

Read from the live zone on 2026-09-22:

    MX  novraintelligence.com  -> NONE (ENODATA)
    TXT novraintelligence.com  -> NONE (ENODATA)

Two consequences, and they are independent:

1. **`contact@novraintelligence.com` cannot receive mail.** With no MX record,
   a sending provider has nowhere to deliver and will reject or bounce. Setting
   `RESEND_API_KEY` alone will not produce a message in anybody's inbox.
2. **No domain-verified sender exists.** Resend verifies a sending domain with
   SPF and DKIM records. With no TXT records at all, `CONTACT_FROM_EMAIL`
   cannot yet be an address at `novraintelligence.com`.

This matches what the founder already stated — email is not activated for the
domain and its absence is expected — so it is recorded here as a prerequisite,
not raised as a defect. Until mail is activated, `CONTACT_INBOX` can point the
form at a mailbox that does work.

To bring the form live, in order:

1. Activate mail for the domain (MX records) so the destination can receive.
2. Verify the sending domain with Resend (SPF/DKIM) and set `CONTACT_FROM_EMAIL`.
3. Set `RESEND_API_KEY`.
4. Submit one clearly-marked test inquiry and confirm it arrives.

Step 4 is the only thing that establishes delivery. Nothing before it does.

## 4. Abuse controls, and what they do not cover

| Control | Where | Strength |
| --- | --- | --- |
| Honeypot field | Hidden, unfocusable, `aria-hidden` | Catches indiscriminate form-fillers. A filled honeypot gets a 200 and no send, so a bot is not taught which field to skip. |
| Timing check | Rejects under 2s since render | Weak. The elapsed time is reported by the client and can be forged. Free, so it is kept; never relied on. |
| Length caps | Server-side, `lib/contact/schema.ts` | Hard. Bounds what can reach the provider. |
| Body size cap | 64KB, route handler | Hard. |
| Rate limit | 5 per 10 minutes per IP | **Best effort only — see below.** |

**The rate limit is per serverless instance.** It is an in-memory `Map`, and
Vercel runs several instances and recycles them, so a sender spread across
instances gets more than five and a cold start forgets everything. It stops the
accidental double-click and the single-source flood. It does not stop a
distributed sender.

Doing it properly needs shared state — Vercel KV, Upstash, Redis — which is a
new paid dependency. That was deliberately not introduced without approval, so
the limitation is documented here instead. If the form attracts real abuse, that
is the upgrade, and it is a small one: the check is a single function in
`app/api/contact/route.ts`.

No CAPTCHA. The stated audience is institutional, a CAPTCHA is a real cost to
that reader, and nothing yet justifies it.

## 5. Security properties worth keeping

- **The destination is not user-controllable.** It comes from a server constant
  or a server variable, never from the request. `test/novra/contact-form.test.ts`
  submits `to`, `destination`, `recipient` and `CONTACT_INBOX` in the payload
  and asserts none of them reaches the provider.
- **The visitor's address is `Reply-To` only**, never a recipient. Asserted.
- **CR/LF and other control characters are stripped** from every single-line
  field, so a subject cannot become a second header. Delivery is over a JSON
  API rather than raw SMTP, so this is defence in depth rather than the only
  guard — but a sanitiser that depends on the transport never changing is one
  that breaks quietly when it does.
- **Visitor content is HTML-escaped** in the HTML part of the notification.
- **No credential reaches the browser.** The mailer is never imported by a
  client component, and a test greps the built client chunks for
  `RESEND_API_KEY`, `CONTACT_FROM_EMAIL` and `api.resend.com`.

## 6. CSP change

`form-action` moved from `'none'` to `'self'` in `frontend/next.config.mjs`.

The form submits with `fetch`, which `'none'` would not have blocked. The reason
for the change is the no-JavaScript path: a `<form>` whose script never ran falls
back to a native submit to its own URL, and under `'none'` that is blocked with
no message and nothing in the page to explain it. `'self'` keeps the property
worth having — no submission can be redirected to an origin this site does not
control.

The `next.config.mjs` comment that said "revisit this if a form is added" was
the instruction; this is the revisit.

## 7. Verification performed

| Check | Result |
| --- | --- |
| `test/novra/contact-form.test.ts` | 25 tests against the real route handler |
| Local production build, live route | 405 on GET, 400 on malformed, 400 with field errors, 200-no-send on honeypot, 502 uncredentialed |
| `npm run qa:contact` | 4 states, keyboard order, no trap, 4 widths |
| axe (`npm run qa:a11y`) | 0 violations, contact page included |
| `npm run qa:keyboard` | `/contact/`: 7 form controls, 0 unlabelled |
| Contrast | error 8.77:1 / 8.46:1, success 12.50:1 / 12.07:1 on the two surfaces used |
| Client bundle grep | no credential name under `.next/static/` |
| **Live mail delivery** | **Not attempted. No credentials exist to attempt it with.** |
