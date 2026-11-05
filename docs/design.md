Plans for the design of Exercise 2
==================================

### Part 1: Tic-tac-toe

Due to my GitHub username (`dkaluta`), the variant I have received is `four`,
which involves a 4⨉4 board, and is won with a row, column or diagonal of
length 4. Two players play on the same screen. The server tracks matches from
creation through each turn, enforces rules using pure functions, and allows
players to list both active and finished matches or abandon an in-progress game.

#### Database

**Table `games`** - one row per game session.

| Column         | Type           | Rules                                                                         |
| -------------- | -------------- | ----------------------------------------------------------------------------- |
| `id`           | `uuid`         | primary key                                                                   |
| `owner_id`     | `uuid`         | foreign key to `auth.users`, not null                                         |
| `board`        | `char(16)`     | not null, fixed-length string of 16 characters                                |
| `outcome`      | `game_outcome` | not null, enum (`in_progress`, `game_won`, `draw`)                            |
| `turn`         | `player_mark`  | enum (`X`, `O`), next player to move, null iff the match is completed         |
| `winner`       | `player_mark`  | enum (`X`, `O`), null if `in_progress` or `draw`, otherwise the winner's mark |
| `winning_line` | `smallint[]`   | null if `in_progress` or `draw`, otherwise array of 4 winning indices         |
| `moves`        | `smallint[]`   | not null, ordered sequence of played positions                                |
| `move_count`   | `smallint`     | generated always as `cardinality(moves)` stored                               |
| `created_at`   | `timestamptz`  | not null, set by the database                                                 |
| `updated_at`   | `timestamptz`  | not null, set by the database on every update                                 |
| `completed_at` | `timestamptz`  | null iff `outcome` is `in_progress`, otherwise timestamp of game finish       |

- **Constraints:**
  - `check_board_length`: `char_length(board) = 16`
  - `check_winner_and_status`:
    ```sql
    (outcome = 'in_progress' and winner is null and winning_line is null and turn is not null and completed_at is null) or
    (outcome = 'game_won' and winner is not null and cardinality(winning_line) = 4 and turn is null and completed_at is not null) or
    (outcome = 'draw' and winner is null and winning_line is null and turn is null and completed_at is not null)
    ```

#### API endpoints and status codes

**`POST /api/games`** - create a new game session.

- Receives: empty body `{}`.
- Answers: `201` with the new game object (initial empty board,
  `outcome: 'in_progress'`, `turn: 'X'`).
- Errors: `500` if the database fails.
- Tables: writes `games`, with the logged-in user as `owner_id`.

**`PUT /api/games/:id`** - apply a move to an active game.

- Receives: the game's `id` in the path, and `{ position: number }` (0–15).
- Answers: `200` with the updated game object. If the move ends the game,
  `outcome` updates to `game_won` or `draw`, `turn` becomes null, and
  `completed_at` is set.
- Errors:
  - `400` if the position is out of bounds (not 0–15), the cell is already
    occupied, or the game is already completed.
  - `409` if another request changed the game before this move could be saved.
  - `403` if the game belongs to someone else.
  - `404` if there is no such game.
  - `500` if the database fails.
- Tables: reads and updates `games`. Validates and applies the move using pure
  functions from `shared/game/`.

**`GET /api/games`** - list games by player.

- Receives: optional query parameter `?outcome=in_progress` or
  `?outcome=completed`.
- Answers: `200` with an array of the user's games, ordered newest first
  (`created_at desc`).
- Errors:
  - `400` if the `outcome` filter parameter is invalid.
  - `500` if the database fails.
- Tables: reads `games` filtered by `owner_id = auth.uid()`.

**`GET /api/games/:id`** - fetch a single game.

- Receives: the game's `id`, in the path.
- Answers: `200` with the game object.
- Errors:
  - `400` if the id is not a valid UUID.
  - `403` if the game belongs to someone else.
  - `404` if there is no such game.
  - `500` if the database fails.
- Tables: reads `games`.

**`DELETE /api/games/:id`** - abandon an active game.

- Receives: the game's `id`, in the path.
- Answers: `200` with `{ ok: true }` (or `204 No Content`).
- Errors:
  - `400` if the id is not a valid UUID, or if the game is already completed
    (`game_won` or `draw`) and cannot be abandoned.
  - `403` if the game belongs to someone else.
  - `404` if there is no such game.
  - `500` if the database fails.
- Tables: deletes the row from `games`.

#### What changed

Server routes now enforce verified ownership and atomically save moves against
the previous move count. Browser writes are disabled by the RLS policies and
explicit privilege revocations. See [security notes](06-security.md).

### Part 2: Space pictures

Shows random pictures from NASA's Astronomy Picture of the Day (APOD) API and
provides on-demand Hebrew explanations generated by Google Gemini. Explanations
are cached in the database so that subsequent requests for an already cached
date skip Gemini. A durable database claim prevents concurrent cache misses from
calling Gemini more than once for the same date.

#### Database

**Table `space_explanations`** - cache for Hebrew explanations.

| Column             | Type          | Rules                                               |
| ------------------ | ------------- | --------------------------------------------------- |
| `date`             | `text`        | primary key, formatted as `YYYY-MM-DD`              |
| `nasa_title`       | `text`        | not null, original English title                    |
| `nasa_explanation` | `text`        | not null, original English explanation              |
| `image_url`        | `text`        | not null                                            |
| `media_type`       | `text`        | not null, default `'image'`                         |
| `hebrew_title`     | `text`        | not null, translated Hebrew title                   |
| `hebrew_summary`   | `text`        | not null, 2-3 sentences in simple Hebrew            |
| `tags`             | `text[]`      | not null, array of 1 to 5 tags from an allowed list |
| `created_by`       | `uuid`        | foreign key to `auth.users`, nullable               |
| `created_at`       | `timestamptz` | not null, set by the database                       |

- **Constraints:**
  - `check_tags_count`: `cardinality(tags) between 1 and 5`

**Table `space_explanation_requests`** - server-only generation claims and
recovery results.

| Column       | Type          | Rules                                                                      |
| ------------ | ------------- | -------------------------------------------------------------------------- |
| `date`       | `text`        | primary key; one generation claim per APOD date                            |
| `result`     | `jsonb`       | nullable; validated full cache row for recovery after a failed cache write |
| `error_code` | `text`        | nullable; `gemini_unavailable` or `invalid_ai_output`                      |
| `created_at` | `timestamptz` | not null, set by the database                                              |

RLS is enabled. Anonymous and authenticated database roles have no access; only
the server's service role can read, insert, and update claims. The existing
`space_explanations` table and columns remain unchanged.

#### API endpoints and status codes

**`GET /api/nasa/pictures`** - fetch random space pictures.

- Receives: optional query param `?count=12` (max 20).
- Answers: `200` with an array of APOD pictures, merged with any existing cached
  Hebrew explanations for those dates. Videos and duplicate dates are skipped,
  so fewer than the requested count may be returned.
- Errors: `502` if NASA's API fails or is unreachable, `500` if the database
  fails.
- Tables: reads `space_explanations` to attach cached explanations to matching
  dates.

**`POST /api/nasa/explain`** - explain a picture in Hebrew.

- Receives: `{ date: string }` (in `YYYY-MM-DD` format).
- Answers: `200` with the explanation object
  (`{ hebrew_title, hebrew_summary, tags }`).
- Errors:
  - `400` if `date` is missing, invalid, or identifies a non-image entry.
  - `409` with `explanation_pending` if another request has already claimed the
    date and has not saved a result.
  - `503` if the explanation service is not configured.
  - `502` if NASA's API or Gemini's API fails.
  - `500` if Gemini returns malformed output failing schema validation or if the
    database fails.
- Tables:
  1. Reads `space_explanations` by `date`. If found, returns the cached result
     immediately without calling Gemini.
  2. If not found: fetches the picture from NASA using only the validated date,
     then inserts a unique claim in `space_explanation_requests` before calling
     Gemini REST with `fetch`.
  3. Requests structured JSON, validates it with the shared Zod schema, saves a
     recovery result on the claim, then writes the existing `space_explanations`
     row and returns it.
  4. A competing request receives `409`, or reuses the stored recovery result
     without another Gemini call. Later cache hits skip both providers.

#### What changed

- Added the signed-in `/space` gallery and navigation link. It requests up to 20
  random APOD entries through our server in batches of four, with Load more
  capped at 20 visible pictures. It skips videos and unavailable records, and
  offers New pictures, NASA descriptions/source links, image credits, and Hebrew
  explanations.
- Component ownership: `SpacePage` composes `PictureGallery`, `PictureCard`, and
  `HebrewExplanation`; `client/features/space/hooks.ts` owns API access and
  browser cache updates. Shared Button and Spinner primitives and existing
  visual tokens are reused. Hebrew content has explicit `lang="he"` and RTL
  direction; the surrounding interface remains English.
- The original `space_explanations` schema is preserved. The additive migration
  `20261104120000_space_explanation_requests.sql` introduces server-only claims
  so simultaneous requests across users and Workers cannot pay twice.
- The default is `gemini-3.8-flash`, a current stable Flash model, with an
  optional server-only `GEMINI_MODEL` override. Gemini is called via REST
  `fetch`, without an SDK. NASA/Gemini keys and the Supabase secret stay on the
  server.
- The prompt asks for a Hebrew title, exactly 2–3 simple Hebrew sentences for a
  10-year-old, and 1–5 allowed tags. Structured JSON output is still checked
  with `shared/schemas/nasa.ts`: nonblank Hebrew text, length limits, and 1–5
  unique allowed tags. Sentence quality and age suitability remain prompt
  requirements rather than a claim of semantic validation.
- Allowed tags: `galaxy`, `nebula`, `star`, `planet`, `moon`, `sun`, `earth`,
  `asteroid`, `comet`, `spaceflight`, `other`.
- NASA API requests have a 45-second deadline (including single-date lookups),
  and Gemini requests 20 seconds. Both use Workers-compatible manual redirect
  handling and reject non-success API responses, including redirects. Calls
  return safe application errors; upstream responses and secrets are never
  forwarded as errors. NASA's returned date must match the requested date. The
  browser sends only `{ date }` for explanations; source title and description
  are fetched by the server.
- Fixed actual picture loading after NASA's site migration. Some API responses
  incorrectly return the NASA logo, generic title, and introductory text. The
  server detects those records and retrieves the date's APOD page, extracting
  its astronomy image, title, and explanation. This recovery follows at most
  three redirects, only between `apod.nasa.gov` and `science.nasa.gov`, without
  the API key. Generic landing pages are rejected. Modern API records with an
  article `url` use `hdurl` for the actual image. One failed recovery does not
  discard healthy pictures in the same batch. The fixed 4:3 image area contains
  the complete photo without intrinsic image dimensions stretching the card.
  Recovery now prefers the article's actual image (including animated GIFs) over
  social-preview metadata. NASA's `news-thumbnail.png` meatball is rejected
  alongside named logos, using the shared `shared/space-images.ts` detector in
  the server and browser. Vimeo/YouTube embeds and native videos are classified
  as video and skipped instead of displaying their default social-preview logo.
  The gallery cache key was updated to discard previously loaded placeholders.
- Claims never expire automatically. A provider timeout, invalid response, or
  Worker interruption may follow a billed call, so the date stays blocked rather
  than silently generating again. An operator must investigate stuck/failed
  claims before any manual reset. If a validated recovery result was stored but
  the final cache insert failed, Check/Try again saves that result without a new
  paid call. If even recovery storage failed, the result may be lost; the claim
  still prevents another charge.
- Loading, empty selections, image failures, provider/database errors, and
  pending explanations are visible with recovery actions. Browser mutations
  never retry automatically; saved Hebrew results appear immediately in cards.

Setup: apply the new Supabase migration before using the feature, and configure
server-only `NASA_API_KEY` and `GEMINI_API_KEY`. `GEMINI_MODEL` is optional.
Model reference: https://aistudio.google.com/docs/models/gemini-3.8-flash.
