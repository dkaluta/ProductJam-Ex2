# Game and NASA API security

Apply every migration in timestamp order, including
`20261104090000_server_only_writes.sql`, before deploying the server changes.
Editing the original migration alone does not fix an existing database. The
forward migration removes the old write policies and revokes browser write
privileges on `games` and `space_explanations`. The existing read policies
remain. Server routes use the Supabase secret key and must enforce ownership
themselves.

The game routes require login. Creating a game accepts `{}` and discards extra
fields, including `owner_id`, board, and outcome. The owner always comes from
the verified token. Sending `{ position: 0 }` to `PUT /api/games/:id` applies
one move; the server replays its stored move history using
`shared/game/makeMove` (defined in `transitions.ts`) and computes every saved
state field. All writes filter by the verified owner. An atomic update also
filters by the previous `move_count` and active outcome. If another request
changed or removed that state, the update returns `409 conflict`; reload the
game before trying again. This prevents lost updates when two requests evaluate
the same board. Requests that read successive versions are successive turns,
since both players share the owner's screen. Completed games cannot be
abandoned.

`GET /api/nasa/pictures` accepts an optional integer `count` from 1 to 20
(default 12). `POST /api/nasa/explain` accepts only a `date` in `YYYY-MM-DD`
format, with a real calendar date within the APOD archive. Other body fields are
discarded. Provider requests go to fixed HTTPS destinations, use
`URLSearchParams` for NASA parameters, reject redirects, and have timeouts. The
server never fetches a client-supplied URL or the media URL returned by NASA.
This closes parameter injection and prevents arbitrary proxy destinations. The
per-request count limit bounds one call; it is not a per-user rate limiter.

The explanation route fetches source material from NASA and validates Gemini's
JSON before inserting the cache with the verified user's `created_by`. Allowed
tags are defined in `shared/schemas/nasa.ts`. Duplicate inserts do not overwrite
the existing cache. Concurrent cache misses may still call Gemini more than
once; the database primary key guarantees a single stored row, not a single
provider call. Prompt instructions and schema validation do not establish
factual accuracy of generated summaries.

Set `NASA_API_KEY`, `GEMINI_API_KEY`, and `GEMINI_MODEL` in `.env` locally and
in Cloudflare Worker settings in production. Choose a currently available Gemini
text model ID; there is no hardcoded fallback. Keep keys unprefixed. The build
rejects private key names with a `VITE_` prefix and browser imports from
`server/`. The client bundle should contain neither private key values nor
server modules.

Verification: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`.
Tests exercise ownership spoofing, competing move updates, invalid moves,
authentication, malicious dates, oversized counts, provider failures, cache use,
and invalid generated tags. Tests mock upstream HTTP; they do not verify live
provider credentials. With a local Supabase database, run `supabase test db` to
verify the database privileges and remaining policies.

References:
[Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security),
[NASA APOD API](https://github.com/nasa/apod-api), and
[Gemini structured output](https://ai.google.dev/gemini-api/docs/generate-content/structured-output).
