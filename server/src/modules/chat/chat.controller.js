import * as service from './chat.service.js';

export async function create(req, res) {
  const session = await service.createSession(req.userId, req.validated.body?.title);
  res.status(201).json({ session });
}

export async function list(req, res) {
  const sessions = await service.getSessions(req.userId);
  res.json({ sessions });
}

export async function getOne(req, res) {
  const session = await service.getSessionDetails(req.userId, req.validated.params.id);
  res.json({ session });
}

export async function remove(req, res) {
  const result = await service.deleteSession(req.userId, req.validated.params.id);
  res.json(result);
}

export async function clearMessages(req, res) {
  const result = await service.clearSessionMessages(req.userId, req.validated.params.id);
  res.json(result);
}

export async function removeMessage(req, res) {
  const result = await service.deleteSessionMessage(
    req.userId,
    req.validated.params.id,
    req.validated.params.messageId,
  );
  res.json(result);
}

const activeGenerations = new Map(); // key: `${userId}:${sessionId}` -> AbortController

export async function stopMessageGeneration(req, res) {
  const key = `${req.userId}:${req.validated.params.id}`;
  const controller = activeGenerations.get(key);
  if (controller) {
    controller.abort();
    activeGenerations.delete(key);
    return res.json({ stopped: true });
  }
  res.json({ stopped: false, message: 'No active generation found' });
}

export async function sendMessage(req, res) {
  const key = `${req.userId}:${req.validated.params.id}`;
  if (activeGenerations.has(key)) {
    try {
      activeGenerations.get(key).abort();
    } catch {
      // ignore
    }
  }

  const abortController = new AbortController();
  activeGenerations.set(key, abortController);

  try {
    const result = await service.sendChatMessage(
      req.userId,
      req.validated.params.id,
      req.validated.body.content,
      abortController.signal,
    );
    res.status(201).json(result);
  } catch (err) {
    if (abortController.signal.aborted || err.name === 'AbortError') {
      if (!res.headersSent) {
        res.status(499).json({ error: { message: 'Generation stopped by user', code: 'CLIENT_ABORTED' } });
      }
      return;
    }
    throw err;
  } finally {
    if (activeGenerations.get(key) === abortController) {
      activeGenerations.delete(key);
    }
  }
}
