import { useState } from 'react';
import { getStravaAuthUrl, exchangeStravaCode, fetchStravaAthlete } from '../utils/strava';

export default function StravaConnect({ strava, onUpdate, onSync, stravaLoading, stravaError }) {
  const [clientId, setClientId]     = useState(strava.clientId || '');
  const [clientSecret, setClientSecret] = useState(strava.clientSecret || '');
  const [status, setStatus]         = useState('');
  const [exchanging, setExchanging] = useState(false);

  const isConnected = !!strava.accessToken;

  // Check if we have an OAuth code in URL (callback from Strava)
  const urlParams = new URLSearchParams(window.location.search);
  const oauthCode = urlParams.get('code');

  async function handleExchangeCode() {
    if (!oauthCode || !clientId || !clientSecret) return;
    setExchanging(true);
    setStatus('מחבר לסטרווה...');
    try {
      const data = await exchangeStravaCode(clientId, clientSecret, oauthCode);
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);

      const athlete = await fetchStravaAthlete(data.access_token);
      onUpdate({
        clientId, clientSecret,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: data.expires_at,
        athlete,
      });
      setStatus('✅ מחובר ל-Strava!');
    } catch (err) {
      setStatus('❌ שגיאה: ' + err.message);
    } finally {
      setExchanging(false);
    }
  }

  function handleConnect() {
    if (!clientId) { setStatus('הכנס Client ID'); return; }
    onUpdate({ clientId, clientSecret });
    const redirectUri = window.location.origin + window.location.pathname;
    window.location.href = getStravaAuthUrl(clientId, redirectUri);
  }

  function handleDisconnect() {
    onUpdate({ accessToken: '', refreshToken: '', expiresAt: null, athlete: null });
  }

  return (
    <div className="strava-section">
      <div className="strava-header">
        <div className="strava-logo">🟠 Strava</div>
        {isConnected && (
          <div className="strava-connected-badge">✓ מחובר</div>
        )}
      </div>

      {isConnected ? (
        <div className="strava-connected">
          {strava.athlete && (
            <div className="strava-athlete">
              {strava.athlete.profile_medium && (
                <img src={strava.athlete.profile_medium} alt="profile" className="strava-avatar" />
              )}
              <div>
                <div className="strava-name">{strava.athlete.firstname} {strava.athlete.lastname}</div>
                <div className="strava-meta">
                  {strava.athlete.city && `${strava.athlete.city} · `}
                  {strava.athlete.follower_count} עוקבים
                </div>
              </div>
            </div>
          )}
          <div className="strava-actions">
            <button
              className="btn-primary"
              onClick={() => onSync()}
              disabled={stravaLoading}
            >
              {stravaLoading ? '⟳ מסנכרן...' : '🔄 סנכרן פעילויות'}
            </button>
            <button className="btn-ghost small" onClick={handleDisconnect}>נתק</button>
          </div>
          {stravaError && <div className="strava-error">{stravaError}</div>}
        </div>
      ) : (
        <div className="strava-setup">
          {oauthCode && clientId && clientSecret ? (
            <div>
              <div className="strava-oauth-ready">✅ קיבלנו אישור מ-Strava! לחץ לסיים חיבור.</div>
              <button className="btn-primary" onClick={handleExchangeCode} disabled={exchanging}>
                {exchanging ? 'מחבר...' : 'סיים חיבור לסטרווה'}
              </button>
            </div>
          ) : (
            <>
              <p className="strava-guide">
                חיבור Strava מייבא אוטומטית את כל הריצות שלך ומחשב VDOT אמיתי מהביצועים שלך.
              </p>

              <div className="strava-steps">
                <div className="strava-step">
                  <span className="step-num">1</span>
                  <span>עבור ל- <strong>strava.com/settings/api</strong> → צור אפליקציה חדשה</span>
                </div>
                <div className="strava-step">
                  <span className="step-num">2</span>
                  <span>בשדה <em>"Authorization Callback Domain"</em> הכנס: <code>{window.location.hostname}</code></span>
                </div>
                <div className="strava-step">
                  <span className="step-num">3</span>
                  <span>העתק את Client ID ו-Client Secret לכאן</span>
                </div>
              </div>

              <div className="ob-field">
                <label>Client ID</label>
                <input type="text" placeholder="12345" value={clientId} onChange={e => setClientId(e.target.value)} />
              </div>
              <div className="ob-field">
                <label>Client Secret</label>
                <input type="password" placeholder="abc123..." value={clientSecret} onChange={e => setClientSecret(e.target.value)} />
              </div>

              {status && <div className="strava-status">{status}</div>}

              <button className="btn-strava" onClick={handleConnect} disabled={!clientId}>
                🟠 התחבר עם Strava
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
