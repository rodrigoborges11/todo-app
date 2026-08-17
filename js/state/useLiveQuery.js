import { useState, useEffect, useRef } from '../lib/preact.js';
import { liveQuery } from '../lib/dexie.js';

/**
 * Executa `queryFn` (uma promise) e volta a executar automaticamente sempre
 * que as tabelas Dexie que ela lê mudam. `deps` funciona como em useEffect.
 */
export function useLiveQuery(queryFn, deps = [], defaultValue = undefined) {
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState(null);
  const fnRef = useRef(queryFn);
  fnRef.current = queryFn;

  useEffect(() => {
    const observable = liveQuery(() => fnRef.current());
    const sub = observable.subscribe({
      next: (v) => { setValue(v); setError(null); },
      error: (e) => setError(e),
    });
    return () => sub.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return [value, error];
}
