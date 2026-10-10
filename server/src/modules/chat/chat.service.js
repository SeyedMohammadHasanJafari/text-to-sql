import { adminPool } from '#db/pools.js';
import { notFound } from '#lib/errors.js';
import { runAgentConversation } from './agentExecutor.js';
import {
  deleteSessionRecord,
  deleteSessionMessagesRecord,
  deleteMessageRecord,
  findSession,
  insertMessage,
  insertSession,
  listSessionMessages,
  listSessions,
  updateSessionTitle,
} from './chat.repository.js';

export async function createSession(userId, title = 'New chat') {
  const existing = await listSessions(adminPool, userId);
  const emptySession = existing.find((s) => Number(s.messageCount) === 0);
  if (emptySession) {
    return emptySession;
  }
  return insertSession(adminPool, { userId, title });
}

export async function getSessions(userId) {
  const sessions = await listSessions(adminPool, userId);
  const emptySessions = sessions.filter((s) => Number(s.messageCount) === 0);
  if (emptySessions.length > 1) {
    // Keep the most recent empty session, delete the older empty ones
    const toDelete = emptySessions.slice(1);
    for (const old of toDelete) {
      await deleteSessionRecord(adminPool, userId, old.id).catch(() => {});
    }
    return sessions.filter((s) => !toDelete.some((d) => d.id === s.id));
  }
  return sessions;
}

export async function getSessionDetails(userId, sessionId) {
  const session = await findSession(adminPool, userId, sessionId);
  if (!session) {
    throw notFound('Chat session not found');
  }

  const messages = await listSessionMessages(adminPool, sessionId);
  return {
    ...session,
    messages,
  };
}

export async function deleteSession(userId, sessionId) {
  const deleted = await deleteSessionRecord(adminPool, userId, sessionId);
  if (!deleted) {
    throw notFound('Chat session not found');
  }
  return { id: sessionId, deleted: true };
}

export async function clearSessionMessages(userId, sessionId) {
  const session = await findSession(adminPool, userId, sessionId);
  if (!session) {
    throw notFound('Chat session not found');
  }
  await deleteSessionMessagesRecord(adminPool, sessionId);
  return { sessionId, cleared: true };
}

export async function deleteSessionMessage(userId, sessionId, messageId) {
  const session = await findSession(adminPool, userId, sessionId);
  if (!session) {
    throw notFound('Chat session not found');
  }
  const deleted = await deleteMessageRecord(adminPool, sessionId, messageId);
  if (!deleted) {
    throw notFound('Message not found');
  }
  return { messageId, deleted: true };
}

/**
 * Handles a user turn in a chat session:
 *  1. Verifies ownership of the session
 *  2. Loads multi-turn message history
 *  3. Persists the user message
 *  4. Executes the AI Agent with tool calling (SQL execution + chart generation)
 *  5. Persists the assistant response with SQL query and chart data
 *  6. Auto-names the chat session if it's new
 */
export async function sendChatMessage(userId, sessionId, content, signal = null) {
  const session = await findSession(adminPool, userId, sessionId);
  if (!session) {
    throw notFound('Chat session not found');
  }

  // 1. Load previous message history for multi-turn context
  const existingMessages = await listSessionMessages(adminPool, sessionId);

  // 2. Persist the user message
  const userMessage = await insertMessage(adminPool, {
    sessionId,
    role: 'user',
    content: content.trim(),
  });

  try {
    if (signal?.aborted) {
      const abortErr = new Error('Request aborted');
      abortErr.name = 'AbortError';
      throw abortErr;
    }

    // 3. Format history for agent (last 10 turns)
    const historyForAgent = existingMessages.slice(-10).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // 4. Run the AI agent
    const agentResponse = await runAgentConversation({
      userId,
      conversationHistory: historyForAgent,
      userPrompt: content.trim(),
      signal,
    });

    if (signal?.aborted) {
      const abortErr = new Error('Request aborted');
      abortErr.name = 'AbortError';
      throw abortErr;
    }

    // 5. Persist assistant response
    const assistantMessage = await insertMessage(adminPool, {
      sessionId,
      role: 'assistant',
      content: agentResponse.content,
      sqlQuery: agentResponse.sqlQuery,
      chartData: agentResponse.chartData,
    });

    // 6. Update session title if it's the first question (first 3 words of prompt)
    let sessionTitle = session.title;
    if (existingMessages.length === 0 || session.title === 'New chat') {
      const words = content.trim().split(/\s+/).filter(Boolean);
      const autoTitle = words.slice(0, 3).join(' ');
      if (autoTitle) {
        await updateSessionTitle(adminPool, sessionId, autoTitle);
        sessionTitle = autoTitle;
      }
    }

    return {
      userMessage,
      assistantMessage,
      sessionTitle,
    };
  } catch (err) {
    // If request was cancelled by client, delete the pending user message so no ghost message remains
    if (signal?.aborted || err.name === 'AbortError') {
      await deleteMessageRecord(adminPool, sessionId, userMessage.id).catch(() => {});
      const abortErr = new Error('Generation stopped by user');
      abortErr.name = 'AbortError';
      throw abortErr;
    }
    throw err;
  }
}
