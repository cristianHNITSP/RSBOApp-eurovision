import { useState, useEffect } from 'react';
import { DEFAULT_PREFERENCES, STORAGE_KEY } from '../data/preferences.js';
import { readStorage, writeStorage } from '../utils/storage.js';
import { applyPreferencesToDOM } from '../utils/applyPreferencesToDOM.js';

const listeners = new Set();
let state = readStorage(STORAGE_KEY, DEFAULT_PREFERENCES);
applyPreferencesToDOM(state);

export const getPreferences = () => state;

export const setPreferences = (patch) => {
  state = { ...state, ...patch };
  writeStorage(STORAGE_KEY, state);
  applyPreferencesToDOM(state);
  listeners.forEach((l) => l(state));
};

export const subscribePreferences = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const usePreferences = () => {
  const [snapshot, setSnapshot] = useState(state);
  useEffect(() => subscribePreferences(setSnapshot), []);
  return snapshot;
};
