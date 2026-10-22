import { int, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const placesTable = sqliteTable("places", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  category: text("category", {
    enum: ["food", "leisure", "self_care"],
  }).notNull(),
  latitude: real("latitude"),
  longitude: real("longitude"),
  address: text("address"),
  city: text("city"),
  // Payment methods: JSON array allows multiple selections (e.g., ["Cash", "Gcash"])
  paymentMethods: text("payment_methods", { mode: "json" })
    .$type<("Cash" | "Gcash" | "QRPH" | "Card")[]>()
    .default(["Cash"]),
  // Schedule: 24h time format "HH:mm" (e.g. "08:00", "22:00") for effortless string comparison and display
  scheduleOpen: text("schedule_open"),
  scheduleClose: text("schedule_close"),
  contactNumber: text("contact_number"),
  contactPerson: text("contact_person"),
  notes: text("notes"),
  isFavorite: int("is_favorite", { mode: "boolean" }).notNull().default(false),
  isArchived: int("is_archived", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export type Place = typeof placesTable.$inferSelect;
export type NewPlace = typeof placesTable.$inferInsert;
