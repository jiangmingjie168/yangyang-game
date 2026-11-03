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
