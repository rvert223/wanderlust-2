# ✨ Wanderlust

> *mirror, mirror on the wall, where to go to see it all?*

A mobile-first web app that tracks nearby natural wonders, haunted places, rare sounds and
poisonous plants & creatures — with live-camera-only capture, AI identification, community
verification and a ghost-hunting "Fear Frequency" detector.

## Run it

Requires [Node.js](https://nodejs.org) 18+.

```bash
npm install
npm run dev        # opens http://localhost:5173
```

It runs fully **offline with built-in mocks** — every connector falls back to a mock until you add its
real key. To go live: `cp .env.example .env` and replace the `YOUR_*` placeholders.

> **Phone testing:** the camera and microphone need HTTPS (or `localhost`). Open the dev server through an
> HTTPS tunnel (e.g. `cloudflared tunnel --url http://localhost:5173`).

## 🔑 Where to add your keys and links

**Step 1 — always the same:** copy `.env.example` to a new file named `.env` (project root) and replace each
`YOUR_...` value. Then **restart** `npm run dev` (env files are only read on startup).
All variables are read in one place: [`src/config/env.js`](src/config/env.js).

**Step 2 — only if the real API differs from my placeholder:** open the connector file listed below and adjust
the request (URL path, body, response field). Each connector has a `mock.js` next to it that is used until its
key is set.

| Feature | Put the key / link in `.env` | Connector file to edit (if needed) | Used by |
| --- | --- | --- | --- |
| **SerpAPI Google Lens** — visual search on the live photo (step 1 of a scan) | `SERPAPI_API_KEY` and `PUBLIC_BASE_URL` in **`server/.env`** (never in the website). Optional `VITE_SERPAPI_LENS_URL` (default `/api/serp/lens`) | Server: [`server/index.js`](server/index.js) · browser side: [`src/connectors/serpapi/index.js`](src/connectors/serpapi/index.js) → `visualSearch()` | Scan screen via [`src/services/scanService.js`](src/services/scanService.js) → `executeFullScanPipeline()` |
| **Muse Spark** — identifies the specimen from the Lens data, hazard 0–5, AI-image check, spoken warning (step 2 of a scan) | `MUSE_API_KEY` in **`server/.env`** (Meta Model API key; optional `MUSE_MODEL`, default `muse-spark-1.3`) | Server: [`server/muse.js`](server/muse.js) (system prompt + reply format) · browser side: [`src/connectors/muse/index.js`](src/connectors/muse/index.js) → `analyzeScan()` | Scan screen via `scanService.js` |
| **Muse Agent** — the Paranormal Investigator's spoken lines (spikes, alerts, verification pings) | `MUSE_API_KEY` in `server/.env` | [`server/muse.js`](server/muse.js) → `narrate()` (prompts per event) · browser: [`src/connectors/muse/index.js`](src/connectors/muse/index.js) · wording of the offline lines: [`muse/mock.js`](src/connectors/muse/mock.js) | Haunts screen, hazard alerts, verification messages |
| **Muse Voice Transcribe** — the 🎙️ Ask button on Haunts | `MUSE_API_KEY` in `server/.env` (model `muse-voice-transcribe-1.0`) | [`src/connectors/muse/index.js`](src/connectors/muse/index.js) → `transcribe()` and `recordClip()` | [`src/screens/GhostScreen.jsx`](src/screens/GhostScreen.jsx) |
| **Fear Frequency (18.9 Hz)** — detection settings | *(no key)* | Thresholds (target Hz, spike dB, cooldown): [`src/config/app.js`](src/config/app.js) → `INFRASOUND` · FFT maths: [`src/connectors/infrasound/analyzer.js`](src/connectors/infrasound/analyzer.js) | Haunts screen |
| **Python infrasound service** (scipy/librosa second opinion, optional) | `VITE_INFRASOUND_BACKEND_URL` | [`src/connectors/infrasound/index.js`](src/connectors/infrasound/index.js) → `reportSpike()` | Haunts screen |
| **Facebook Graph — place name from location** (`/v22.0/pages/search`, `type=place`; needs Meta's "Page Public Metadata Access" approval) | `VITE_FACEBOOK_ACCESS_TOKEN` (optional `VITE_FACEBOOK_BASE_URL`) | [`src/connectors/facebookGraph/index.js`](src/connectors/facebookGraph/index.js) → `placeAt(latitude, longitude)` | `src/state/AppContext.jsx` (every post is stacked under its place) |
| **Facebook Graph — nearby verified experts + verification requests** | `VITE_FACEBOOK_ACCESS_TOKEN`, `VITE_FACEBOOK_NEARBY_EXPERTS_PATH` | [`src/connectors/facebookGraph/index.js`](src/connectors/facebookGraph/index.js) → `findNearbyExperts(latitude, longitude, specimenName)`, `requestVerification()` | Posting a risky sighting, via [`src/services/communityService.js`](src/services/communityService.js) |
| **Your backend — sightings, votes, users** | `VITE_API_BASE_URL` | [`src/services/sightingsService.js`](src/services/sightingsService.js) (`/sightings`, `/sightings/:id/votes`) · [`src/services/profileService.js`](src/services/profileService.js) (`/users/:id`) | Realm, Circle, Me |
| **Your backend — log in / sign up** | `VITE_API_BASE_URL` | [`src/services/authService.js`](src/services/authService.js) (`POST /auth/signup`, `POST /auth/login`, each returning `{ token, user: { name, email } }`). Until it is set, accounts are saved on the device only | Welcome screen |
| **Your backend — live hazard alerts (WebSocket)** | `VITE_ALERTS_WS_URL` | [`src/services/alertService.js`](src/services/alertService.js) | Toast alerts on every screen |
| **Live camera / GPS** | *(no key — the browser asks for permission)* | [`src/connectors/camera/index.js`](src/connectors/camera/index.js) · [`src/connectors/location/index.js`](src/connectors/location/index.js) · hide the demo-capture fallback with `VITE_ALLOW_DEMO_CAPTURE=false` | Capture screen |

Other places you may want to change:

| What | File |
| --- | --- |
| Default map centre (used until GPS is allowed) and radius options | [`src/config/app.js`](src/config/app.js) |
| Hazard alert distance / level | [`src/config/app.js`](src/config/app.js) → `ALERT_RADIUS_KM`, `ALERT_HAZARD` |
| Demo sightings, demo experts, demo user (delete when your backend is live) | [`src/data/seed.js`](src/data/seed.js) |
| Safety disclaimers shown to users | [`src/config/app.js`](src/config/app.js) → `DISCLAIMERS` |
| Categories (names, icons, colours) | [`src/config/categories.js`](src/config/categories.js) |

## Screens

| Tab | Screen | What it does |
| --- | --- | --- |
| 🔮 Realm | `RealmScreen` | Magic mirror search, scrying map with radius + category filters, geographic pattern detection, feed |
| 👻 Haunts | `GhostScreen` | Live 18.9 Hz spectrum, Muse investigator warnings, voice questions, haunted places |
| 🪄 Capture | `CaptureScreen` | **Live** camera only — no uploads. Seals time + GPS + SHA-256 into every photo |
| (flow) | `ScanScreen` | SerpAPI Google Lens → Muse Spark pipeline, result card with disclaimers, post to the Realm |
| 🧙 Circle | `CommunityScreen` | Anonymous recent posts grouped by place (nearest first, with distance), Verification Council voting |
| 👑 Me | `ProfileScreen` | Rank, stats, badges, Muse potion bio, my sightings |

## Code layout — one file, one job

```
src/
  config/        env.js (ALL keys/endpoints) · app.js (constants, copy) · categories.js
  connectors/    ← plug real integrations in here; each folder = one external service
    _shared/       http.js (fetch wrapper) · withFallback.js (real call → mock)
    serpapi/       visualSearch() (Google Lens via server/)   index.js · lens.js · mock.js
    muse/          analyzeScan/narrate/transcribe/speak/recordClip   index.js · mock.js
    facebookGraph/ placeAt/findNearbyExperts/requestVerification   index.js · mock.js
    infrasound/    analyzer.js (InfrasoundAnalyzer: FFT maths + test tone) · index.js (Web Audio + optional backend report)
    camera/        live capture + proof stamp          location/   geolocation
  services/      domain logic that combines connectors: sightings, scan, community, profile, alerts
  state/         AppContext.jsx — global state + actions
  hooks/         useAsync · useCamera · useInfrasound
  components/    reusable UI (GlassCard, MagicButton, EnchantedMap, SparkleCanvas, …)
  screens/       one file per screen
  styles/        theme.css (tokens + keyframes) · components.css · screens.css
  data/seed.js   demo data for the mocks          utils/   geo · format · storage · sparkle
```

**Layering rule:** `screens/components → state/hooks → services → connectors → config`. UI never calls
`fetch`; connectors never import UI.

## Connecting the real services

Add a key in `.env`; the matching connector switches from mock to real automatically (and falls back to the
mock if a call fails, so the demo never dies).

| Connector | Env vars | Notes |
| --- | --- | --- |
| SerpAPI Lens | `server/.env`: `SERPAPI_API_KEY`, `PUBLIC_BASE_URL` | Lens only accepts an image URL, so `server/index.js` hosts the photo for the length of one lookup, calls SerpAPI, deletes it and returns the matches (6 lookups/min per visitor). Real results need the public HTTPS server; locally the scan uses demo data |
| Muse | `server/.env`: `MUSE_API_KEY` (optional `MUSE_MODEL`, `MUSE_TRANSCRIBE_MODEL`, `MUSE_BASE_URL`) | The server calls the Meta Model API (`https://api.meta.ai/v1`, Bearer key): Chat Completions with `muse-spark-1.3` for scans (`/api/muse/scan`) and narration (`/api/muse/narrate`, fixed list of events), and `POST /asr/transcribe` for Voice Transcribe (`/api/muse/transcribe`). The server owns every prompt. Check the key with `GET /api/muse/test` |
| Facebook Graph | `VITE_FACEBOOK_ACCESS_TOKEN`, `VITE_FACEBOOK_NEARBY_EXPERTS_PATH` | Graph has no ready-made "nearby verified experts" route; point the path at your own endpoint or adapt `connectors/facebookGraph/index.js` |
| Wanderlust API | `VITE_API_BASE_URL`, `VITE_ALERTS_WS_URL` | Expected routes: `GET/POST /sightings`, `POST /sightings/:id/votes`, `GET /users/:id`; WebSocket pushes new sighting JSON |
| Infrasound backend | `VITE_INFRASOUND_BACKEND_URL` | Optional Python (scipy/librosa) service; receives `{coords, hz, deltaDb}` on each spike |

## How the key features work

- **Fear Frequency (18.9 Hz):** `InfrasoundAnalyzer` (32768-point FFT; 48000 / 32768 ≈ 1.465 Hz per bin, so
  18.9 Hz is bin 13) compares that bin with the ambient noise floor (average of 30–60 Hz). A spike ≥ 12 dB makes
  Muse speak a warning. Many phone mics high-pass below ~20 Hz, so `injectTestTone()` / `stopTestTone()` feed a
  synthetic 18.9 Hz sine (gain 0.05) into the same analyser for demos — never to the speakers.
- **Anti-fake capture:** there is no file picker anywhere. Photos come from the live `<video>`, carry a
  `proof` from `generateProofStamp()` (SHA-256 of timestamp + frozen GPS + image size) for server-side
  re-checking, and Muse additionally flags AI-generated or re-photographed images. Demo frames (no camera) are marked `live: false` and show "Unverified capture".
- **Hazard alerts:** posting or receiving a sighting with hazard ≥ 3 within 5 km raises a toast with safety
  disclaimers. Offline, one incoming alert is simulated ~9 s after launch.
- **Patterns:** `detectPatterns()` buckets sightings into ~11 km cells; clusters get a dashed halo on the map.

## Safety

Identification can be wrong. The UI repeats: never touch or taste unknown plants/animals, this is not medical
advice, and call Poison Control (US 1-800-222-1222) in an emergency. Keep these disclaimers when you ship.
