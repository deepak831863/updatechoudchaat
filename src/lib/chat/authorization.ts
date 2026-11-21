export function isConversationParticipant(
  conversation: { lowId: string; highId: string },
  userId: string,
): boolean {
  return conversation.lowId === userId || conversation.highId === userId;
}
