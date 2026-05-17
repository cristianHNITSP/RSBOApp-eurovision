import { useMemo } from 'react';

const modules = import.meta.glob('../pages/AppPage/sections/**/*.jsx', { eager: true });

export const searchRegistry = Object.values(modules)
  .filter((mod) => mod && mod.searchConfig)
  .map((mod) => mod.searchConfig);

const normalize = (str = '') =>
  str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

const matchesQuery = (entry, query) => {
  if (!query) return true;
  const haystack = [entry.title, entry.description, ...(entry.tags || [])]
    .filter(Boolean)
    .map(normalize)
    .join(' ');
  return haystack.includes(normalize(query));
};

export const filterRegistry = (query) => {
  if (!query || !query.trim()) return searchRegistry;
  return searchRegistry.filter((entry) => matchesQuery(entry, query.trim()));
};

export const findEntryById = (id) => searchRegistry.find((e) => e.id === id);

const useSearchRegistry = (query) => {
  return useMemo(() => filterRegistry(query), [query]);
};

export default useSearchRegistry;
