import { v4 as uuidv4 } from 'uuid';

export interface QueueAction {
  id: string;
  agendaId: string;
  type: 'UPDATE_ITEMS' | 'UPDATE_AGENDA';
  payload: any;
  timestamp: number;
  retries?: number;
}

const QUEUE_STORAGE_KEY = 'flashagenda_offline_queue';
const CACHE_PREFIX = 'flashagenda_cache_';
const MAX_RETRIES = 5;

type SyncListener = (isOnline: boolean, pendingCount: number) => void;
const listeners: Set<SyncListener> = new Set();

export const getOfflineQueue = (): QueueAction[] => {
  try {
    const data = localStorage.getItem(QUEUE_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error('Error reading offline queue:', err);
    return [];
  }
};

export const saveOfflineQueue = (queue: QueueAction[]) => {
  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    notifyListeners();
  } catch (err) {
    console.error('Error saving offline queue:', err);
  }
};

export const clearOfflineQueue = () => {
  saveOfflineQueue([]);
};

export const enqueueAction = (
  agendaId: string,
  type: 'UPDATE_ITEMS' | 'UPDATE_AGENDA',
  payload: any
): QueueAction => {
  const queue = getOfflineQueue();
  
  // If there is already a pending update of the same type for this agenda, merge payload
  const existingIdx = queue.findIndex(
    (a) => a.agendaId === agendaId && a.type === type
  );
  
  let finalPayload = payload;
  if (existingIdx !== -1) {
    const existingPayload = queue[existingIdx].payload;
    if (
      existingPayload &&
      typeof existingPayload === 'object' &&
      payload &&
      typeof payload === 'object' &&
      !Array.isArray(existingPayload) &&
      !Array.isArray(payload)
    ) {
      finalPayload = { ...existingPayload, ...payload };
    }
  }

  const newAction: QueueAction = {
    id: uuidv4(),
    agendaId,
    type,
    payload: finalPayload,
    timestamp: Date.now(),
    retries: 0,
  };

  if (existingIdx !== -1) {
    queue[existingIdx] = newAction;
  } else {
    queue.push(newAction);
  }

  saveOfflineQueue(queue);
  return newAction;
};

export const getCachedAgenda = (agendaId: string) => {
  try {
    const cached = localStorage.getItem(CACHE_PREFIX + agendaId);
    return cached ? JSON.parse(cached) : null;
  } catch (err) {
    console.error('Error reading cached agenda:', err);
    return null;
  }
};

export const setCachedAgenda = (agendaId: string, data: any) => {
  try {
    localStorage.setItem(CACHE_PREFIX + agendaId, JSON.stringify(data));
  } catch (err) {
    console.error('Error saving cached agenda:', err);
  }
};

export const processOfflineQueue = async (onSuccess?: (agendaId: string, updatedData: any) => void) => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  const queue = getOfflineQueue();
  if (queue.length === 0) return;

  const remainingQueue: QueueAction[] = [];

  for (const action of queue) {
    try {
      let endpoint = `/api/agendas/${action.agendaId}`;
      let bodyData = action.payload;

      if (action.type === 'UPDATE_ITEMS' && Array.isArray(action.payload)) {
        bodyData = { items: action.payload };
      }

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      });

      if (response.ok) {
        const updatedAgenda = await response.json();
        setCachedAgenda(action.agendaId, updatedAgenda);
        if (onSuccess) {
          onSuccess(action.agendaId, updatedAgenda);
        }
      } else if (response.status >= 400 && response.status < 500) {
        // 4xx errors (e.g. 403 Forbidden, 404 Not Found) will never succeed — drop action from queue
        console.warn(`Dropping unresolvable 4xx offline action (${response.status}):`, action);
      } else {
        // 5xx server errors — retry up to MAX_RETRIES times
        const currentRetries = (action.retries || 0) + 1;
        if (currentRetries < MAX_RETRIES) {
          remainingQueue.push({ ...action, retries: currentRetries });
        } else {
          console.warn(`Dropping offline action after ${MAX_RETRIES} failed attempts:`, action);
        }
      }
    } catch (err) {
      console.error('Sync action failed:', action, err);
      const currentRetries = (action.retries || 0) + 1;
      if (currentRetries < MAX_RETRIES) {
        remainingQueue.push({ ...action, retries: currentRetries });
      } else {
        console.warn(`Dropping offline action after ${MAX_RETRIES} network errors:`, action);
      }
    }
  }

  saveOfflineQueue(remainingQueue);
};

export const notifyOfflineState = (isOnline: boolean) => {
  const pendingCount = getOfflineQueue().length;
  listeners.forEach((listener) => listener(isOnline, pendingCount));
};

const notifyListeners = () => {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  notifyOfflineState(isOnline);
};

export const subscribeOfflineSync = (listener: SyncListener) => {
  listeners.add(listener);
  // Immediate notification
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  listener(isOnline, getOfflineQueue().length);
  return () => {
    listeners.delete(listener);
  };
};

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    notifyOfflineState(true);
    processOfflineQueue();
  });
  window.addEventListener('offline', () => {
    notifyOfflineState(false);
  });
  setInterval(() => {
    const isOnline = navigator.onLine;
    notifyOfflineState(isOnline);
    if (isOnline && getOfflineQueue().length > 0) {
      processOfflineQueue();
    }
  }, 3000);
}
