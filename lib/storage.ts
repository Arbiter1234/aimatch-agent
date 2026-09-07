import { getRuntimeEnv } from "./runtime-env";
export interface Statement {
  bind(...values: unknown[]): Statement;
  all<T>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
}
export interface Database {
  prepare(sql: string): Statement;
  batch(statements: Statement[]): Promise<unknown>;
}
export type MemoryItem = {
  id: string;
  kind: "preference" | "session";
  content: string;
  updated_at: number;
};
export type Chunk = {
  id: string;
  document_id: string;
  title: string;
  source: string;
  content: string;
  vector: string;
  model: string;
};
export class Store {
  constructor(
    private db: Database,
    private owner: string,
  ) {}
  async memories(): Promise<MemoryItem[]> {
    const r = await this.db
      .prepare(
        "SELECT id, kind, content, updated_at FROM memories WHERE owner = ? ORDER BY updated_at DESC LIMIT 20",
      )
      .bind(this.owner)
      .all<MemoryItem>();
    return r.results;
  }
  async saveMemory(
    kind: MemoryItem["kind"],
    content: string,
    id: string = crypto.randomUUID(),
  ) {
    // A guessed foreign ID cannot overwrite another owner's memory.
    await this.db
      .prepare(
        "INSERT INTO memories (owner,id,kind,content,updated_at) VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET content=excluded.content, updated_at=excluded.updated_at WHERE memories.owner=excluded.owner AND memories.kind=excluded.kind",
      )
      .bind(this.owner, id, kind, content.slice(0, 2000), Date.now())
      .run();
    await this.db
      .prepare(
        "DELETE FROM memories WHERE owner=? AND kind=? AND id NOT IN (SELECT id FROM memories WHERE owner=? AND kind=? ORDER BY updated_at DESC LIMIT 10)",
      )
      .bind(this.owner, kind, this.owner, kind)
      .run();
    return id;
  }
  async deleteMemory(id?: string) {
    return id
      ? this.db
          .prepare("DELETE FROM memories WHERE owner=? AND id=?")
          .bind(this.owner, id)
          .run()
      : this.db
          .prepare("DELETE FROM memories WHERE owner=?")
          .bind(this.owner)
          .run();
  }
  async chunks(): Promise<Chunk[]> {
    return (
      await this.db
        .prepare(
          "SELECT id,document_id,title,source,content,vector,model FROM knowledge_chunks WHERE owner=? ORDER BY id LIMIT 201",
        )
        .bind(this.owner)
        .all<Chunk>()
    ).results;
  }
  async addChunks(chunks: Chunk[]) {
    await this.db.batch(
      chunks.map((c) =>
        this.db
          .prepare(
            "INSERT INTO knowledge_chunks (owner,id,document_id,title,source,content,vector,model,updated_at) SELECT ?,?,?,?,?,?,?,?,? WHERE (SELECT count(*) FROM knowledge_chunks WHERE owner=?) < 200",
          )
          .bind(
            this.owner,
            c.id,
            c.document_id,
            c.title,
            c.source,
            c.content,
            c.vector,
            c.model,
            Date.now(),
            this.owner,
          ),
      ),
    );
  }
  async deleteDocument(id: string) {
    await this.db
      .prepare("DELETE FROM knowledge_chunks WHERE owner=? AND document_id=?")
      .bind(this.owner, id)
      .run();
  }
}
export function getStore(owner: string): Store {
  const db = getRuntimeEnv().DB;
  if (!db)
    throw new Error("数据库未配置，请先执行 npm run db:local 并重启服务。");
  return new Store(db, owner);
}
