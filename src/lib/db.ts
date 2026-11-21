import { MongoClient, type Db } from "mongodb";

export type MongoDatabaseConfig = {
  uri: string;
  databaseName: string;
};

type MongoGlobal = typeof globalThis & {
  __cloudchatMongoClientPromise__?: Promise<MongoClient>;
};

export function getMongoDatabaseConfig(
  env: Record<string, string | undefined> = process.env,
): MongoDatabaseConfig {
  const uri = env.MONGODB_URI?.trim();
  if (!uri) {
    throw new Error(
      "MongoDB is not configured: set MONGODB_URI to a valid MongoDB connection string.",
    );
  }
  return {
    uri,
    databaseName: env.MONGODB_DB_NAME?.trim() || "cloudchat",
  };
}

export function getMongoClient(): Promise<MongoClient> {
  if (typeof window !== "undefined") {
    throw new Error("MongoDB is server-only.");
  }
  const globalRef = globalThis as MongoGlobal;
  globalRef.__cloudchatMongoClientPromise__ ??= (async () => {
    const { uri } = getMongoDatabaseConfig();
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 10_000,
      maxPoolSize: 10,
    });
    await client.connect();
    return client;
  })().catch((error) => {
    const global = globalThis as MongoGlobal;
    global.__cloudchatMongoClientPromise__ = undefined;
    throw error;
  });
  return globalRef.__cloudchatMongoClientPromise__;
}

export async function getMongoDatabase(): Promise<Db> {
  const { databaseName } = getMongoDatabaseConfig();
  return (await getMongoClient()).db(databaseName);
}

export async function ensureMongoIndexes(): Promise<void> {
  const db = await getMongoDatabase();
  await Promise.all([
    db.collection("profiles").createIndex({ userId: 1 }, { unique: true }),
    db.collection("conversations").createIndex(
      { lowId: 1, highId: 1 },
      { unique: true },
    ),
    db.collection("conversations").createIndex({ lowId: 1, updatedAt: -1 }),
    db.collection("conversations").createIndex({ highId: 1, updatedAt: -1 }),
    db.collection("messages").createIndex({ conversationId: 1, createdAt: 1 }),
    db.collection("messages").createIndex({ id: 1 }, { unique: true }),
    db.collection("hides").createIndex(
      { messageId: 1, userId: 1 },
      { unique: true },
    ),
    db.collection("typing").createIndex(
      { conversationId: 1, userId: 1 },
      { unique: true },
    ),
    db.collection("typing").createIndex(
      { untilAt: 1 },
      { expireAfterSeconds: 0 },
    ),
    db.collection("user").createIndex({ email: 1 }),
    db.collection("user").createIndex({ name: 1 }),
    db.collection("session").createIndex({ token: 1 }, { unique: true }),
    db.collection("session").createIndex({ userId: 1 }),
    db.collection("session").createIndex({ expiresAt: 1 }),
    db.collection("account").createIndex({ userId: 1 }),
    db.collection("account").createIndex(
      { providerId: 1, accountId: 1 },
      { unique: true },
    ),
    db.collection("verification").createIndex({ identifier: 1 }),
    db.collection("verification").createIndex({ expiresAt: 1 }),
  ]);
}

export async function ensureDbReady(): Promise<void> {
  await ensureMongoIndexes();
}
