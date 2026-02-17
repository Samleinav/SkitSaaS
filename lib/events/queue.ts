import { getRedisClient } from './redis';
import type { EventEnvelope } from './types';

export const DEFAULT_EVENT_QUEUE_KEY = 'events:queue';

export async function enqueueEvent(
  envelope: EventEnvelope,
  queueKey = DEFAULT_EVENT_QUEUE_KEY
): Promise<boolean> {
  const client = await getRedisClient();
  if (!client) {
    return false;
  }

  try {
    await client.lPush(queueKey, JSON.stringify(envelope));
    return true;
  } catch (error) {
    console.error('Unable to enqueue event:', error);
    return false;
  }
}

export async function dequeueEvent(
  queueKey = DEFAULT_EVENT_QUEUE_KEY
): Promise<EventEnvelope | null> {
  const client = await getRedisClient();
  if (!client) {
    return null;
  }

  try {
    const payload = await client.rPop(queueKey);
    if (!payload) {
      return null;
    }

    return JSON.parse(payload) as EventEnvelope;
  } catch (error) {
    console.error('Unable to dequeue event:', error);
    return null;
  }
}
