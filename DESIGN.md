---
version: alpha
name: Product Jam
description:
  "Cover Flow game browsing in the existing flat Product Jam visual language"
colors:
  primary: "#535bf2"
  accent: "#535bf2"
  coverflow-bg: "#07080c"
  coverflow-horizon: "#242733"
  background: "#f5f5f5"
  surface: "#ffffff"
  text: "#2b2d42"
  muted: "#5a5e6b"
  border: "#bfc6d2"
  danger: "#c0362c"
  success: "#1f7a4d"
typography:
  sans:
    fontFamily: "system-ui, sans-serif"
  mono:
    fontFamily: "ui-monospace, monospace"
rounded:
  DEFAULT: "0.5rem"
  sm: "0.25rem"
  md: "0.5rem"
  lg: "0.75rem"
spacing:
  page-max: "72rem"
  section-gap: "1.5rem"
components:
  button: {}
  card: {}
  dialog: {}
---

# Product Jam Design System

## Overview

### Creative North Star

A game collection that browses like the 2009 Apple music library, expressed with
this app's contemporary, flat controls. Board states are the cover artwork.

### Product context and register

- Audience: two people playing four-in-a-row on one screen; signed-in owners
  manage their saved games. Domain source: `docs/design.md` and
  `server/routes/games.ts`.
- Product register, English locale (`client/lib/config.ts`), no specific market.
- Desktop and tablet portrait: Cover Flow above a synchronized list. Touch
  landscape: carousel without the list. Phone portrait (600px and below):
  thumbnail rows by default, with List, Cover art, and Cover Flow choices. The
  page scrolls naturally; the desktop list owns its bounded scroll.
- Signature: centered playable-board previews, angled neighboring games.
- Restraint: preserve shared controls, typography, borders, and semantic tones.
- Anti-reference: no Aqua replica, metallic toolbar, glossy controls, or retro
  chrome.
- Runtime ownership: `client/styles/tokens.css` is canonical. This document
  mirrors it; feature CSS consumes those variables directly. No generated token
  adapter.

## Colors

Use the canonical colors above through their matching `--color-*` variables.
Accent identifies actions and Cross; text identifies Circle. Board marks are
stroked SVG shapes rather than letter glyphs; friendly labels use Cross and
Circle while the API retains X/O. Success highlights winning squares and the
winning line. Status always includes text. Background/surface separate the
carousel stage and list. The application uses the existing light theme.
Scrollbar roles derive from border, text-muted, and surface in global CSS.

## Typography

Rubik (`--font-titles`) for headings, system body with the existing
Hebrew/Arabic fallback stack, and `--font-mono` for marks and counts. Use
sentence case. Format dates with the configured app language and the viewer's
local timezone.

## Layout

Follow the existing 4px spacing scale. Games can use a 72rem page; existing
pages retain their widths. A 600px portrait breakpoint selects the album-style
list; 601–900px hides the list date column. Coarse-pointer landscape hides the
list. Actions stay available without hover. No fixed-height shared page shell.

## Elevation & Depth

Use existing shared shadows on overlays and cover previews. Perspective belongs
to the carousel only. Selected rows use a subtle accent mix; all other rows use
plain surfaces and borders.

## Shapes

Use existing small/medium/large radii and 1px borders. Boards have a square
aspect ratio, a four-column grid, and large marks. Preserve the shared control
shapes.

## Components

### Foundational visual states

Shared Spinner is the loading owner. Keep actionable errors inline. Use shared
Button disabled/loading states, visible focus, pressed filters, and read-only
completed boards. New scroll regions inherit the global scrollbar baseline.

### Buttons and actions

Primary: New game, Continue game, View game. Secondary: Back to games, Keep
playing. Abandon is subdued until its destructive confirmation. No action
depends on hover.

### Navigation and data display

Games live at `/games`; `/games/:id` opens a viewer over the collection. The
list selects and centers a cover; its open action resumes or previews. Filter
and selection live in URL parameters. Arrow keys, Home/End, visible arrows,
horizontal wheel/trackpad, and touch swipes support carousel navigation.

### Forms and overlays

Reuse Base UI-backed Dialog and shared Buttons. On phones and tablet landscape,
game activation opens a dark album-style action panel with thumbnail, status and
action rows. Desktop and tablet portrait open directly. Confirm abandon in an
app-owned modal, preserving the game and retry action on failure. ToastProvider
owns success feedback. Finished games are read-only; active moves are
server-confirmed.

### Iconography

Use a compact three-icon view switch (list, four-square grid, stacked covers),
shared IconButton and Tooltip primitives, and visible selected state. Use simple
directional arrows with accessible names. Keep action labels visible.

### Motion

Finished games provide compact replay transport controls, a labeled native range
timeline and a stable status region. Replay uses discrete board states, shared
buttons and shape marks; it does not animate pieces between squares.

Carousel movement uses existing easing and a 300ms geometry transition. Reduced
motion removes rotation/depth and global styles minimize transitions. The Planes
Apple preset supplies spring movement, 67° side rotation, tight 60/180 spacing
at its 400px reference width, reflections, click-to-snap, and tick audio with a
mute control.

### Content and data visualization

Use direct action names. Preview a real 4×4 board and highlight its winning
line. Never present invented demo games as account data.

## Do's and Don'ts

- Do preserve the Apple browsing layout and interaction model.
- Do reuse the current app tokens and shared primitives.
- Don't copy 2009 Aqua appearance.
- Don't allow completed games to be edited or abandoned.
