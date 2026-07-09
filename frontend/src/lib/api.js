// API Client for ImmiPulse Backend

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
// Use the same dashboard api token for testing locally.
const API_TOKEN = process.env.NEXT_PUBLIC_DASHBOARD_TOKEN || 'generate_a_secure_random_token';

export async function fetchApi(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_TOKEN}`,
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `API Error: ${response.status}`);
  }

  return response.json();
}
