# Product behavior

## Business evidence

`docs/design.md`, `shared/game/`, and `server/routes/games.ts` own the 4×4
rules, server-confirmed moves, owner authorization, completed-game immutability,
and permanent deletion of abandoned active games. The current user request owns
Cover Flow layout and device-specific presentation.

## Canonical UI map

| Capability     | Canonical owner                          | Source of truth                            | Allowed variants                        | Verification                                     |
| -------------- | ---------------------------------------- | ------------------------------------------ | --------------------------------------- | ------------------------------------------------ |
| CRUD           | `client/features/games/hooks.ts`         | `server/routes/games.ts`, `docs/design.md` | create, move, abandon                   | Mocked browser workflow and existing route tests |
| Scrollbar      | `client/styles/global.css`               | `client/styles/tokens.css`                 | global baseline                         | Browser layout checks                            |
| Toast          | `client/components/Toast`                | Existing provider                          | success, error                          | Browser abandonment flow                         |
| Dialog         | `client/components/Dialog`               | Base UI                                    | viewer, abandon                         | Browser focus, Escape, save and failure checks   |
| Actions        | `client/components/Button`, `IconButton` | Existing primitives                        | primary, secondary, ghost, danger       | Browser disabled/busy states                     |
| Menu           | `client/components/Menu`                 | Base UI                                    | game/status/moves sorting and filtering | Browser keyboard and menu checks                 |
| Select/Listbox | `client/components/Select`               | Existing shared primitive                  | authored                                | Games do not use a select                        |
| Date           | `client/components/DatePicker`           | Existing shared primitive                  | authored                                | Games display formatted dates only               |
| Form           | Existing Field and schema adapters       | Existing shared primitives                 | create, edit                            | Games do not add a form                          |

## Game flow

- View switch: Cover Flow, List, and Cover art are available on every device.
  Phone portrait defaults to List; other sizes default to Cover Flow. Explicit
  choices persist during filtering and game open/close. Cover art uses two
  columns on phone portrait and an adaptive grid elsewhere. List and grid items
  open through the device-specific behavior below.

- `/games`: newest-first game collection from the existing API. All/in-progress/
  completed filters and selected game persist in URL parameters. Render the API
  collection; cap carousel rendering to nearby covers and bound desktop list
  scroll. The API has no pagination contract; do not silently truncate loaded
  results.
- Device-specific action panel: in Cover Flow only, tapping a game on a phone or
  a coarse-pointer tablet in landscape opens a dark album-style actions dialog
  with board thumbnail, status, Continue/View, and Abandon for active games.
  Desktop and tablet portrait open directly. Explicit Continue/View buttons
  always open directly.
- Desktop/tablet portrait: selecting a row centers its cover; double-click or
  the open action opens the game. Phone portrait: tapping a thumbnail row opens
  it.
- Sort/filter: Status opens filters (all, active, completed, wins, draws) and
  status ordering. Game opens A–Z/Z–A; Moves opens fewest/most. The toolbar menu
  exposes all choices in every view. Sorting preserves selected game identity
  and breaks ties by newest creation, then ID.
- Carousel uses the Planes Apple preset (180 center gap, 60 stack spacing, 67°
  rotation at a 400px reference width), scaled to boards, with reflections,
  spring gestures and optional synthesized tick audio (mute control). System
  reduced motion always wins. Selecting a neighboring cover centers it; opening
  the center resumes an active game or previews a finished one. Swipes have
  keyboard/button alternatives.
- New game: disable duplicate creation; on success open the server-created game.
  Failures preserve the collection and expose an inline message.
- `/games/:id`: fetch current state, save one move at a time, disable the board
  while saving or refreshing. Refresh after failed/uncertain saves or conflict;
  preserve visible error copy. Completed games render read-only.
- Back to games closes the viewer, keeping selection/filter. Browser Back works
  from an opened game. Dismissal during a save allows the request to finish.
- Abandon: active games only. Shared Dialog names the game and permanent
  removal, focuses the safe action first, blocks duplicate requests, stays open
  on failure, and closes to the collection with a toast after success. No
  optimistic deletion.
- Loading, failure/retry, empty collection, and empty filtered collection are
  explicit.
- English copy and configured locale date formatting. Reduced-motion preference
  is honored; status and winning information never rely solely on color.

## Finished-game replay

The finished-game viewer reconstructs saved move prefixes with the shared game
rules. It starts at the final board and offers Replay/Play/Pause, previous/next,
start/final, and a native range timeline with arrow/Home/End support. Play from
the end restarts at move zero; manual navigation pauses playback. Advance every
850ms, stop at the final move, and clear the timer on close. Replay is read-only
and sends no mutation requests. Winning highlights reflect the currently shown
position. Invalid recorded moves show the saved final board with an inline
error.

## Game frontend ownership

`GamesPage` composes the feature components. `useGameBrowser` owns URL state,
selection, navigation and collection actions; `hooks.ts` owns API/cache access.
`collection.ts` owns filtering/sorting and shared view/sort types.
`GameCollection` coordinates the three view surfaces and selected-item focus;
`GameList` owns its scroll behavior. Toolbar, Cover Flow gallery, list, artwork
grid, viewer, replay, actions panel and abandon confirmation each have a focused
component. Their styles live beside their owners. Shared responsive
subscriptions live in `client/lib/useMediaQuery.ts`; game labels and date
formatting live in `presentation.ts`. Small icons and internal carousel cards
remain local to their owning component.
