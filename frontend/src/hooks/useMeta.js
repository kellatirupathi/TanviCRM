import { useEffect, useState } from 'react';
import { metaApi } from '../api/endpoints.js';

// Module-level cache so meta is fetched once per session.
let cache = null;
let inflight = null;

export function useMeta() {
  const [meta, setMeta] = useState(cache);

  useEffect(() => {
    if (cache) {
      setMeta(cache);
      return;
    }
    if (!inflight) inflight = metaApi.get();
    inflight
      .then((data) => {
        cache = data;
        setMeta(data);
      })
      .catch(() => {
        // Don't poison the cache — clear the in-flight promise so a later mount
        // can retry instead of being stuck with empty dropdowns all session.
        inflight = null;
        setMeta({ categories: [], paymentMethods: [], stylePreferences: [], segments: [] });
      });
  }, []);

  return meta;
}
