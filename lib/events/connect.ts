// Self-contained mongoose connection for events admin CRUD.
// Binds explicitly to dbName 'main' because shared lib/connect.ts on origin/main
// calls mongoose.connect(uri) without a dbName option and resolves to 'test' on this
// host. Do NOT import the shared lib/connect.ts here — keep this isolated so the
// events module can be reverted by deleting its own files alone.

import mongoose, { Connection } from 'mongoose';

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  // Throw at import-time only in non-test contexts; route handlers will surface this.
  // Keep the message non-sensitive — never include the URI value.
  console.warn('[events/connect] MONGO_URI is not set; events routes will fail at runtime.');
}

type Cached = { conn: Connection | null; promise: Promise<Connection> | null };

declare global {
  // eslint-disable-next-line no-var
  var __eventsMongoose: Cached | undefined;
}

const cached: Cached =
  (global as typeof globalThis & { __eventsMongoose?: Cached }).__eventsMongoose ??
  ((global as typeof globalThis & { __eventsMongoose?: Cached }).__eventsMongoose = {
    conn: null,
    promise: null,
  });

export async function eventsConnect(): Promise<Connection> {
  if (cached.conn && cached.conn.readyState === 1) {
    return cached.conn;
  }
  if (!cached.promise) {
    if (!MONGO_URI) {
      throw new Error('events/connect: MONGO_URI not set');
    }
    cached.promise = mongoose
      .createConnection(MONGO_URI, { dbName: 'main' })
      .asPromise();
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
