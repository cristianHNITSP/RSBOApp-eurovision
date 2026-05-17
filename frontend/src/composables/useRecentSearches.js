import { useEffect, useState } from 'react';
import { readStorage, writeStorage } from '../utils/storage.js';

const STORAGE_KEY = 'rsbo_recent_searches';
const MAX_ENTRIES = 8;

const loadInitial = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_ENTRIES) : [];
  } catch {
    return [];
  }
};

const listeners = new Set();
let state = loadInitial();

export const getRecent = () => state;

export const pushRecent = (id) => {
  if (!id) return;
  const without = state.filter((entry) => entry.id !== id);
  state = [{ id, timestamp: Date.now() }, ...without].slice(0, MAX_ENTRIES);
  writeStorage(STORAGE_KEY, state);
  listeners.forEach((l) => l(state));
};

export const clearRecent = () => {
  state = [];
  writeStorage(STORAGE_KEY, state);
  listeners.forEach((l) => l(state));
};

export const subscribeRecent = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useRecentSearches = () => {
  const [snapshot, setSnapshot] = useState(state);
  useEffect(() => subscribeRecent(setSnapshot), []);
  return snapshot;
};

export default useRecentSearches;
