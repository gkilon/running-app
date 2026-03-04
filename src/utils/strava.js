/**
 * Strava API integration
 *
 * Setup (one-time):
 * 1. Go to https://www.strava.com/settings/api
 * 2. Create an app — set "Authorization Callback Domain" to your domain (or "localhost")
 * 3. Copy Client ID and Client Secret into the app settings
 */

const STRAVA_AUTH_URL = 'https://www.strava.com/oauth/authorize';
const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';
const STRAVA_API = 'https://www.strava.com/api/v3';

export function getStravaAuthUrl(clientId, redirectUri) {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'activity:read_all',
  });
  return `${STRAVA_AUTH_URL}?${params}`;
}

export async function exchangeStravaCode(clientId, clientSecret, code) {
  const res = await fetch(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) throw new Error('שגיאה בהתחברות לסטרווה');
  return res.json();
}

export async function refreshStravaToken(clientId, clientSecret, refreshToken) {
  const res = await fetch(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) throw new Error('שגיאה בחידוש טוקן');
  return res.json();
}

export async function fetchStravaActivities(accessToken, page = 1, perPage = 50, afterTimestamp = null) {
  const query = { page, per_page: perPage, type: 'Run' };
  if (afterTimestamp) query.after = afterTimestamp;
  const params = new URLSearchParams(query);
  const res = await fetch(`${STRAVA_API}/athlete/activities?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('שגיאה בטעינת פעילויות');
  const activities = await res.json();
  // Filter only runs
  return activities.filter(a => a.type === 'Run' || a.sport_type === 'Run');
}

export async function fetchStravaAthlete(accessToken) {
  const res = await fetch(`${STRAVA_API}/athlete`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('שגיאה בטעינת פרופיל');
  return res.json();
}

/**
 * Convert a Strava activity to our internal run format
 */
export function stravaActivityToRun(activity) {
  const distKm = Math.round((activity.distance / 1000) * 100) / 100;
  const durationSec = activity.moving_time;
  const date = activity.start_date_local?.split('T')[0] || activity.start_date?.split('T')[0];

  return {
    id: `strava-${activity.id}`,
    date,
    distanceKm: distKm,
    timeSeconds: durationSec,
    type: classifyRun(activity),
    notes: activity.name || '',
    source: 'strava',
    stravaId: activity.id,
    avgHR: activity.average_heartrate || null,
    maxHR: activity.max_heartrate || null,
    elevationGain: activity.total_elevation_gain || 0,
  };
}

function classifyRun(activity) {
  const distKm = activity.distance / 1000;
  const avgPace = activity.moving_time / distKm; // sec/km

  if (distKm >= 15) return 'long';
  if (avgPace < 4 * 60) return 'interval'; // faster than 4:00/km
  if (avgPace < 5 * 60) return 'tempo';    // 4:00-5:00/km
  return 'easy';
}

/**
 * Check if token is expired and refresh if needed
 */
export async function getValidToken(stravaConfig) {
  const { accessToken, expiresAt, refreshToken, clientId, clientSecret } = stravaConfig;
  if (!accessToken) return null;

  const now = Math.floor(Date.now() / 1000);
  if (expiresAt && now < expiresAt - 300) {
    return accessToken; // Still valid
  }

  // Refresh
  const data = await refreshStravaToken(clientId, clientSecret, refreshToken);
  return { newToken: data.access_token, newExpiry: data.expires_at, newRefresh: data.refresh_token };
}
