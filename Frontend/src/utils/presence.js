const VISITOR_ID_KEY = 'workbridge_visitor_id';

export const getVisitorId = () => {
  if (typeof window === 'undefined') return '';

  const existing = localStorage.getItem(VISITOR_ID_KEY);
  if (existing) return existing;

  const nextId = window.crypto?.randomUUID?.()
    || `visitor_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  localStorage.setItem(VISITOR_ID_KEY, nextId);
  return nextId;
};
