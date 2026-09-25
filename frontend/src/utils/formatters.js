export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const d = new Date(dateString);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatScore = (score, digits = 2) => {
  if (score === null || score === undefined) return '—';
  return Number(score).toFixed(digits);
};

export const getTrackBadgeColor = (track) => {
  switch (track) {
    case 'AI/ML':
      return 'bg-purple-900/40 text-purple-300 border-purple-700/50';
    case 'Web3 & Blockchain':
      return 'bg-amber-900/40 text-amber-300 border-amber-700/50';
    case 'FinTech':
      return 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50';
    case 'HealthTech':
      return 'bg-rose-900/40 text-rose-300 border-rose-700/50';
    default:
      return 'bg-blue-900/40 text-blue-300 border-blue-700/50';
  }
};
