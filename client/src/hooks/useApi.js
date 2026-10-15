import { useCallback, useEffect, useState } from 'react';

/* Loads data once on mount and exposes loading / error / reload, so every
   page handles a failed request the same way instead of going blank.
   Pass one loader or an array of loaders (fetched in parallel). */
export function useApi(loader) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(
    () =>
      (Array.isArray(loader) ? Promise.all(loader.map((fn) => fn())) : loader())
        .then((result) => {
          setData(result);
          setError('');
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const reload = () => {
    setLoading(true);
    setError('');
    return fetchData();
  };

  return { data, setData, error, loading, reload };
}
