# Optional Buddy brain

Node **22+**, no npm dependencies. The game stays a single offline `index.html`.
The service only phrases the game's exercise; the game chooses when to speak,
words, chapter, tier, correctness, rewards and mastery. Production deployment details are in `../DEPLOY-brain.md`. Credentials remain server-only.

## Local use and tests

```sh
# Empty key is fully functional template mode.
node brain/server.cjs
node --test brain/server.test.cjs
# Browser regression, with the repository served separately on port 19273:
python3 -m http.server 19273 --bind 127.0.0.1
# In another shell, with Playwright + Chromium already installed:
PLAYWRIGHT_MODULE=/path/to/node_modules/playwright node tests/brain-v2.cjs
PLAYWRIGHT_MODULE=/path/to/node_modules/playwright node tests/greeting.cjs
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

Start/resume welcomes use a separate rule-owned event (no vocabulary exercise):

```json
{"event":"greet","child_name":"Mario","time_of_day":"morning","returning":false,"greeting_id":0,"last_greeting":""}
```

`time_of_day` is `morning|afternoon|evening`, `returning` is a boolean,
`greeting_id` is an optional 0–3 fallback selector, and `last_greeting` is optional
ASCII text of at most 200 characters. The optional name uses the same two-word
English-name validation as exercises. The game defaults empty/missing names to
Mario and saves parent edits locally. The response keeps the JSON envelope:

```json
{"say":"Hi Mario. I'm so happy you're here. Let's build something together!","options":[],"answer":null,"done":true}
```

The AI combines exactly one supplied name/time lead, one first/returning warmth
phrase, and one invitation. Both validators check the entire sentence, exact
name, ASCII English, at most 20 words/200 characters, empty options, null answer,
true done, and no repeat of `last_greeting` (case-insensitive). The greeting-only
length allowance does not loosen the 12-word exercise rules. Greetings share
existing request budgets, deadlines, one correction, and source headers.
Offline templates rotate four IDs and exclude the previous saved line. The
nonmodal welcome has a “Let's play!” button, dismisses after TTS plus 900 ms
(14-second fallback deadline after the final line), and yields to movement or
other game taps. Dismissal aborts its request and ignores late replies. Greeting
TTS reuses the English voice path at rate 0.82, volume 0.75, pitch 1.03; real voice
quality depends on the device. Welcomes do not create mastery or speaking credit.

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
- Legacy `turn` is zero-based: opening 0; rephrases 1 and 2; turn **3 always closes**
  (`done=true`, no provider call). Thus at most three displayed questions per
  anchor for legacy clients. The blocking client counts misses separately, caps request turns at 2, and reveals the answer locally after three misses. It requires a repeat/tap confirmation; it never sends turn 3 for an unanswered prompt. `success` always closes. This service is stateless: the game's
  dialogue instance owns the counter and rejects later/stale responses.
- Options must be two distinct known words in the supplied learned whitelist;
  target must be one. Model cannot change their order, answer, tier or done.
- Output must be ASCII English, 1–12 words, with a small fixed scaffold plus
  the supplied option vocabulary and exact context phrases. No other content
  vocabulary is allowed.
  The entire sentence must match a rule-owned tier form, with optional praise and one exact validated context lead:
  tier 1 `<first label> or <second label>?` (optionally `Is this ...?`),
  tier 2 `What's this?` or `What is this?`, tier 3 the template's `I see ... .`
  sentence followed by `Say it!` or `Your turn!`. Closing allows only praise
  and an optional context lead followed by `Keep exploring!` or `Let's keep exploring!`. Praise is required after
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
   `https://your-buddy-host.example/buddy`. This branch defaults to `https://brain.yydriver.cn/buddy`; an empty string disables requests. Never put the
   API key, provider URL or provider model into the webpage.

CORS accepts exact `BRAIN_ALLOWED_ORIGINS`, with no wildcard. It is a browser
origin policy, not authentication; nginx rate limiting constrains public usage.
`file://` usually sends Origin `null`: leave it disallowed and use offline
client templates. If nginx/service is down, the game uses local templates.
Browser speech recognition may itself need internet/permissions, as before;
taps remain available. Real-device recognition, voice quality and touch testing
are separate merge-after checks for Hana/the team.

## Blocking client and contextual voice (2026-11-03)

The child cannot close an unanswered prompt. Physics, world controls, background
clicks, keyboard play and the old 24-second dismissal are blocked. Parent settings
preserve the prompt and provide **跳过本题** without reward or speech credit.
Three misses reveal the target; confirmation is still required. Recognition
failure, permission denial, empty results, unavailable APIs and the 8-second
watchdog all offer picture choices and **I said it**. Self-confirmation never
counts as recognized speech or unlocks spoken tiers. Success closes after praise.

Additional optional request fields, bounded and checked before calling the model:

- `child_name`: ASCII English nickname, one or two words, 1–16 letters per word.
- `recent_events`: up to six `{action, word}` entries; action is
  `found|made|built|met|caught|rode|task|scene`, and word must be learned.
- `last_answer`: a previously answered learned word.
- `spoken_word`: a matched word from the two current options; arbitrary transcript
  content cannot become an acknowledgment or affect correctness.
- `recent_lines`: up to four ASCII lines, each at most 160 characters.

The server constructs exact context phrases from these facts, for example
`Alex, you found wood!`, `You made a table!`, `Remember wood?`, and `You said fish!`.
The client independently constructs and validates the same phrases. Arbitrary
transcripts remain untrusted data. Provider output with available context must
use one allowed phrase and avoid repeating any recent line; otherwise it receives
one corrective retry and then the usual template fallback. Praise, exercise,
answer, options, completion, ASCII and the **12-word total** limit remain checked.
Legacy clients without these fields retain their existing exercise forms.

JSON response fields remain exactly `say/options/answer/done`. The HTTP response
adds CORS-exposed `X-Buddy-Source: brain|template` and `X-Buddy-Reason` headers.
`brain` means actual provider output passed validation and contextual quality
checks, even if its words happen to match a template. The client counts rejected
JSON, offline, network errors, timeouts, local retries and budgets as templates;
old servers without provenance count as unknown. `BW.adventure().brain` and the
Chinese parent panel expose session counters without changing child UI.

The client makes at most eight requests/minute and sixty requests per tab session,
with budgets in `sessionStorage` so refresh does not reset them. Retries/hints are
local. Pending previews stay silent so only the final response is read.
Model output remains capped at 180 tokens; the whole upstream retry budget
is still six seconds, with a 6.5-second client timeout. Existing nginx IP limits
remain in force. All budgets keep usable local answer buttons.

The English nickname is saved in the existing v1 save under optional `child_name`.
Raw transcripts, recent activity and recent AI lines are not added to the save.
The parent panel explains that the optional online brain receives the nickname,
game context and recognition text. Audio is never uploaded by this service.

Additional checks:

```sh
PLAYWRIGHT_MODULE=/path/to/playwright node tests/blocking-ai.cjs
# Synthetic fixtures + actual game input; AFTER uses public HTTPS:
PLAYWRIGHT_MODULE=/path/to/playwright node tests/brain-ratio.cjs
# BEFORE must run before deployment; uses the deployed module via authorized SSH
# and instruments accepted provider JSON without reading credentials into logs:
PLAYWRIGHT_MODULE=/path/to/playwright node tests/brain-ratio.cjs --before
```

Ratio traces and screenshots are saved under `screens/`. These are synthetic
headless tests; real microphone/voice quality still needs device testing.
