# Spot Mo

---

## 1. One Liner

> A personal pinned-locations app for food, leisure, and self care.

## 2. Problem Statement

- There are lots of good places to eat around my place, and I tend to forget them.
- Working from home, I spend a lot of mental energy every day deciding where to eat, and sometimes forget good food places entirely.
- I also forget the good dishes at those places.
- I want to budget my food spending daily.
- I want to know the distance from where I am to my saved places.
- I travel to different cities and regions and eat at different spots (e.g. carinderias). When I go back, I forget where they are.
- I want to pin all the places I like going to, especially for food and leisure.

## 3. Summary

A personal pinned-locations app with three categories:

- Food
- Leisure
- Self care

**Core ideas**

- **Pin and remember:** save places and the dishes worth ordering there.
- **Daily budget helper:** plan the day's food spend; suggestions favor the most convenient option.
- **Distance-aware:** places are shown relative to where I am, with an adjustable radius of 1–20 km.
- **User-entered data:** every detail is typed in by the user, so it stays up to date. No reliance on Google Maps data, which can be outdated.
- **Time-aware homepage:** a greeting that changes with the time of day, followed by a meal prompt.
  - Example: 7 am or 10 am → "Good morning, Third. What do you want to eat for breakfast?"
  - Example: 11 am → lunch prompt.
  - Evening → dinner prompt.

**Sharing** (social-media style) is planned for **v2**.

## 3. Target user _(suggested)_

Someone who lives in an apartment in a city and mostly buys food within the neighborhood ("city life"), and who also travels and wants to remember places across cities and regions.

## 4. Questions to answer

### Q1. Why not just use Google Maps and bookmark places?

Google Maps saved lists work for remembering locations, but they fall short for this use case:

- Notes are free text with a short limit. There are no structured fields for dishes or prices.
- You can't query "places within X km that fit what I have left to spend today".
- There's no daily budget or spend tracking.
- Offline support is for downloaded map areas, not for searching your own lists.
- There's no visit history ("what did I order last time, and what did it cost?").

### Q2. What happens if I lose my phone or switch devices? _(suggested)_

With local-only storage, all pins are lost. Options to decide on:

- Export/import (JSON or CSV) as a simple v1 safety net.
- iCloud-based backup.
- Server sync (see the technical plan).

## 5. Scope _(suggested)_

### v1 (MVP)

- Pin, edit, and archive places
- Dishes per place with prices
- Log visits
- Daily budget with remaining-budget display
- Suggestions by distance and budget
- Radius setting (1–20 km)
- Time-of-day homepage
- Fully offline, local data
- Data export

### v2

- Sharing (social-media style)
- Accounts and sync across devices

### Later / maybe

- Transport tracking (see the on-hold section)
- Opening hours
- Photos per place or dish
- Tags (e.g. "cheap", "good for groups", "late night")

### Out of scope for now

- Importing data from Google Maps or any external source
- Turn-by-turn navigation
- Reviews from other users

## 6. Technical plan

**Platform:** mobile app, iOS first.

**Stack (planned)**

- React Native (Expo suggested for builds and device APIs)
- SQLite on device (`expo-sqlite`, optionally with Drizzle ORM)
- Optional server: Cloudflare Worker with D1 (SQLite-based), only needed for sync and v2 sharing

**Offline**

- Pinning, browsing, logging visits, and suggestions all work with no network.
- The map background may not render offline. A list view sorted by distance is the fully offline fallback.

**Permissions**

- Location: "While Using the App" is enough. Users must allow it.
- Include a clear usage-description string explaining why location is needed.

**Distance calculation**

- Haversine (straight-line) distance between the device's coordinates and each place.
- At personal-dataset sizes, computing this for all places is fast. No spatial index needed.
- Straight-line distance is not walking distance. Real routing needs a network service.

**Sync design (if added)** _(suggested)_

- Client-generated UUIDs as IDs, not auto-increment integers.
- `updated_at` on every row.
- Soft deletes (`deleted_at`) so deletions can sync.
- Last-write-wins conflict handling is the simplest fit for a single-user app.

**Deployment (iOS)** _(suggested)_

- Apple Developer Program (about $99 USD/year; verify current pricing).
- TestFlight for personal use (builds last 90 days).
- Full App Store release adds review, privacy labels, and a privacy policy. Defer until others use it.

## 7. Ontology

### Entities and attributes

**LOCATION** (a raw reading, transient, not stored long-term)

- latitude
- longitude
- accuracy
- timestamp

**PLACE**

- name
- type/category (food, leisure, self care)
- latitude
- longitude
- address
- city
- notes _(suggested)_
- archived flag _(suggested)_
- maybe opening hours

**PERSON**

- base location (city or barangay?)
- current location (runtime state)
- destination
- movement

> Note: for a single-user app, Person is mostly a settings record. Current location and movement are runtime state, not saved data. Person becomes a real entity in v2 (sharing).

**PRODUCT** (a dish or service) _(consider renaming to "Dish" or "Menu item")_

- type (goods or services)
- cost
- belongs to a place
- optionally a price history (price + date) since prices change _(suggested)_

**BUDGET**

- limit
- date/timestamp
- spend (derived from that day's visits)

**VISIT**

- timestamp
- place
- items ordered _(suggested)_
- amount spent _(suggested)_
- rating _(suggested)_
- "how I got here" note _(suggested)_

### On hold: TRANSPORT

Held for now, since the goal is just to pin places so I remember them.

- Workaround: an input box asking "Remember how you got here?"
- Default is walking, since the app is for people with an apartment who buy food within the neighborhood.

Fields for later:

Held for now, since the goal is just to pin places so I remember them.

- Workaround: an input box asking "Remember how you got here?"
- Default is walking, since the app is for people with an apartment who buy food within the neighborhood.

Fields for later:

- vehicle
- location
- status
- destination

### Relationships

- Person has a location of type BASE.
- Person can pin and save a location.
- A place is assigned a location.
- A place has product(s).
- A visit belongs to a place _(suggested)_ and may reference products ordered _(suggested)_.
- A budget day aggregates the visits of that day _(suggested)_.

## 8. Operations

- Pin a place (name, category, coordinates, address, city)
- Edit or archive a place
- Add or edit dishes for a place (name, price)
- Log a visit (place, date, items ordered, amount spent, rating, "how I got here")
- Set a daily food budget
- Get suggestions: places within the radius, filtered by budget, sorted by distance
- Filter by category (food, leisure, self care) or city
- Change the search radius (1–20 km)
- Set or change base location
- Export and import data _(suggested)_
- Search saved places by name or dish _(suggested)_
- Mark a place as favorite _(suggested)_

## 9. Rules

- Place data is only what the user entered. No external map data is imported.
- Pinning and browsing must work fully offline.
- Suggestions rank by distance first, then filter by whether typical dish prices fit the remaining budget.
- Remaining budget = daily limit minus the sum of that day's visit spend.
- Radius is clamped to 1–20 km.
- The meal-time greeting is based on device local time.
- Deleting a place shouldn't silently delete its visit history. Archive instead.
- A place with no dishes or prices can't be filtered by budget. Decide whether it shows as "unknown cost" or is excluded.

## 10. Edge cases to think through _(suggested)_

- **Travel:** the radius is 1–20 km, but in another city nothing may be saved nearby. What should the home screen show?
- **Base location:** when traveling, does "near me" use the device's current GPS or the saved base location?
- **Time zones:** does the "day" for budgeting follow device local time when traveling?
- **Meal windows:** what hours count as breakfast, lunch, dinner, and in-between (snacks, late night)?
- **Budget rollover:** does unspent budget carry over, or reset daily?
- **Partial prices:** a dish with no price, or a place with a wide price range.
- **Duplicates:** pinning the same place twice.
- **Closed places:** a place that permanently closes. Archive versus delete.
- **Permission denied:** what works without location access (probably manual base location and list browsing).
- **GPS accuracy:** indoor or poor-signal readings when pinning a place. Allow dragging the pin to adjust.
- **Data loss:** what the user sees on a fresh install with no backup.

## 11. Risks _(suggested)_

- Data entry is manual, so the app only stays useful if pinning a place takes seconds.
- Local-only data without backup can be lost.
- Suggestions are only as good as the dish and price data the user entered.

## 12. Open questions

- Is the base location a city, a barangay, or a pin?
- Exact meal-time windows for the greeting.
- Whether v1 ships with sync or export only.
- App name: is "Spot Mo" final?

## 13. Exisitng & Similar apps

- MAPSTR
- Spot Saver
  -Spot Saver
-
