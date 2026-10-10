import { int, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { placesTable } from "./places";

export const offeringsTable = sqliteTable("offerings", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  placeId: text("place_id")
    .notNull()
    .references(() => placesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  price: real("price").notNull(),
  itemType: text("item_type", { enum: ["good", "service"] })
    .notNull()
    .default("good"),
  isRecommended: int("is_recommended", { mode: "boolean" }).notNull().default(false),
  notes: text("notes"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export type Offering = typeof offeringsTable.$inferSelect;
export type NewOffering = typeof offeringsTable.$inferInsert;

