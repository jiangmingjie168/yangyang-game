# Optional Buddy brain

Node **22+**, no npm dependencies. The game stays a single offline `index.html`.
The service only phrases the game's exercise; the game chooses when to speak,
words, chapter, tier, correctness, rewards and mastery. No deployment has been
performed and no real DeepSeek credentials have been used.

## Local use and tests

```sh
# Empty key is fully functional template mode.
node brain/server.cjs
node --test brain/server.test.cjs
# Browser regression, with the repository served separately on port 19273:
python3 -m http.server 19273 --bind 127.0.0.1
# In another shell, with Playwright + Chromium already installed:
PLAYWRIGHT_MODULE=/path/to/node_modules/playwright node tests/brain-v2.cjs
PLAYWRIGHT_MODULE=/path/to/node_modules/playwright node tests/chinese-cleanup.cjs
PLAYWRIGHT_MODULE=/path/to/node_modules/playwright node tests/playthrough.cjs
```

`server.test.cjs` and `tests/brain-v2.cjs` use local fake DeepSeek HTTP servers
and fake recognition/TTS. The browser suite grants Chromium local-network
permission only to reach its local mock services. Their dummy authorization value is not a real API key.
No tests need a provider account or internet. Timeout tests shorten the deadline;
production defaults are 6000 ms for the **whole** upstream attempt/retry budget,
and 6500 ms in the game including network transit. Request, body read and retry
share one abort deadline. API failures immediately use templates. Invalid model
JSON/content gets one corrective retry, then templates. There is no logging of
credentials, child replies, model content or request bodies.

## Contract

`POST /buddy`, `Content-Type: application/json`, max body 8 KiB:

```json
{
  "event": "fish",
  "scene": "water",
  "chapter": 3,
  "target_word": "fish",
  "options": ["fish", "wood"],
  "learned_words": ["fish", "wood", "water"],
  "turn": 0,
  "tier": 1,
  "feedback": "prompt"
}
```

Response (same in AI/template modes):

```json
{"say":"Fish or wood?","options":["fish","wood"],"answer":"fish","done":false}
```

- `event`: `task|fish|pet|boat|scene`; `scene`: ASCII location slug; chapter 1–3.
- `tier` optional (default 1): 1 choices, 2 picture naming, 3 sentence imitation.
- `feedback` optional (default `prompt`, or `retry` when `child_said` is present): `prompt|retry|success`. **The game**
  decides success; the model cannot interpret a reply to award progress.
- `child_said` optional, max 160 characters: recognition transcript for phrasing
  only, never trusted as instructions. No audio is uploaded by this service.
- `turn` is zero-based: opening 0; rephrases 1 and 2; turn **3 always closes**
  (`done=true`, no provider call). Thus at most three displayed questions per
  anchor. `success` also always closes. This service is stateless: the game's
  dialogue instance owns the counter and rejects later/stale responses.
- Options must be two distinct known words in the supplied learned whitelist;
  target must be one. Model cannot change their order, answer, tier or done.
- Output must be ASCII English, 1–12 words, with a small fixed scaffold plus
  the supplied option vocabulary. No new content vocabulary is allowed.
  The entire sentence must match a rule-owned tier form, with optional praise:
  tier 1 `<first label> or <second label>?` (optionally `Is this ...?`),
  tier 2 `What's this?` or `What is this?`, tier 3 the template's `I see ... .`
  sentence followed by `Say it!` or `Your turn!`. Closing allows only praise
  and `Keep exploring!` or `Let's keep exploring!`. Praise is required after
  replies and on closing. Extra questions or answer-redirection text are rejected
  even when every word is in the vocabulary whitelist. Invalid
  **input** is HTTP 400; invalid **model output** is repaired or template HTTP 200.
- Successful tier 1 answers (tap or speech) count toward `t1 >= 2`. Only spoken
  successes in tier 2 count toward `t2 >= 2`. Choosing recovery options counts
  as tier 1. Unlocks persist per word in `adventure.levels`, independently of
  missions and quiz stars. Existing review totals are not reinterpreted as speech.
- `adventure.speaking` saves one local record per dialogue invocation, including
  time, event scene, target word, tier, whether a transcript was received, and
  matched spoken word (if any). It stores no raw transcript and retains the
  latest 2000 records. The parent statistics page is left for Run 2.

The official [JSON mode guide](https://api-docs.deepseek.com/guides/json_mode/)
and [chat completions reference](https://api-docs.deepseek.com/api/create-chat-completion/)
describe `response_format: {"type":"json_object"}`. Model availability changes;
set `DEEPSEEK_MODEL` to an available model before enabling the service.

## Linux server behind nginx + HTTPS (instructions only)

1. Install Node 22+ and copy `brain/` to `/opt/block-world/brain`. Use a dedicated
   unprivileged `buddy` user. Do **not** serve this folder as static files.
2. Copy `.env.example` to `/etc/block-world-brain.env`, owned by root, mode 600.
   Set `DEEPSEEK_API_KEY` there only; configure API URL/model and exact game
   origins. Default URL is the official chat completions endpoint. An empty key
   intentionally uses templates without an API call. Never put the env file
   under nginx's web root. Do not put secrets in command arguments or shell history.
3. Example `/etc/systemd/system/block-world-brain.service`:

```ini
[Unit]
Description=Block World optional buddy brain
After=network-online.target

[Service]
User=buddy
Group=buddy
WorkingDirectory=/opt/block-world
EnvironmentFile=/etc/block-world-brain.env
ExecStart=/usr/bin/node /opt/block-world/brain/server.cjs
Restart=on-failure
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true

[Install]
WantedBy=multi-user.target
```

4. nginx: put `limit_req_zone` in the `http` context, and the location in an
   existing HTTPS server block with your valid TLS certificate. Keep Node bound
   to `127.0.0.1`, not a public interface. For example:

```nginx
# http context
limit_req_zone $binary_remote_addr zone=buddy:10m rate=30r/m;

# Inside your existing server { listen 443 ssl; ... }
location = /buddy {
    limit_req zone=buddy burst=8 nodelay;
    client_max_body_size 8k;
    proxy_pass http://127.0.0.1:8787;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_connect_timeout 2s;
    proxy_read_timeout 8s;
    proxy_send_timeout 8s;
}
```

5. After reviewing config, enable the service and nginx yourself. Verify an
   `OPTIONS` request with your game `Origin` and a template POST with an empty
   key first. Then set the server key and restart. In `index.html`, set only the
   **public full HTTPS endpoint** in the top-level `BRAIN_URL` constant, e.g.
   `https://your-buddy-host.example/buddy`. It is empty by default. Never put the
   API key, provider URL or provider model into the webpage.

CORS accepts exact `BRAIN_ALLOWED_ORIGINS`, with no wildcard. It is a browser
origin policy, not authentication; nginx rate limiting constrains public usage.
`file://` usually sends Origin `null`: leave it disallowed and use offline
client templates. If nginx/service is down, the game uses local templates.
Browser speech recognition may itself need internet/permissions, as before;
taps remain available. Real-device recognition, voice quality and touch testing
are separate merge-after checks for Hana/the team.
