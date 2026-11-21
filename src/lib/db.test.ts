import assert from "node:assert/strict";
import test from "node:test";
import { getMongoDatabaseConfig } from "./db.ts";

test("MongoDB configuration requires MONGODB_URI", () => {
  assert.throws(
    () => getMongoDatabaseConfig({}),
    /set MONGODB_URI/,
  );
});

test("MongoDB configuration trims the URI and supports a custom database name", () => {
  assert.deepEqual(
    getMongoDatabaseConfig({
      MONGODB_URI: "  mongodb://localhost:27017  ",
      MONGODB_DB_NAME: " cloudchat-test ",
    }),
    {
      uri: "mongodb://localhost:27017",
      databaseName: "cloudchat-test",
    },
  );
});
