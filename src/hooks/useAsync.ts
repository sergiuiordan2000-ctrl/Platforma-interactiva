/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Faza 5.3 (B2 §7): încărcarea asincronă a datelor de la server, cu stările încărcare / eroare / gol.
 * `reload()` reîncarcă explicit (după o mutație); răspunsurile vechi, sosite după unul mai nou, sunt ignorate.
 */
export function useAsync<T>(load: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(load, deps);

  const reload = useCallback(async () => {
    const id = ++seq.current;
    setLoading(true);
    setError(null);
    try {
      const value = await run();
      if (id === seq.current) setData(value);
    } catch (err) {
      if (id === seq.current) setError(err instanceof Error ? err.message : 'A apărut o eroare. Încercați din nou.');
    } finally {
      if (id === seq.current) setLoading(false);
    }
  }, [run]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, loading, error, reload };
}
