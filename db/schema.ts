import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
export const rooms = sqliteTable(
    "rooms",
    {
        code: text("code").primaryKey(),
        state: text("state").notNull(),
        version: integer("version").notNull().default(1),
        created: integer("created").notNull(),
        activityAt: integer("activity_at").notNull().default(0),
        isPublic: integer("is_public", { mode: "boolean" })
            .notNull()
            .default(false),
    },
    (table) => [
        index("idx_rooms_public_created").on(table.isPublic, table.created),
    ],
);
