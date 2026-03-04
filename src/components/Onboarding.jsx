import { useState } from 'react';
import { vdotFrom10k, parseTime, formatTime, predictRaceTime } from '../utils/daniels';

const STEPS = ['ברוך הבא', 'פרטים אישיים', 'רמת ריצה', 'מטרה', 'סיום'];

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState({
    name: '',
    age: '',
    gender: 'male',
    yearsRunning: '',
    weeklyKm: '',
    injuryHistory: false,
    hasHeartRate: false,
    maxHR: '',
  });
  const [performance, setPerformance] = useState({
    current10kTime: '50:39',
    recentRaceDistance: '10',
    recentRaceTime: '50:39',
    lastRaceDate: '',
  });
  const [goal, setGoal] = useState({
    target10kTime: '49:59',
    targetDate: '',
    trainingDaysPerWeek: 4,
    longRunDay: 'saturday',
  });

  const up = (obj, setObj) => (key, val) => setObj(p => ({ ...p, [key]: val }));

  const setP = up(profile, setProfile);
  const setPerf = up(performance, setPerformance);
  const setG = up(goal, setGoal);

  const currentVdot = vdotFrom10k(parseTime(performance.current10kTime));
  const targetVdot  = vdotFrom10k(parseTime(goal.target10kTime));

  // Calculate recommended max HR from age
  const calcMaxHR = () => {
    if (profile.age) return Math.round(208 - 0.7 * parseInt(profile.age)); // Tanaka formula
    return 190;
  };

  const maxHR = profile.hasHeartRate && profile.maxHR ? parseInt(profile.maxHR) : calcMaxHR();

  // HR zones from Jack Daniels
  const hrZones = {
    E: { min: Math.round(maxHR * 0.59), max: Math.round(maxHR * 0.74) },
    M: { min: Math.round(maxHR * 0.80), max: Math.round(maxHR * 0.87) },
    T: { min: Math.round(maxHR * 0.88), max: Math.round(maxHR * 0.92) },
    I: { min: Math.round(maxHR * 0.97), max: maxHR },
  };

  function handleFinish() {
    const finalProfile = {
      ...profile,
      maxHR,
      hrZones,
      age: parseInt(profile.age),
      weeklyKm: parseFloat(profile.weeklyKm) || 20,
      yearsRunning: parseInt(profile.yearsRunning) || 1,
    };
    onComplete({ profile: finalProfile, performance, goal });
  }

  return (
    <div className="onboarding">
      {/* Progress */}
      <div className="ob-progress">
        {STEPS.map((s, i) => (
          <div key={s} className={`ob-step ${i <= step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
            <div className="ob-step-dot">{i < step ? '✓' : i + 1}</div>
            <div className="ob-step-label">{s}</div>
          </div>
        ))}
      </div>

      <div className="ob-card">
        {/* Step 0: Welcome */}
        {step === 0 && (
          <div className="ob-content">
            <div className="ob-icon">⚡</div>
            <h2>ברוך הבא ל-RunCoach</h2>
            <p>
              אבנה לך תכנית ריצה אישית מבוססת על מתודת <strong>Jack Daniels VDOT</strong> —
              המתודה המדעית המובילה בעולם לאימוני ריצה.
            </p>
            <p style={{ marginTop: 12, fontSize: 14, color: '#94a3b8' }}>
              ניקח 2 דקות לאסוף מידע עליך כדי לבנות תכנית שתואמת בדיוק את הכושר, הגיל והמטרות שלך.
            </p>
          </div>
        )}

        {/* Step 1: Personal */}
        {step === 1 && (
          <div className="ob-content">
            <h2>פרטים אישיים</h2>
            <p className="ob-subtitle">משמשים לחישוב אזורי דופק ונפח אימון מותאם</p>

            <div className="ob-field">
              <label>שם</label>
              <input type="text" placeholder="שם פרטי" value={profile.name} onChange={e => setP('name', e.target.value)} />
            </div>
            <div className="ob-row">
              <div className="ob-field">
                <label>גיל</label>
                <input type="number" placeholder="30" min="14" max="80" value={profile.age} onChange={e => setP('age', e.target.value)} />
              </div>
              <div className="ob-field">
                <label>מין</label>
                <div className="ob-toggle">
                  <button type="button" className={profile.gender === 'male' ? 'active' : ''} onClick={() => setP('gender', 'male')}>זכר</button>
                  <button type="button" className={profile.gender === 'female' ? 'active' : ''} onClick={() => setP('gender', 'female')}>נקבה</button>
                </div>
              </div>
            </div>
            <div className="ob-row">
              <div className="ob-field">
                <label>שנות ריצה</label>
                <select value={profile.yearsRunning} onChange={e => setP('yearsRunning', e.target.value)}>
                  <option value="">בחר</option>
                  <option value="0">פחות משנה</option>
                  <option value="1">1–2 שנים</option>
                  <option value="3">3–5 שנים</option>
                  <option value="6">6+ שנים</option>
                </select>
              </div>
              <div className="ob-field">
                <label>ק"מ שבועיים נוכחיים</label>
                <input type="number" placeholder="20" min="0" max="150" value={profile.weeklyKm} onChange={e => setP('weeklyKm', e.target.value)} />
              </div>
            </div>

            <div className="ob-checkbox">
              <label>
                <input type="checkbox" checked={profile.hasHeartRate} onChange={e => setP('hasHeartRate', e.target.checked)} />
                יש לי שעון דופק / Garmin
              </label>
            </div>

            {profile.hasHeartRate && (
              <div className="ob-field">
                <label>דופק מקסימלי (אם ידוע)</label>
                <input type="number" placeholder={`${calcMaxHR()} (מחושב מגיל)`} value={profile.maxHR} onChange={e => setP('maxHR', e.target.value)} />
                {profile.age && <div className="ob-hint">מחושב מגיל: {calcMaxHR()} פעימות (נוסחת Tanaka)</div>}
              </div>
            )}

            {profile.age && (
              <div className="ob-hr-zones">
                <div className="ob-hr-title">אזורי דופק ({profile.hasHeartRate && profile.maxHR ? `מקסימום ${maxHR}` : `מחושב: ${maxHR}`} bpm)</div>
                {Object.entries(hrZones).map(([zone, { min, max }]) => (
                  <div key={zone} className="ob-hr-row">
                    <span className="ob-hr-zone">{zone}</span>
                    <span>{min}–{max} bpm</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Running Level */}
        {step === 2 && (
          <div className="ob-content">
            <h2>רמת ריצה נוכחית</h2>
            <p className="ob-subtitle">זה הבסיס לחישוב ה-VDOT וקצבי האימון שלך</p>

            <div className="ob-field">
              <label>זמן נוכחי ב-10 ק"מ (MM:SS)</label>
              <input
                type="text"
                placeholder="50:39"
                value={performance.current10kTime}
                onChange={e => setPerf('current10kTime', e.target.value)}
              />
              {performance.current10kTime && (
                <div className="ob-hint">VDOT: {Math.round(vdotFrom10k(parseTime(performance.current10kTime)) * 10) / 10}</div>
              )}
            </div>

            <div className="ob-divider">או — זמן ממירוץ אחרון</div>
            <div className="ob-row">
              <div className="ob-field">
                <label>מרחק מירוץ (ק"מ)</label>
                <select value={performance.recentRaceDistance} onChange={e => setPerf('recentRaceDistance', e.target.value)}>
                  <option value="5">5 ק"מ</option>
                  <option value="10">10 ק"מ</option>
                  <option value="21.097">חצי מרתון</option>
                  <option value="42.195">מרתון</option>
                </select>
              </div>
              <div className="ob-field">
                <label>זמן (HH:MM:SS)</label>
                <input
                  type="text"
                  placeholder="50:39"
                  value={performance.recentRaceTime}
                  onChange={e => {
                    setPerf('recentRaceTime', e.target.value);
                    // Auto-calculate 10k equivalent
                    const dist = parseFloat(performance.recentRaceDistance);
                    const sec = parseTime(e.target.value);
                    if (sec && dist) {
                      const est10k = predictRaceTime(sec, dist, 10);
                      setPerf('current10kTime', formatTime(Math.round(est10k)));
                    }
                  }}
                />
              </div>
            </div>
            {performance.recentRaceDistance !== '10' && performance.recentRaceTime && (
              <div className="ob-predicted">
                ↳ שווה ל-10 ק"מ: <strong>{formatTime(Math.round(predictRaceTime(parseTime(performance.recentRaceTime), parseFloat(performance.recentRaceDistance), 10)))}</strong>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Goal */}
        {step === 3 && (
          <div className="ob-content">
            <h2>המטרה שלך</h2>

            <div className="ob-field">
              <label>יעד ב-10 ק"מ</label>
              <div className="ob-quick-btns">
                {['49:59', '44:59', '39:59', '34:59'].map(t => (
                  <button key={t} type="button" className={`ob-quick-btn ${goal.target10kTime === t ? 'active' : ''}`} onClick={() => setG('target10kTime', t)}>
                    תת-{t.split(':')[0]}:00
                  </button>
                ))}
              </div>
              <input type="text" placeholder="49:59" value={goal.target10kTime} onChange={e => setG('target10kTime', e.target.value)} />
              {goal.target10kTime && (
                <div className="ob-hint">
                  VDOT יעד: {Math.round(targetVdot * 10) / 10} (שיפור של {Math.round((targetVdot - currentVdot) * 10) / 10})
                </div>
              )}
            </div>

            <div className="ob-field">
              <label>תאריך יעד (מירוץ / בדיקה)</label>
              <input type="date" value={goal.targetDate} onChange={e => setG('targetDate', e.target.value)} />
            </div>

            <div className="ob-field">
              <label>ימי אימון בשבוע</label>
              <div className="ob-days">
                {[3, 4, 5].map(d => (
                  <button key={d} type="button" className={`ob-day-btn ${goal.trainingDaysPerWeek === d ? 'active' : ''}`} onClick={() => setG('trainingDaysPerWeek', d)}>
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div className="ob-field">
              <label>יום הריצה הארוכה</label>
              <select value={goal.longRunDay} onChange={e => setG('longRunDay', e.target.value)}>
                <option value="friday">שישי</option>
                <option value="saturday">שבת</option>
                <option value="sunday">ראשון</option>
              </select>
            </div>
          </div>
        )}

        {/* Step 4: Done */}
        {step === 4 && (
          <div className="ob-content ob-done">
            <div className="ob-icon">🎯</div>
            <h2>הכל מוכן{profile.name ? `, ${profile.name}` : ''}!</h2>
            <div className="ob-summary">
              <div className="ob-summary-row">
                <span>VDOT נוכחי</span>
                <strong>{Math.round(currentVdot * 10) / 10}</strong>
              </div>
              <div className="ob-summary-row">
                <span>VDOT יעד</span>
                <strong>{Math.round(targetVdot * 10) / 10}</strong>
              </div>
              <div className="ob-summary-row">
                <span>ימי אימון</span>
                <strong>{goal.trainingDaysPerWeek} בשבוע</strong>
              </div>
              {profile.age && (
                <div className="ob-summary-row">
                  <span>דופק מקסימלי</span>
                  <strong>{maxHR} bpm</strong>
                </div>
              )}
            </div>
            <p style={{ color: '#94a3b8', fontSize: 14 }}>
              מכין תכנית 12 שבועות מותאמת אישית עם אימוני Jack Daniels מפורטים...
            </p>
          </div>
        )}

        {/* Nav */}
        <div className="ob-nav">
          {step > 0 && (
            <button className="btn-ghost" onClick={() => setStep(s => s - 1)}>חזור</button>
          )}
          {step < STEPS.length - 1 ? (
            <button className="btn-primary ob-next" onClick={() => setStep(s => s + 1)}>
              {step === 0 ? 'בואו נתחיל ←' : 'הבא ←'}
            </button>
          ) : (
            <button className="btn-primary ob-next" onClick={handleFinish}>
              בנה את התכנית שלי 🚀
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
