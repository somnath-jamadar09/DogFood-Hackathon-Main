import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export const useJudging = () => {
  const [queue, setQueue] = useState([]);
  const [rubric, setRubric] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const [queueRes, rubricRes] = await Promise.all([
        api.get('/judging/assigned'),
        api.get('/judging/rubric'),
      ]);

      if (queueRes.success) setQueue(queueRes.data.queue);
      if (rubricRes.success) setRubric(rubricRes.data.rubric);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  return { queue, rubric, loading, error, refetch: fetchQueue };
};
