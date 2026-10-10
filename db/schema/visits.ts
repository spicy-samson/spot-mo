import { int, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { placesTable } from "./places";

export const visitsTable = sqliteTable("visits", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  placeId: text("place_id")
    .notNull()
    .references(() => placesTable.id, { onDelete: "restrict" }),
  visitedAt: text("visited_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  amountSpent: real("amount_spent").notNull(),
  itemsSummary: text("items_summary"),
  transportMode: text("transport_mode", {
    enum: ["walk", "bike", "transit", "car", "motorcycle", "other"],
  }),
  rating: int("rating"),
  notes: text("notes"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export type Visit = typeof visitsTable.$inferSelect;
export type NewVisit = typeof visitsTable.$inferInsert;

