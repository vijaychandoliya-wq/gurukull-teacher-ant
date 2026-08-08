import {useCallback, useEffect, useState} from 'react';
import {ApiError} from './api';

/** Turns anything thrown by the API client into a sentence worth showing. */
export function friendlyError(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

/**
 * Loads data on mount and exposes the loading / refreshing / error states every
 * screen renders the same way.
 *
 * `loader` must be stable — wrap it in `useCallback` at the call site, the same
 * rule `useEffect` dependencies follow.
 */
export function useAsyncData<T>(loader: () => Promise<T>, initial: T) {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(
    async (refresh = false) => {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError('');
      try {
        setData(await loader());
      } catch (reason) {
        setError(friendlyError(reason));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [loader],
  );

  useEffect(() => {
    load();
  }, [load]);

  return {
    data,
    setData,
    loading,
    refreshing,
    error,
    setError,
    reload: load,
    refresh: useCallback(() => load(true), [load]),
    clearError: useCallback(() => setError(''), []),
  };
}

/** `2026-08-06` — the format every teacher endpoint expects for dates. */
export function formatDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * `2026-08-06 09:30:00` in the device's own timezone.
 *
 * Deliberately not `toISOString()`: the server stores what it is sent without
 * converting, so a UTC string would shift every reminder by the local offset.
 */
export function formatDateTime(value: Date) {
  const hours = String(value.getHours()).padStart(2, '0');
  const minutes = String(value.getMinutes()).padStart(2, '0');
  return `${formatDate(value)} ${hours}:${minutes}:00`;
}

/**
 * Drops a midnight time component from a server date.
 *
 * Several endpoints return day-granularity dates as `05-08-2026 00:00:00`; the
 * zeroed clock is noise in a notice or event line. A real time is left alone.
 */
export function cleanDate(value?: string | null) {
  return value ? String(value).replace(/\s+00:00:00$/, '') : '';
}

export function initials(name?: string) {
  return (name || 'Teacher')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(value => value[0]?.toUpperCase())
    .join('');
}

/** Ant's Picker wants `{label, value}` with string values. */
export function pickerData(items: any[], labelKey = 'name', valueKey = 'id') {
  return (items || []).map(item => ({
    label: String(item[labelKey] ?? item.title ?? item.name ?? ''),
    value: String(item[valueKey] ?? item.id),
  }));
}
