import { useState, useEffect, useRef } from '../lib/preact.js';
import { subscribeToChanges } from '../db/invalidator.js';

export function useLiveQuery(queryFn, deps = [], defaultValue = undefined) {
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0);
  const fnRef = useRef(queryFn);
  fnRef.current = queryFn;

  useEffect(() => subscribeToChanges(() => setTick(t => t + 1)), []);

  useEffect(() => {
    let cancelled = false;
    fnRef.current()
      .then(v => { if (!cancelled) { setValue(v); setError(null); } })
      .catch(e => { if (!cancelled) setError(e); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  return [value, error];
}
