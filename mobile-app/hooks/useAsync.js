import { useCallback, useState } from 'react';

export const useAsync = (asyncFn) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const run = useCallback(
    async (...args) => {
      setLoading(true);
      setError(null);
      try {
        const result = await asyncFn(...args);
        if (!result?.success) {
          throw new Error(result?.error || 'Request failed');
        }
        return result;
      } catch (err) {
        setError(err.message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [asyncFn]
  );

  return { loading, error, run, setError };
};
