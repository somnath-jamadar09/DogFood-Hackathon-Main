import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export const useSubmissions = (selectedTrack = 'All', searchQuery = '') => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchGallery = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (selectedTrack && selectedTrack !== 'All') params.track = selectedTrack;
      if (searchQuery) params.search = searchQuery;

      const res = await api.get('/submissions/gallery', { params });
      if (res.success) {
        setSubmissions(res.data.submissions);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedTrack, searchQuery]);

  useEffect(() => {
    fetchGallery();
  }, [fetchGallery]);

  return { submissions, loading, error, refetch: fetchGallery };
};
