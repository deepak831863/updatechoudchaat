import assert from "node:assert/strict";
import test from "node:test";
import { isConversationParticipant } from "./authorization.ts";

test("conversation access accepts only lowId or highId participants", () => {
  const conversation = { lowId: "alice", highId: "bob" };
  assert.equal(isConversationParticipant(conversation, "alice"), true);
  assert.equal(isConversationParticipant(conversation, "bob"), true);
  assert.equal(isConversationParticipant(conversation, "mallory"), false);
});
