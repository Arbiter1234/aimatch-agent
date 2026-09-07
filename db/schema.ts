import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
export const memories = sqliteTable(
  "memories",
  {
    owner: text("owner").notNull(),
    id: text("id").primaryKey(),
    kind: text("kind").notNull(),
    content: text("content").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [index("idx_memories_owner_kind").on(t.owner, t.kind, t.updatedAt)],
);
export const knowledgeChunks = sqliteTable(
  "knowledge_chunks",
  {
    owner: text("owner").notNull(),
    id: text("id").primaryKey(),
    documentId: text("document_id").notNull(),
    title: text("title").notNull(),
    source: text("source").notNull(),
    content: text("content").notNull(),
    vector: text("vector").notNull(),
    model: text("model").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [index("idx_knowledge_owner_document").on(t.owner, t.documentId)],
);
