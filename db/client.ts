import { drizzle } from "drizzle-orm/expo-sqlite";
import * as SQLite from "expo-sqlite";

export const expo = SQLite.openDatabaseSync("db.db");
export const db = drizzle(expo);

