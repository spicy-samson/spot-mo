# Spot Mo — Project Proposal

> Fill this out **before** writing code. If a section feels hard to answer, that's a sign the scope isn't clear yet — better to feel that now than three weeks in.

---

## 1. One-Liner

> A fast, offline-first personal place-pinning app for food, leisure, and self-care that helps urban renters and frequent travelers remember what to order, how much it costs, and what fits their daily budget within walking or driving distance.

---

## 2. Problem Statement

Living in a dense city or working from home comes with decision fatigue and forgotten discoveries:

- **Forgotten favorites & dishes:** There are dozens of great food spots, carinderias, cafes, and self-care shops around the neighborhood, but people easily forget they exist — or forget the specific dish worth ordering.
- **Decision fatigue at mealtime:** Every day at breakfast, lunch, and dinner, significant mental energy is wasted asking "What should I eat?", often leading to default uninspired delivery orders.
- **Disconnection between location & daily budget:** Existing map bookmarks don't care how much money is left for food today. Users want to see: *"What can I eat nearby that fits what I have left to spend today?"*
- **Travel amnesia:** When traveling to provinces, cities, or recurring destinations, great local spots discovered on past trips get lost across visits.
- **Shortcomings of existing tools (Google Maps / Apple Maps / Notes):**
  - Notes on pins are unstructured (no dish list, price points, or order history).
  - You cannot filter by remaining daily budget within an adjustable radius ($1\text{--}20\text{ km}$).
  - No offline-first queryable database for your personal curated spots.
  - No visit logs answering *"What did I order last time and what did it cost?"*

---

## 3. Goals vs. Non-Goals

Scope discipline is vital for an offline-first mobile app.

| Goals (in scope for v1) | Non-Goals (explicitly out of scope for v1) |
| :--- | :--- |
| **Instant manual pin creation:** name, category (`food`, `leisure`, `self_care`), coordinates/address, notes | **External map scraping / Google Maps sync:** no API dependency for place details or live hours |
| **Structured dishes & pricing:** dishes/services per place with accurate costs | **Turn-by-turn routing navigation:** straight-line / Haversine distance only; defer native navigation intent to external maps |
| **Daily food budget tracker:** daily allowance, spend logging from visits, remaining balance | **Public reviews & social feed:** no comments, community ratings, or public profiles (parked for v2) |
| **Budget & distance-aware suggestions:** filter & rank places by proximity ($1\text{--}20\text{ km}$) and affordability | **Automated live transport telemetry:** no live vehicle GPS or commute telemetry (simple "How I got here" tag instead) |
| **Time-aware smart home screen:** contextual meal prompt based on local time (Breakfast, Lunch, Merienda, Dinner, Late Night) | **Real-time multi-device cloud sync:** v1 is strictly offline local SQLite with manual JSON export/import backup |
| **Visit log & repeat history:** track visits, items ordered, and total spent | **Desktop / web client:** mobile-first (iOS & Android via Expo) |
| **Fully offline capability:** local SQLite database that never blocks on network connectivity | **OCR / receipt scanning / menu AI parsing:** manual quick-entry only for v1 |

---

## 4. Target User & Core Use Case

### Primary User
A city-dwelling professional or remote worker living in an apartment who primarily eats out or takes away within their neighborhood, who also occasionally travels to other regions and wants a permanent, private black book of places they love.

### Core Use Cases
1. **The Daily Meal Decision (Fastest Path):**
   - User opens the app at 12:15 PM.
   - Home screen displays: *"Good afternoon, Third. What do you want for lunch? You have ₱350 left in your daily food budget."*
   - App presents top 3 recommendations within 2 km whose dishes fit under ₱350.
   - User picks a carinderia, checks what dish they liked last time (e.g. *Bicol Express — ₱90*), walks there, and logs the visit with one tap.

2. **The New Discovery Pin (Under 20 Seconds):**
   - User stumbles upon a great cafe or self-care massage parlor.
   - Opens Spot Mo $\rightarrow$ taps **+ Pin Spot** $\rightarrow$ GPS auto-fills coordinates $\rightarrow$ selects category (`Food`) $\rightarrow$ inputs 1–2 standout dishes with prices $\rightarrow$ Saves.

3. **Travel Return:**
   - User returns to Cebu or Baguio months later.
   - Opens app, sets radius or switches view to city filter $\rightarrow$ instantly retrieves places pinned during previous trips with exact notes on what was good.

---

## 5. Tech Stack & Key Decisions

| Layer | Choice | Why |
| :--- | :--- | :--- |
| **Frontend Framework** | Expo (React Native, SDK 57, New Architecture) | Cross-platform (iOS target first, Android ready), fast iteration, EAS build ecosystem. |
| **Navigation & Routing** | Expo Router (`src/app/`) | File-based navigation, deep linking, native screen stack management. |
| **Local Database** | `expo-sqlite` (with Drizzle ORM) | Native SQLite engine on iOS/Android; zero network latency, robust transactions, strictly offline. |
| **State & Query** | Zustand / TanStack Query (offline-ready) | Lightweight reactive client state for active filters, radius slider, and cached queries. |
| **Location & Geo** | `expo-location` + Haversine utility | Fast straight-line distance calculations in JS/SQLite; minimal battery overhead vs continuous tracking. |
| **Styling & UI** | React Native StyleSheet / Tamagui or NativeWind | Clean mobile-first design, fast 60/120 FPS list rendering, dark/light theme support. |
| **Backup / Storage** | Local JSON Export / Import (`expo-file-system`, `expo-sharing`) | Failsafe data portability without requiring a backend server or user authentication in v1. |
| **Future Backend (v2)** | Cloudflare Workers + D1 + Drizzle | Edge-native sync and social sharing, matches low-latency serverless stack when ready. |

### Open Architecture Questions
- [ ] **Coordinate Picker UX:** When adding a place from home that isn't at the current GPS location, will we use a lightweight map pin picker or a geocoding address search? *(Recommendation for v1: Current GPS button + manual address/city fallback).*
- [ ] **Budget Rollover:** If ₱100 is left unspent today, does it roll over into tomorrow's budget, or does each day strictly reset? *(Recommendation for v1: Strict daily reset with optional weekly review tab).*
- [ ] **Unknown Cost Fallback:** How should places without recorded dishes/prices behave in budget filtering? *(Recommendation: Tag as "Price unknown" and display at the end of the list with a toggle "Include unpriced spots").*

---

## 6. MVP Feature List (Prioritized)

| Feature | Priority | Notes |
| :--- | :--- | :--- |
| **Place CRUD** | **Must** | Create, view, edit, and soft-delete/archive places with category (`food`, `leisure`, `self_care`). |
| **Dishes / Services with Prices** | **Must** | Add menu items with prices per place; ability to quickly edit prices when they change. |
| **Distance Engine (Haversine)** | **Must** | Calculate distance from device GPS to all pins; filter by radius slider ($1\text{--}20\text{ km}$). |
| **Daily Food Budget Tracker** | **Must** | Set daily target limit, display remaining balance for the day. |
| **Visit Logging** | **Must** | Log a visit to a place, track amount spent, and auto-deduct from today's budget. |
| **Time-of-Day Smart Homepage** | **Must** | Dynamic greetings and meal prompt windows (Breakfast, Lunch, Snack, Dinner, Late Night). |
| **Offline-First SQLite Storage** | **Must** | Complete functionality without internet connection. |
| **JSON Export & Import** | **Should** | Export full database backup as JSON file and restore it (safety net before cloud sync). |
| **Search & Filter Bar** | **Should** | Search by place name, dish name, city, or category tag. |
| **Quick "How I Got Here" Tag** | **Should** | Simple chips on visits (`Walk`, `Jeep/Bus`, `Car`, `Motorcycle/Angkas`, `Bicycle`). |
| **Favorites / Pinned Spots** | **Could** | Star/pin top favorite spots to quick-access bar. |
| **Photo Attachments** | **Could** | Optional camera/gallery thumbnail for place or dish (`expo-image`). |
| **Cloud Sync & Social Sharing** | **Could (v2)** | User accounts, sharing pinned lists with friends, Cloudflare D1 sync. |

---

## 7. Data Model (Sketch)

Local SQLite schema via Drizzle ORM:

```
places
  id: text (UUID, PK)
  name: text NOT NULL
  category: text NOT NULL ('food' | 'leisure' | 'self_care')
  latitude: real
  longitude: real
  address: text
  city: text
  notes: text
  is_favorite: integer (0 or 1, default 0)
  is_archived: integer (0 or 1, default 0)
  created_at: text (ISO8601)
  updated_at: text (ISO8601)

dishes
  id: text (UUID, PK)
  place_id: text (FK -> places.id, ON DELETE CASCADE)
  name: text NOT NULL
  price: real NOT NULL
  category: text ('dish' | 'service' | 'beverage')
  is_recommended: integer (0 or 1, default 0)
  created_at: text (ISO8601)
  updated_at: text (ISO8601)

visits
  id: text (UUID, PK)
  place_id: text (FK -> places.id, ON DELETE RESTRICT)
  visited_at: text (ISO8601) NOT NULL
  amount_spent: real NOT NULL
  items_summary: text
  transport_mode: text ('walk' | 'bike' | 'transit' | 'car' | 'other')
  rating: integer (1 to 5)
  notes: text
  created_at: text (ISO8601)

budget_configs
  id: text (UUID, PK)
  daily_limit: real NOT NULL (e.g. 500.00)
  currency: text (default 'PHP')
  updated_at: text (ISO8601)

user_preferences
  id: text (UUID, PK)
  user_name: text (e.g. 'Third')
  base_city: text
  default_radius_km: real (default 5.0)
  updated_at: text (ISO8601)
```

> **Design note on UUIDs & Foreign Keys:**
> - Client-generated UUIDs (`crypto.randomUUID()`) are used instead of autoincrement IDs to ensure painless future migration to Cloudflare D1 multi-device sync.
> - Soft delete (`is_archived`) on `places` ensures historical `visits` and spend data remain intact even if a restaurant closes down.

---

## 8. Milestones & Timeline

| Milestone | Deliverable | Target |
| :--- | :--- | :--- |
| **M0 — Scaffold & DB Engine** | Expo router project setup, `expo-sqlite` + Drizzle migration pipeline, UUID generation, mock data seeding. | Week 1 |
| **M1 — Places & Dishes CRUD** | Create, read, update, archive places; nested dish creation with prices; category filtering. | Week 2 |
| **M2 — Location & Distance Engine** | `expo-location` integration, Haversine formula calculation, radius slider ($1\text{--}20\text{ km}$), location permissions handling. | Week 3 |
| **M3 — Budget & Visit Logging** | Daily budget configuration, visit logging modal with price deduction, daily spend aggregation. | Week 4 |
| **M4 — Smart Homepage & Recommendations** | Time-aware greeting widget, budget + proximity ranking algorithm, empty and travel states. | Week 5 |
| **M5 — Export/Import & UI Polish** | JSON backup/restore via `expo-file-system`, smooth list animations, dark mode polish, physical iOS testing. | Week 6 |
| **M6 — TestFlight Release** | EAS build configuration, standalone iOS internal test build via TestFlight. | Week 7 |

---

## 9. Future Roadmap (Parked Ideas)

- **v2 Cloud Sync (Cloudflare Workers + D1):** Frictionless backup across devices with magic-link or Apple Sign-In.
- **v2 Social Sharing ("Spot Mo Lists"):** Share a curated list of spots (e.g., *"Best Coffee in Poblacion"*, *"Third's Elyu Weekend Spots"*) with friends via link or QR code.
- **Photo Attachments:** Save photos of food menus, exterior signage, or receipts locally via `expo-image`.
- **Receipt OCR / Quick Add:** Scan physical paper receipts with camera to automatically pre-populate dishes and prices.
- **Opening Hours Alerts:** Optional operating schedule tracker to warn if a spot is likely closed.
- **Map View Mode:** Interactive native map view toggle alongside the high-performance distance list.

---

## 10. Risks & Open Questions

| Risk / Question | Impact if Unresolved | Mitigation Plan |
| :--- | :--- | :--- |
| **Manual Data Entry Burden** | If adding a place takes $>30\text{ seconds}$, user will stop logging spots and churn. | Streamline "+ Pin" flow to 3 fields minimum (Name, Category, 1 dish/price). Auto-capture current GPS coordinate in 1 click. |
| **GPS Accuracy & Indoors** | Device might report inaccurate coordinates inside malls or dense alleyways. | Provide an adjustable pin location or simple address/landmark text field fallback. |
| **Travel Zero-State** | When traveling to a new city, radius query returns 0 spots, resulting in a blank screen. | Detect when distance to nearest spot exceeds radius and display: *"No spots nearby in [City]. Pinned spots in your home city are [X] km away. Tap + to pin your first spot here!"* |
| **Local-Only Data Loss** | User uninstalls the app or changes phones and loses all spots. | Implement a prominent one-tap "Export Backup (JSON)" in Settings, with optional periodic reminder. |
| **Location Permission Denied** | App fails if user denies GPS permission. | Graceful fallback to a manual "Base City" selector and alphabetical/category list sorting without distances. |

---

## 11. Existing & Similar Apps (Competitive Landscape)

| App | Strengths | Where Spot Mo Wins |
| :--- | :--- | :--- |
| **Mapstr** | Great 3D map visualizer, social tags, sharing. | Bloated, requires account, internet-heavy, no daily food budget tracker, no structured dish price matching. |
| **Spot Saver** | Clean place saving, simple UI. | Lacks dish-level pricing, meal-time decision engine, and daily spend logging. |
| **Google Maps / Apple Maps** | Ubiquitous, comprehensive POI database. | Notes are unstructured, no "what fits my remaining budget" queries, no personal visit history or price tracking. |
| **Notion / Apple Notes** | Highly customizable, flexible. | Janky mobile input, no automatic GPS distance calculation, high friction when standing outside a restaurant. |

---

## 12. Success Criteria

For v1 to be considered complete and successful:

1. **< 20-Second Pin Creation:** User can stand at a spot, tap "+", auto-tag GPS location, add a dish + price, and save in under 20 seconds.
2. **Confident Meal Decision:** Opening the app at lunch shows immediate recommendations within walkable distance that fit today's remaining budget.
3. **100% Offline Resilience:** App opens instantly and allows full search, creation, and visit logging in airplane mode.
4. **Data Portability:** User can export their full dataset as a JSON file and restore it cleanly on a fresh install.
5. **Personal TestFlight Deployment:** Packaged and installed on personal iOS device via EAS Build/TestFlight for daily personal dogfooding.
