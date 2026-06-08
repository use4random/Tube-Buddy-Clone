import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";
import bcrypt from "bcryptjs";

const { Pool } = pg;

const useRealDb = !!process.env.DATABASE_URL && process.env.USE_MOCK_DB !== "true";

export let pool: pg.Pool;
export let db: NodePgDatabase<typeof schema>;

if (useRealDb) {
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle(pool, { schema });
} else {
  console.log("ℹ️ [TubePulse DB] DATABASE_URL not set or USE_MOCK_DB=true. Falling back to in-memory mock database.");

  const now = Date.now();
  const hr = 3_600_000;
  const day = 86_400_000;

  const store: Record<string, any[]> = {
    users: [
      {
        id: 1,
        name: "Demo Creator",
        email: "demo@tubepulse.app",
        passwordHash: bcrypt.hashSync("password123", 10),
        avatarUrl: null,
        tier: "free",
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ],
    channels: [
      {
        id: 1,
        userId: 1,
        youtubeChannelId: "UC1234567890",
        name: "Demo Growth Channel",
        handle: "@demogrowth",
        thumbnailUrl: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=128&h=128&fit=crop",
        subscriberCount: 12450,
        videoCount: 48,
        isActive: true,
        createdAt: new Date()
      }
    ],
    subscriptions: [
      {
        id: 1,
        userId: 1,
        tier: "free",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ],
    keywords: [],
    keyword_searches: [],
    experiments: [],
    experiment_variants: [],
    bulk_jobs: [],
    comments: [
      { id: "yt_c1", channelId: 1, videoId: "dQw4w9WgXcQ", videoTitle: "How I Grew to 10k Subs in 6 Months", authorName: "Sarah K", text: "This video changed my channel completely! Went from 200 to 2k subs in 2 months. Thank you so much!", likeCount: 47, isReplied: false, isFlagged: false, publishedAt: new Date(now - hr) },
      { id: "yt_c2", channelId: 1, videoId: "dQw4w9WgXcQ", videoTitle: "How I Grew to 10k Subs in 6 Months", authorName: "Mike Torres", text: "Could you do a video specifically on thumbnail design? I feel like that's my biggest weakness right now", likeCount: 23, isReplied: false, isFlagged: false, publishedAt: new Date(now - 2 * hr) },
      { id: "yt_c3", channelId: 1, videoId: "dQw4w9WgXcQ", videoTitle: "How I Grew to 10k Subs in 6 Months", authorName: "Emma L", text: "Great content as always! Do you recommend posting daily or 3x per week for a new channel?", likeCount: 15, isReplied: true, isFlagged: false, publishedAt: new Date(now - day) },
      { id: "yt_c4", channelId: 1, videoId: "abc123xyz", videoTitle: "YouTube SEO Secrets 2024", authorName: "Spam Bot 9000", text: "Buy cheap views and subscribers!! 1000 subs for only $5!! Click here: spam.link/fake", likeCount: 0, isReplied: false, isFlagged: true, publishedAt: new Date(now - 3 * hr) },
      { id: "yt_c5", channelId: 1, videoId: "abc123xyz", videoTitle: "YouTube SEO Secrets 2024", authorName: "David Chen", text: "Subscribed! Been watching you for 3 years and this is your best video yet. Keep it up!", likeCount: 31, isReplied: false, isFlagged: false, publishedAt: new Date(now - 2 * day) },
      { id: "yt_c6", channelId: 1, videoId: "abc123xyz", videoTitle: "YouTube SEO Secrets 2024", authorName: "Julia R", text: "Wait, at 4:32 you mention using TubePulse — does that actually work for small channels too?", likeCount: 8, isReplied: false, isFlagged: false, publishedAt: new Date(now - 3 * day) },
      { id: "yt_c7", channelId: 1, videoId: "xyz789abc", videoTitle: "The Perfect Upload Schedule", authorName: "Priya M", text: "Best YouTube growth tutorial I've watched this year. The keyword strategy alone doubled my CTR!", likeCount: 62, isReplied: false, isFlagged: false, publishedAt: new Date(now - 4 * hr) },
      { id: "yt_c8", channelId: 1, videoId: "xyz789abc", videoTitle: "The Perfect Upload Schedule", authorName: "Tom W", text: "I've been struggling with monetization for ages. Would love a dedicated video on AdSense approval tips.", likeCount: 19, isReplied: false, isFlagged: false, publishedAt: new Date(now - 5 * hr) },
    ],
    canned_responses: [
      { id: 1, channelId: 1, label: "Thank you", body: "Thank you so much! I really appreciate the feedback and support.", useCount: 12, tags: ["thanks", "growth"] },
      { id: 2, channelId: 1, label: "Post frequency", body: "I post new videos every Tuesday and Thursday at 10 AM EST. Stay tuned!", useCount: 5, tags: ["schedule"] },
    ],
    competitors: [
      { id: 1, channelId: 1, youtubeChannelId: "UC_comp1", name: "Growth Guru", handle: "@growthguru", subscriberCount: 45000, videoCount: 120, avgViews: 8500, uploadFrequency: 2.5, createdAt: new Date() },
      { id: 2, channelId: 1, youtubeChannelId: "UC_comp2", name: "Video Academy", handle: "@videoacademy", subscriberCount: 92000, videoCount: 310, avgViews: 15400, uploadFrequency: 1.0, createdAt: new Date() },
    ],
  };

  function getTableName(table: any): string {
    if (typeof table === 'string') return table;
    const sym = Symbol.for('drizzle:Name');
    if (table && table[sym]) return table[sym];
    if (table && table._ && table._.name) return table._.name;
    return String(table);
  }

  function evaluateCondition(expr: any, row: any): boolean {
    if (!expr) return true;
    const chunks = expr.queryChunks;
    if (!chunks) return true;

    if (chunks.length === 5) {
      const colObj = chunks[1];
      const opChunk = chunks[2];
      const valObj = chunks[3];
      if (colObj && opChunk && valObj) {
        const colName = colObj.name;
        const op = (opChunk.value?.[0] || opChunk.value || "").trim();
        const val = valObj.value;
        const rowVal = row[colName];

        if (op === '=') return String(rowVal) === String(val);
        if (op === '>=') return new Date(rowVal) >= new Date(val);
        if (op === '>') return rowVal > val;
        if (op === '<=') return new Date(rowVal) <= new Date(val);
        if (op === '<') return rowVal < val;
        if (op === '!=') return String(rowVal) !== String(val);
      }
    } else if (chunks.length === 3) {
      const innerSQL = chunks[1];
      if (innerSQL && innerSQL.queryChunks) {
        const innerChunks = innerSQL.queryChunks;
        if (innerChunks.length === 3) {
          const cond1 = innerChunks[0];
          const op = (innerChunks[1].value?.[0] || innerChunks[1].value || "").trim();
          const cond2 = innerChunks[2];
          if (op === 'and') return evaluateCondition(cond1, row) && evaluateCondition(cond2, row);
          if (op === 'or') return evaluateCondition(cond1, row) || evaluateCondition(cond2, row);
        }
      }
    }
    return true;
  }

  function insertRow(tableName: string, val: any): any {
    const tableRows = store[tableName];
    if (!tableRows) return val;

    let nextId: any;
    if (tableName === 'comments') {
      nextId = val.id || 'yt_c' + Math.random().toString(36).substring(2, 11);
    } else {
      const ids = tableRows.map(r => r.id).filter(id => typeof id === 'number');
      nextId = ids.length > 0 ? Math.max(...ids) + 1 : 1;
    }

    const newRow = {
      id: nextId,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...val
    };
    tableRows.push(newRow);
    return newRow;
  }

  class MockQueryBuilder {
    private tableName: string = '';
    private conditions: any = null;
    private action: 'select' | 'insert' | 'update' | 'delete' = 'select';
    private insertData: any = null;
    private updateData: any = null;
    private selectFields: any = null;

    constructor(action: 'select' | 'insert' | 'update' | 'delete', selectFields?: any) {
      this.action = action;
      this.selectFields = selectFields;
    }

    from(table: any) {
      this.tableName = getTableName(table);
      return this;
    }

    where(cond: any) {
      this.conditions = cond;
      return this;
    }

    values(data: any) {
      this.insertData = data;
      return this;
    }

    set(data: any) {
      this.updateData = data;
      return this;
    }

    returning() {
      return this;
    }

    onConflictDoNothing() {
      return this;
    }

    async execute() {
      const latency = Number(process.env.DB_LATENCY_MS ?? '0');
      if (latency > 0) {
        await new Promise(resolve => setTimeout(resolve, latency));
      }

      const failRate = Number(process.env.DB_FAIL_RATE ?? '0');
      if (failRate > 0 && Math.random() < failRate) {
        throw new Error("Simulated database connection failure");
      }

      const tableRows = store[this.tableName];
      if (this.action === 'select') {
        if (!tableRows) return [];
        const filtered = tableRows.filter(row => evaluateCondition(this.conditions, row));
        if (this.selectFields && this.selectFields.count) {
          return [{ count: filtered.length }];
        }
        return JSON.parse(JSON.stringify(filtered)); // deep clone to prevent mutations
      }

      if (this.action === 'insert') {
        let inserted: any[];
        if (Array.isArray(this.insertData)) {
          inserted = this.insertData.map(d => insertRow(this.tableName, d));
        } else {
          inserted = [insertRow(this.tableName, this.insertData)];
        }
        return JSON.parse(JSON.stringify(inserted));
      }

      if (this.action === 'update') {
        if (!tableRows) return [];
        const updatedRows: any[] = [];
        for (const row of tableRows) {
          if (evaluateCondition(this.conditions, row)) {
            for (const [k, v] of Object.entries(this.updateData)) {
              if (v && typeof v === 'object' && (v as any).queryChunks) {
                row[k] = (row[k] || 0) + 1;
              } else {
                row[k] = v;
              }
            }
            row.updatedAt = new Date();
            updatedRows.push(row);
          }
        }
        return JSON.parse(JSON.stringify(updatedRows));
      }

      if (this.action === 'delete') {
        if (!tableRows) return;
        store[this.tableName] = tableRows.filter(row => !evaluateCondition(this.conditions, row));
        return;
      }

      return [];
    }

    then(resolve: any, reject?: any) {
      return this.execute().then(resolve, reject);
    }

    catch(onRejected: any) {
      return this.execute().catch(onRejected);
    }
  }

  pool = {
    connect: async () => ({ release: () => {} }),
    query: async () => ({ rows: [] }),
    on: () => {},
    end: async () => {},
  } as unknown as pg.Pool;

  db = {
    select: (fields?: any) => new MockQueryBuilder('select', fields),
    insert: (table: any) => new MockQueryBuilder('insert').from(table),
    update: (table: any) => new MockQueryBuilder('update').from(table),
    delete: (table: any) => new MockQueryBuilder('delete').from(table),
  } as unknown as NodePgDatabase<typeof schema>;
}

export * from "./schema";
