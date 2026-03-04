import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { formatPace, formatTime, getTrainingPaces } from '../utils/daniels';

const INTENSITY_COLORS = {
  easy:      '#22c55e',
  threshold: '#f59e0b',
  interval:  '#ef4444',
  marathon:  '#3b82f6',
};

export default function Dashboard({ goal, runs, plan, currentVdot, targetVdot, onNavigate, onGeneratePlan }) {
  const paces = useMemo(() => getTrainingPaces(currentVdot), [currentVdot]);

  const thirtyDaysAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d;
  }, []);

  // Last 30 days runs sorted by date
  const recentRuns = useMemo(() =>
    [...runs]
      .filter(r => r.distanceKm && r.timeSeconds && new Date(r.date) >= thirtyDaysAgo)
      .sort((a, b) => new Date(a.date) - new Date(b.date)),
    [runs, thirtyDaysAgo]
  );

  // Weekly km chart (last 30 days, grouped by week)
  const weeklyData = useMemo(() => {
    const weeks = {};
    recentRuns.forEach(r => {
      const d = new Date(r.date);
      // Get Monday of that week
      const day = d.getDay();
      const monday = new Date(d);
      monday.setDate(d.getDate() - ((day + 6) % 7));
      const key = monday.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' });
      weeks[key] = (weeks[key] || 0) + r.distanceKm;
    });
    return Object.entries(weeks).map(([week, km]) => ({ week, km: Math.round(km * 10) / 10 }));
  }, [recentRuns]);

  // Week progress
  const currentWeek = useMemo(() => {
    if (!plan) return null;
    return plan.find(w => w.workouts.some(wo => !wo.completed)) || plan[plan.length - 1];
  }, [plan]);

  const completedWorkoutsThisWeek = currentWeek?.workouts.filter(w => w.completed).length || 0;
  const totalWorkoutsThisWeek = currentWeek?.workouts.length || 0;

  return (
    <div className="dashboard">
      {/* Hero goal card */}
      <div className="goal-card">
        <div className="goal-left">
          <div className="goal-label">המטרה שלך</div>
          <div className="goal-time">{goal.target10kTime}</div>
          <div className="goal-sub">10 ק"מ</div>
        </div>
        <div className="goal-divider" />
        <div className="goal-right">
          <div className="vdot-row">
            <div className="vdot-item">
              <div className="vdot-label">VDOT נוכחי</div>
              <div className="vdot-val current">{Math.round(currentVdot * 10) / 10}</div>
            </div>
            <div className="vdot-arrow">→</div>
            <div className="vdot-item">
              <div className="vdot-label">VDOT יעד</div>
              <div className="vdot-val target">{Math.round(targetVdot * 10) / 10}</div>
            </div>
          </div>
          <div className="vdot-bar-wrap">
            <div
              className="vdot-bar-fill"
              style={{ width: `${Math.min(100, ((currentVdot - 30) / (targetVdot - 30)) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Last 30 days progress — charts first */}
      {recentRuns.length > 0 && (
        <>
          <div className="section-title">חודש אחרון — {recentRuns.length} ריצות · {Math.round(recentRuns.reduce((s, r) => s + r.distanceKm, 0) * 10) / 10} ק"מ</div>

          {weeklyData.length >= 1 && (
            <div className="chart-wrap">
              <div className="chart-label">ק"מ לפי שבוע</div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={weeklyData}>
                  <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#888' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#888' }} />
                  <Tooltip
                    formatter={(v) => [v + ' ק"מ', 'נפח']}
                    contentStyle={{ background: '#1e293b', border: 'none', color: '#fff', borderRadius: 8 }}
                  />
                  <Bar dataKey="km" fill="#4f86f7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

        </>
      )}

      {/* Training paces */}
      <div className="section-title">קצבי אימון מומלצים (Jack Daniels)</div>
      <div className="paces-grid">
        {[
          { key: 'easy',      label: 'קצב קל',       desc: 'רוב הריצות — 80%', color: '#22c55e' },
          { key: 'threshold', label: 'טמפו / סף',     desc: 'ריצות טמפו',        color: '#f59e0b' },
          { key: 'interval',  label: 'אינטרוול',       desc: 'אינטרוולים',        color: '#ef4444' },
          { key: 'marathon',  label: 'קצב מרתון',     desc: 'ריצות ארוכות',      color: '#3b82f6' },
        ].map(({ key, label, desc, color }) => (
          <div className="pace-card" key={key} style={{ borderTop: `3px solid ${color}` }}>
            <div className="pace-label" style={{ color }}>{label}</div>
            <div className="pace-value">
              {formatPace(paces[key].min)}–{formatPace(paces[key].max)}
              <span className="pace-unit"> /ק"מ</span>
            </div>
            <div className="pace-desc">{desc}</div>
          </div>
        ))}
      </div>

      {/* This week */}
      {plan ? (
        <>
          <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>השבוע — {currentWeek?.theme}</span>
            <button className="link-btn" onClick={() => onNavigate('plan')}>כל התכנית ←</button>
          </div>
          <div className="week-progress">
            <div className="week-progress-bar-wrap">
              <div
                className="week-progress-bar-fill"
                style={{ width: `${(completedWorkoutsThisWeek / totalWorkoutsThisWeek) * 100}%` }}
              />
            </div>
            <div className="week-progress-label">
              {completedWorkoutsThisWeek}/{totalWorkoutsThisWeek} אימונים הושלמו
            </div>
          </div>
          <div className="workout-list">
            {currentWeek?.workouts.map((w, i) => (
              <div className={`workout-item ${w.completed ? 'done' : ''}`} key={w.id || i}>
                <div className="workout-dot" style={{ background: INTENSITY_COLORS[w.intensity] || '#888' }} />
                <div className="workout-info">
                  <div className="workout-name">{w.label}</div>
                  <div className="workout-meta">{w.distanceKm} ק"מ</div>
                </div>
                {w.completed && <div className="workout-check">✓</div>}
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="empty-plan">
          <div className="empty-plan-icon">📋</div>
          <div className="empty-plan-text">אין תכנית אימונים עדיין</div>
          <button className="btn-primary" onClick={onGeneratePlan}>צור תכנית 12 שבועות</button>
        </div>
      )}

      {/* Recent runs */}
      {runs.length > 0 && (
        <>
          <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>ריצות אחרונות</span>
            <button className="link-btn" onClick={() => onNavigate('log')}>כל הריצות ←</button>
          </div>
          <div className="runs-list">
            {runs.slice(0, 4).map(run => (
              <div className="run-item" key={run.id}>
                <div className="run-date">{new Date(run.date).toLocaleDateString('he-IL')}</div>
                <div className="run-dist">{run.distanceKm} ק"מ</div>
                <div className="run-time">{formatTime(run.timeSeconds)}</div>
                <div className="run-pace">{formatPace(run.timeSeconds / run.distanceKm)}/ק"מ</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
