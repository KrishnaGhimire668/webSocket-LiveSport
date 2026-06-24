import { API_BASE_URL } from "../constants";

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}

export async function fetchMatches(limit = 100) {
  return apiRequest(`${API_BASE_URL}/matches?limit=${limit}`);
}

export async function fetchMatchCommentary(matchId, limit = 50) {
  return apiRequest(
    `${API_BASE_URL}/matches/${matchId}/commentary?limit=${limit}`
  );
}