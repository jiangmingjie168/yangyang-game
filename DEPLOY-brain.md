# Block World brain deployment

HTTPS enabled and verified on 2026-11-03 at `134.175.152.39`.
Production endpoint: `https://brain.yydriver.cn/buddy`.
The frontend `BRAIN_URL` points to this endpoint on `codex-brain-v2`.

- Service: `/etc/systemd/system/yangyang-brain.service`, enabled at boot.
- Runtime: Node 22.23.4 in `/opt/node`; executable `/usr/local/bin/node`.
- Application: `/opt/yangyang-brain/server.cjs`, user/group `yangyang-brain`.
- Secrets: `/opt/yangyang-brain/.env`, owned by `root:root`, mode `600`, read
  by systemd through `EnvironmentFile` for the unprivileged service.
  Never copy this file into the repo or frontend.
- Listener: **127.0.0.1:8787 only**, enforced by `HOST` and `PORT` in the
  service environment. The unit uses privilege restrictions, a read-only
  filesystem, a private temporary directory, and a 256 MiB memory limit.
- Separate nginx vhost: `/etc/nginx/conf.d/brain.yydriver.cn.conf`.
  On HTTPS, only `/buddy` proxies to Node; unrelated paths return 404. Request bodies
  are limited to 8 KiB, with 2-second connect / 8-second proxy timeouts and
  30 requests/minute per IP (burst 10, excess returns 429).
- Existing backups: `/root/backups/yangyang-brain-20261103/`.
  Neither `/etc/nginx/conf.d/huanrui.conf` nor `/etc/nginx/nginx.conf` was changed.
- ACME webroot: `/var/www/brain-acme`; HTTP challenge requests remain available
  under `/.well-known/acme-challenge/`. All other HTTP paths redirect to HTTPS.
- Let's Encrypt certificate: `/etc/letsencrypt/live/brain.yydriver.cn/fullchain.pem`.
  Private key: `/etc/letsencrypt/live/brain.yydriver.cn/privkey.pem` (server only).
  Issued with certbot webroot on the first attempt, valid from
  **2026-11-03 09:37:11 UTC** to **2027-02-01 09:37:10 UTC**.
  The vhost allows TLS 1.2 and 1.3; `nginx -t` passed before reload.
- Pre-HTTPS vhost backup:
  `/root/backups/yangyang-brain-20261103/brain.yydriver.cn.conf.pre-https-103621`.
- Renewal: existing enabled `certbot-renew.timer`; the existing deploy hook
  `/etc/letsencrypt/renewal-hooks/deploy/huanrui-nginx.sh` tests nginx before reload.

Allowed CORS origins:

- `https://tesla.yydriver.cn`
- `https://jiangmingjie168.github.io`
- `https://cdn.jsdelivr.net`

Validation: all 36 backend tests passed. Three public HTTPS POSTs, one per tier,
returned HTTP 200 in approximately 1.1–1.2 seconds with exactly
`say/options/answer/done`, validated against the backend rules. The production
DeepSeek key is configured; an additional tiny provider diagnostic returned
HTTP 200 and valid model JSON. The public replies matched the local templates,
so their content alone does not distinguish model phrasing from fallback.
All three allowed origins passed HTTPS preflight with 204 and the exact
`Access-Control-Allow-Origin`; a disallowed origin returned 403 without that
header. Invalid payloads returned 400; unrelated HTTPS paths returned 404;
HTTP `/buddy` redirected with 301. A fresh ACME test file was served over HTTP
with 200 and no redirect, then removed. Public TLS certificate verification passed.
No credentials or full request/response content were printed.

The browser regression suite (`tests/brain-v2.cjs`) passed, including all tiers,
corrective retry, response validation, network failure, timeout and offline
fallback. Its fixture overrides the configured endpoint with local mocks; it
does not send test dialogue to production. The game retains its local template
fallback when offline or when the brain is unavailable.

Verified unchanged SHA-256 for `/etc/nginx/conf.d/huanrui.conf`:
`029421438a7ea303a249697b28c8a239ecdb216091b5ced11a06a689ad463e14`.

After pushing, verify the committed frontend using
`https://cdn.jsdelivr.net/gh/jiangmingjie168/yangyang-game@<commit-sha>/index.html`.
Only `codex-brain-v2` is used for this deployment; `main` is untouched.

Operations: `systemctl status yangyang-brain`, `systemctl restart yangyang-brain`,
and `ss -lntp 'sport = :8787'`. To disable the optional frontend brain, set
`BRAIN_URL` to an empty string on the feature branch; the game retains its local
fallback. Stop the service with `systemctl disable --now yangyang-brain`.


## Blocking/context voice deployment — 2026-11-03

Updated `/opt/yangyang-brain/server.cjs` on `codex-brain-v2` with bounded recent
context, contextual/non-repeating provider acceptance and CORS-exposed provenance.
Response JSON remains `say/options/answer/done`; old clients remain compatible.
All 40 server tests passed on the deployment host before restarting
`yangyang-brain`, which reports active. Real HTTPS POSTs covered all three tiers;
the recorded browser scenario accepted 7 brain responses and 1 template.

Original application backup:
`/root/backups/yangyang-brain-gate-ai-20261103T110838Z/app`.
Additional pre-quality-gate backup:
`/root/backups/yangyang-brain-gate-ai-context-v2/app`.
Only named code/docs/test files were rsynced, excluding `.env`. The environment
file was compared byte-for-byte with the original backup and is unchanged.
`huanrui.conf` retained its previously recorded SHA-256. No nginx files changed.

See `CHANGES-brain-v2.md`, `tests/brain-ratio.cjs`, and the two
`screens/brain-ratio-*.json` traces for the measurement method and limitations.

## Mario welcome deployment — 2026-11-03

Added the validated `greet` event with first/returning and local time-of-day
context; existing exercise contracts remain compatible. Before copying code,
backed up `/opt/yangyang-brain` to
`/root/backups/yangyang-brain-greeting-20261103T113906Z/app` (root-only parent).
Rsync copied only `server.cjs` and `server.test.cjs`. All 42 server tests passed
on the host before restarting `yangyang-brain`; the service is active.

Deployed server SHA-256:
`acd0df64f2ed824f1b59cac40bcf45e1b19815aee9586500645872cd11708f21`.
`.env` was compared byte-for-byte to the backup and remains root:root mode 600.
The huanrui.conf SHA-256 still matches the original recorded hash; no nginx
configuration was changed.

Four real HTTPS requests returned 200 with `X-Buddy-Source: brain` and
`X-Buddy-Reason: validated`, each passing local server validation with Mario,
first/returning context and morning/afternoon/evening. Observed latencies were
0.75–2.44 seconds. HTTPS preflight was 204 for jsDelivr, invalid greeting input
was 400, and a legacy fish exercise returned a validated 200 response.
`screens/greeting-smoke.json` records the actual greeting texts and provenance;
no secrets or child recordings were included. Headless TTS is synthetic; device
voice/touch acceptance remains a device check.

## fix-brief-v3 voice/input release — 2026-11-03

Deployed brain code and the 120-file audio sample from `codex-brain-v2`.
The frontend fix is delivered by the commit-pinned preview; this deployment
changes the brain endpoint, not the older frontend at tesla.yydriver.cn.

- Backup before overwrite:
  `/root/backups/yangyang-brain-fix-v3-20261103T142546Z/app`, plus the brain vhost
  in its parent backup directory. Parent permissions are 700.
- Copied only `server.cjs`, `server.test.cjs`, `lines-manifest.json`,
  `requirements-voice.txt`, `voice-review.html`, `scripts/`, and `audio/` into
  `/opt/yangyang-brain`. No `.env` was copied or printed.
- All **51 backend tests pass on the deployment host**. Restarted
  `yangyang-brain` (active). Added only `/audio/` proxying to the existing Node
  process in `/etc/nginx/conf.d/brain.yydriver.cn.conf`; tested nginx, then reloaded.
  This route serves hashed MP3s and `index.json` with the service's existing
  origin allowlist. Existing `/buddy` request limits are unchanged.
- Protected `huanrui.conf`, shared `/etc/nginx/nginx.conf` and `.env` compare
  byte-for-byte by SHA-256 with their pre-deployment state. `.env` remains 600.
  Nothing in 欢蕊 was modified.
- Deployed server SHA-256:
  `8b1502d50294519b6610abca2df41c64674c329cfd1e48691638ee3cd24205a5`.
- Public HTTPS smoke: **13/13 validated brain replies**, including all exercise
  tiers, matching/mismatching event context, unnamed/named greeting, social,
  weather, recasts and closing. Eight replies include a playable `audio_url`;
  fetched MP3 bytes equal the local files. All 120 index entries are available;
  jsDelivr-origin preflight returns 204. Named greeting without a generated full
  line omits audio metadata. Evidence: `screens/fix-v3-smoke.json`.

To regenerate the full library on a deployment host, create a Python venv,
install `requirements-voice.txt`, run `node scripts/build-lines.cjs` from a full
repository checkout (the builder reads the client), and run
`python scripts/generate-voice.py` with no limit. The committed manifest can
also be used directly by the Python generator without the client checkout.
`--limit 120` reproduces the sample. Generator output reports line count, MP3
count and exact byte count. Keep `audio/index.json` with the MP3s when copying.
The application can be backed up and updated with the same named-file rsync;
repeat backend tests, restart the service, and check HTTPS audio/CORS. No further
nginx changes are necessary. Missing MP3s continue to use browser speech.

Rollback: restore only the backed-up application files/audio directory and brain
vhost, test nginx, restart `yangyang-brain`, then reload nginx. Preserve `.env`
and leave all other virtual hosts untouched.
