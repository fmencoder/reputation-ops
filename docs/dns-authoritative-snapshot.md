# novraintelligence.com — authoritative DNS snapshot

Captured 2026-09-19 by direct UDP/53 queries to the domain's own authoritative
nameservers. **Read-only. Nothing was changed.**

Earlier passes reported that the live zone could not be read from this
environment. That was wrong, and worth correcting: HTTPS egress to the domain is
blocked by policy, but the system resolver on port 53 is not. The zone below is
the live one, read from the authority rather than from a cache or from
WordPress.com's dormant copy.

## Authority

    nameservers   ulla.ns.cloudflare.com  (172.64.32.233)
                  igor.ns.cloudflare.com  (173.245.59.119)
    SOA           igor.ns.cloudflare.com dns.cloudflare.com
    DNS provider  Cloudflare
    registrar     not determinable from DNS — see "what is still needed"

The WordPress.com API separately reports `has_wpcom_nameservers: false`,
`domain_type: domain_connection`, `can_manage_name_servers: false`, which agrees:
WordPress.com holds a dormant copy of the zone and is not the authority.

## Records observed

| Name | Type | TTL | Value | Touched by cutover? |
| --- | --- | --- | --- | --- |
| `novraintelligence.com` | SOA | 1800 | `igor.ns.cloudflare.com dns.cloudflare.com` | No |
| `novraintelligence.com` | NS | 21600 | `igor.ns.cloudflare.com` | No |
| `novraintelligence.com` | NS | 21600 | `ulla.ns.cloudflare.com` | No |
| `novraintelligence.com` | A | **300** | `192.0.78.24` (WordPress.com) | **Yes** |
| `novraintelligence.com` | A | **300** | `192.0.78.25` (WordPress.com) | **Yes** |
| `www.novraintelligence.com` | CNAME | **300** | `novraintelligence.com` | **Yes** |
| `_domainconnect.novraintelligence.com` | TXT | 3600 | `api.cloudflare.com/client/v4/dns/domainconnect` | No |

Both apex A records are **DNS-only (grey cloud)** — the WordPress.com origin IPs
are returned directly, so Cloudflare is not proxying this domain.

**TTL on every record the cutover touches is already 300 seconds.** No TTL
lowering step is required, and rollback propagates in about five minutes.

## Mail: no records exist

This contradicts the stated premise that `fmendez@novraintelligence.com` is on
Zoho Mail, so it was checked three ways with a working control.

| Query | Result |
| --- | --- |
| `MX novraintelligence.com` via `ulla` (authoritative) | `ENODATA` |
| `MX novraintelligence.com` via `igor` (authoritative) | `ENODATA` |
| `MX novraintelligence.com` via system resolver | `ENODATA` |
| `TXT novraintelligence.com` (SPF would live here) | `ENODATA` |
| `TXT _dmarc.novraintelligence.com` | `ENOTFOUND` |
| DKIM: 11 selectors probed (`zoho`, `zmail`, `zohomail`, `default`, `s1`, `s2`, `google`, `selector1`, `selector2`, `k1`, `mail`) | none exist |
| Zoho/mail hostnames probed (`zb`, `zmverify`, `mail`, `smtp`, `imap`, `pop`, `autodiscover`, `autoconfig`, `_zohoverify`, …) | none exist |
| **Control:** `MX zoho.com` via the same resolver | resolves normally |

`ENODATA` means the name exists but holds no record of that type. The control
proves MX lookups work through this path, so the empty results are the zone's
state, not a query failure.

**Consequence.** With no MX record, RFC 5321 §5.1 has senders fall back to the
domain's A record — currently WordPress.com's web servers, which do not accept
mail for this domain. Inbound mail to `@novraintelligence.com` should therefore
already be failing, today, before any cutover.

**This is not caused by the migration and will not be fixed by it.** It also
means the "preserve the Zoho records" requirement is, right now, vacuous —
there are none to preserve. If Zoho records are added before cutover, the
proposed change still does not touch them: it touches only the apex `A` records
and the `www` record.

## Subdomains

Of 44 probed names, only `www` exists. A probe is not an enumeration —
Cloudflare refuses zone transfers, so a complete list can only come from the
Cloudflare dashboard export.

## What is still needed

1. **A Cloudflare zone export** (Cloudflare → DNS → Records → Export). This is
   the authoritative complete list and the real rollback artefact; the table
   above is a probe, however careful.
2. **The registrar.** DNS is at Cloudflare, but the registrar may be elsewhere.
   Only needed if nameservers ever change — the cutover below does not.
3. **Vercel's required records.** Not obtainable without adding the domain to
   the Vercel project, which was not done: it is a change to the project and
   was outside the read-only scope of this gate.
4. **Confirmation of where `fmendez@novraintelligence.com` is actually
   delivered**, given the finding above.
