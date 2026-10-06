# [Project Name] — Project Proposal

> Fill this out **before** writing code. If a section feels hard to answer, that's a sign the scope isn't clear yet — better to feel that now than three weeks in.

---

## 1. One-Liner

_The elevator pitch. One sentence. If you can't say it in one sentence, you don't understand the project yet._

**Example (Kanban Board):**

> A drag-and-drop task board (like Trello) for solo devs and small teams to track work across custom columns, built to be fast, self-hostable, and free of subscription paywalls.

---

## 2. Problem Statement

_What's broken or missing that this solves? Who feels that pain?_

**Example:**

> Existing tools (Trello, Jira) are either overkill for solo/small projects or gate basic features (custom fields, automations) behind paid tiers. I want something lightweight that I fully own and can extend.

---

## 3. Goals vs. Non-Goals

This is the most important section. Scope creep kills side projects — write down what you're explicitly **not** doing so future-you can point back to it.

| Goals (in scope)                       | Non-Goals (explicitly out of scope)           |
| -------------------------------------- | --------------------------------------------- |
| Drag-and-drop cards across columns     | Real-time multi-user collaboration (v1)       |
| Persist board state                    | Mobile native app                             |
| Basic auth (single user or small team) | Third-party integrations (Slack, GitHub sync) |
| Custom columns/labels                  | Granular permissions/roles                    |

_Non-goals aren't "never" — they're "not in this version." Park them in Section 9 (Future Roadmap) instead of losing them entirely._

---

## 4. Target User & Core Use Case

_Who is this for, and what's the one workflow they'll use most?_

**Example:**

> Primary user: me, for personal project tracking, and possibly small freelance teams (2-4 people). Core use case: create a board → add cards → drag between "Todo / In Progress / Done" → done.

---

## 5. Tech Stack & Key Decisions

_Pick your stack and — more importantly — write down **why**. This is what you'll thank yourself for when you forget your own reasoning in 3 months._

| Layer             | Choice                               | Why                                              |
| ----------------- | ------------------------------------ | ------------------------------------------------ |
| Frontend          | e.g. Nuxt 3 / React                  | familiarity, SSR if needed                       |
| Backend/API       | e.g. Cloudflare Workers + Hono       | edge-native, low latency, matches existing stack |
| Database          | e.g. D1 (SQLite) or Postgres/Neon    | pick based on relational complexity needed       |
| ORM               | e.g. Drizzle                         | type-safe, works with D1/Postgres                |
| Auth              | e.g. session cookies / Lucia / Clerk | simplicity vs. control tradeoff                  |
| Hosting           | e.g. Cloudflare Pages/Workers        | already in your toolchain                        |
| Realtime (if any) | e.g. Durable Objects / WebSockets    | only if collaboration is in scope                |

**Open architecture questions** _(list anything you're still unsure about — don't let these block starting, but track them):_

- [ ] Do I need optimistic UI updates for drag-and-drop, or is a full refetch acceptable?
- [ ] Single DB table for cards with a `column_id` + `position` (float/int) for ordering — or something more normalized?

---

## 6. MVP Feature List (Prioritized)

_Split ruthlessly into Must / Should / Could. If everything is "must," nothing is._

| Feature                                         | Priority | Notes                                |
| ----------------------------------------------- | -------- | ------------------------------------ |
| Create/rename/delete boards                     | Must     |                                      |
| Create/edit/delete columns                      | Must     |                                      |
| Create/edit/delete cards                        | Must     |                                      |
| Drag cards between columns                      | Must     | this is the whole point              |
| Reorder cards within a column                   | Must     |                                      |
| Persist state (DB-backed, not just local state) | Must     |                                      |
| Basic auth (1 user)                             | Should   | can stub with a hardcoded user first |
| Labels/tags on cards                            | Should   |                                      |
| Due dates                                       | Could    |                                      |
| Multi-user boards                               | Could    | v2                                   |
| Card comments/attachments                       | Could    | v2+                                  |

---

## 7. Data Model (Sketch)

_Doesn't need to be final — just enough to start writing migrations without guessing._

```
Board
  id, title, created_at

Column
  id, board_id (FK), title, position

Card
  id, column_id (FK), title, description, position, created_at
```

**FK/cascade note for you specifically:** given the FK cascade debugging you just went through on the Maytronics D1 work — if this ends up on D1 too, decide up front what should cascade-delete (e.g. deleting a board should cascade to columns → cards) and write the guard/snapshot check into your migration flow from day one instead of discovering it the hard way again.

---

## 8. Milestones & Timeline

_Rough, not sacred. The point is having checkpoints so "randomly lost" becomes "I'm behind on milestone 2."_

| Milestone        | Deliverable                                                 | Target |
| ---------------- | ----------------------------------------------------------- | ------ |
| M0 — Setup       | Repo, stack scaffolded, DB schema + migrations              |        |
| M1 — Core CRUD   | Boards/columns/cards create/read/update/delete, no drag yet |        |
| M2 — Drag & Drop | Reordering works, persists to DB                            |        |
| M3 — Auth        | Single-user login gating the board                          |        |
| M4 — Polish      | Labels, empty states, error handling                        |        |
| M5 — Ship        | Deployed, README, maybe a demo video/clip                   |        |

---

## 9. Future Roadmap (Parked Ideas)

_Where non-goals go to wait, not die._

- Multi-user real-time collaboration (Durable Objects?)
- GitHub issue sync
- Automations (e.g. auto-move card on PR merge)
- Mobile app

---

## 10. Risks & Open Questions

| Risk/Question                                                                     | Impact if unresolved                               |
| --------------------------------------------------------------------------------- | -------------------------------------------------- |
| Drag-and-drop ordering strategy (position float vs. linked list vs. full reindex) | Could cause janky UX or race conditions on reorder |
| DB choice (D1 vs Postgres) if collaboration is added later                        | Migration pain if wrong choice made early          |

---

## 11. Success Criteria

_How do you know this is "done" for v1? Be concrete._

**Example:**

> I can create a board, add 3 columns, add cards, drag them across columns, refresh the page, and the state persists. Deployed and usable from my phone browser.

---

## 12. Session Log Tie-In

_Since you're already using SHIP/TRAIN/HYBRID mode logs — tag which mode each work session on this project is in. Pure CRUD scaffolding = SHIP. Drag-and-drop state management or DB schema decisions where you want to actually retain the "why" = TRAIN._
