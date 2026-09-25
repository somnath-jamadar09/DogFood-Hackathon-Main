const axios = require('axios');

const FASTAPI_URL = process.env.JUDGING_SERVICE_URL || 'http://localhost:8000';

const fastApiClient = axios.create({
  baseURL: FASTAPI_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Call FastAPI scoring normalization microservice
 */
const normalizeScores = async (eventId, scores, bayesianPriorK = 3.0) => {
  try {
    const payload = {
      event_id: eventId.toString(),
      scores: scores.map((s) => ({
        judge_id: s.judgeId.toString(),
        submission_id: s.submissionId.toString(),
        raw_composite_score: Number(s.totalRawScore),
      })),
      bayesian_prior_k: bayesianPriorK,
    };

    const response = await fastApiClient.post('/api/v1/normalize', payload);
    return response.data;
  } catch (error) {
    console.error('[FastAPI Client Error] Normalization call failed:', error.response?.data || error.message);
    throw new Error(
      error.response?.data?.detail || 'Failed to normalize scores with judging microservice.'
    );
  }
};

/**
 * Call FastAPI Bradley-Terry pairwise ranking model
 */
const computePairwiseRankings = async (comparisons, maxIterations = 100, tolerance = 1e-6) => {
  try {
    const response = await fastApiClient.post('/api/v1/pairwise-rank', {
      comparisons,
      max_iterations: maxIterations,
      tolerance,
    });
    return response.data;
  } catch (error) {
    console.error('[FastAPI Client Error] Pairwise call failed:', error.response?.data || error.message);
    throw new Error(
      error.response?.data?.detail || 'Failed to compute pairwise rankings.'
    );
  }
};

/**
 * Check health of judging-service
 */
const checkJudgingServiceHealth = async () => {
  try {
    const response = await fastApiClient.get('/health');
    return response.data;
  } catch (error) {
    return { status: 'down', error: error.message };
  }
};

module.exports = {
  normalizeScores,
  computePairwiseRankings,
  checkJudgingServiceHealth,
};
