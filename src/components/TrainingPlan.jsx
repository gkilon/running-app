import { useState } from 'react';
import { getTrainingPaces, formatPace } from '../utils/daniels';

const PHASE_LABELS = {
  'base': 'בסיס',
  'early-quality': 'איכות מוקדמת',
  'build': 'בנייה',
  'peak-taper': 'שיא',
};

const INTENSITY_COLORS = {
  easy:      '#22c55e',
  threshold: '#f59e0b',
  interval:  '#ef4444',
  marathon:  '#3b82f6',
};

const INTENSITY_LABELS = {
  easy:      'קל',
  threshold: 'טמפו',
  interval:  'אינטרוול',
  marathon:  'מרתון',
};

export default function TrainingPlan({ plan, currentVdot, onMarkComplete, onRegenerate }) {
  const [expandedWeek, setExpandedWeek] = useState(null);
  const [completingWorkout, setCompletingWorkout] = useState(null);
  const [completionData, setCompletionData] = useState({ timeMinutes: '', timeSeconds: '', notes: '' });

  if (!plan) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🏃</div>
        <h3>אין תכנית אימונים עדיין</h3>
        <p>צור תכנית 12 שבועות מותאמת אישית לפי מתודת Jack Daniels</p>
        <button className="btn-primary" onClick={onRegenerate}>צור תכנית</button>
      </div>
    );
  }

  const paces = getTrainingPaces(currentVdot);

  const totalKm = plan.reduce((s, w) => s + w.totalKm, 0);
  const completedWorkouts = plan.reduce((s, w) => s + w.workouts.filter(wo => wo.completed).length, 0);
  const totalWorkouts = plan.reduce((s, w) => s + w.workouts.length, 0);

  function submitCompletion(weekIndex, workoutId) {
    const mins = parseInt(completionData.timeMinutes) || 0;
    const secs = parseInt(completionData.timeSeconds) || 0;
    const totalSec = mins * 60 + secs;
    onMarkComplete(weekIndex, workoutId, {
      actualTime: totalSec || null,
      notes: completionData.notes,
    });
    setCompletingWorkout(null);
    setCompletionData({ timeMinutes: '', timeSeconds: '', notes: '' });
  }

  return (
    <div className="training-plan">
      {/* Stats bar */}
      <div className="plan-stats">
        <div className="plan-stat">
          <div className="plan-stat-val">{Math.round(totalKm)}</div>
          <div className="plan-stat-label">סה"כ ק"מ</div>
        </div>
        <div className="plan-stat">
          <div className="plan-stat-val">{completedWorkouts}/{totalWorkouts}</div>
          <div className="plan-stat-label">אימונים הושלמו</div>
        </div>
        <div className="plan-stat">
          <div className="plan-stat-val">12</div>
          <div className="plan-stat-label">שבועות</div>
        </div>
        <button className="btn-secondary small" onClick={onRegenerate}>חדש תכנית</button>
      </div>

      {/* Paces legend */}
      <div className="paces-legend">
        {Object.entries(INTENSITY_LABELS).map(([key, label]) => (
          <div className="pace-legend-item" key={key}>
            <div className="pace-legend-dot" style={{ background: INTENSITY_COLORS[key] }} />
            <span>{label}: </span>
            <strong>{formatPace(paces[key]?.min || paces.easy.min)}–{formatPace(paces[key]?.max || paces.easy.max)}/ק"מ</strong>
          </div>
        ))}
      </div>

      {/* Weeks */}
      {plan.map((week, weekIndex) => {
        const isExpanded = expandedWeek === weekIndex;
        const doneCount = week.workouts.filter(w => w.completed).length;
        const progress = (doneCount / week.workouts.length) * 100;
        const isRecovery = week.week % 4 === 0;

        return (
          <div
            key={weekIndex}
            className={`week-card ${isRecovery ? 'recovery' : ''} ${isExpanded ? 'expanded' : ''}`}
          >
            <button
              className="week-header"
              onClick={() => setExpandedWeek(isExpanded ? null : weekIndex)}
            >
              <div className="week-header-left">
                <div className="week-number">שבוע {week.week}</div>
                <div className="week-phase">{PHASE_LABELS[week.phase] || week.phase}</div>
                {isRecovery && <div className="recovery-badge">שחזור</div>}
              </div>
              <div className="week-header-right">
                <div className="week-km">{week.totalKm} ק"מ</div>
                <div className="week-mini-progress">
                  <div className="week-mini-bar" style={{ width: `${progress}%` }} />
                </div>
                <div className="week-done">{doneCount}/{week.workouts.length}</div>
                <div className="expand-arrow">{isExpanded ? '▲' : '▼'}</div>
              </div>
            </button>

            {isExpanded && (
              <div className="week-body">
                <div className="week-focus">{week.focus}</div>
                {week.workouts.map((workout, wi) => (
                  <div key={workout.id || wi} className={`workout-card ${workout.completed ? 'completed' : ''}`}>
                    <div className="workout-card-header">
                      <div
                        className="intensity-badge"
                        style={{
                          background: INTENSITY_COLORS[workout.intensity] + '22',
                          color: INTENSITY_COLORS[workout.intensity],
                          borderColor: INTENSITY_COLORS[workout.intensity],
                        }}
                      >
                        {INTENSITY_LABELS[workout.intensity]}
                      </div>
                      <div className="workout-card-title">{workout.label}</div>
                      <div className="workout-card-km">{workout.distanceKm} ק"מ</div>
                      {workout.completed ? (
                        <div className="completed-badge">✓ הושלם</div>
                      ) : (
                        <button
                          className="btn-complete"
                          onClick={() => setCompletingWorkout({ weekIndex, workoutId: workout.id })}
                        >
                          סמן כהושלם
                        </button>
                      )}
                    </div>
                    <div className="workout-description">{workout.description}</div>
                    {workout.structure && workout.structure.length > 1 && (
                      <div className="workout-structure">
                        {workout.structure.map((s, si) => (
                          <div className="workout-struct-row" key={si}>
                            <span className={`struct-zone ${s.zone}`}>{s.zone}</span>
                            <span className="struct-part">{s.part}</span>
                            <span className="struct-detail">{s.detail}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {workout.completed && workout.actualTime && (
                      <div className="workout-result">
                        ⏱ זמן: {Math.floor(workout.actualTime / 60)}:{String(workout.actualTime % 60).padStart(2,'0')}
                        {workout.notes && <span> · {workout.notes}</span>}
                      </div>
                    )}

                    {/* Completion form */}
                    {completingWorkout?.weekIndex === weekIndex && completingWorkout?.workoutId === workout.id && (
                      <div className="completion-form">
                        <div className="completion-form-title">כמה זמן רצת?</div>
                        <div className="completion-form-row">
                          <input
                            type="number"
                            placeholder="דקות"
                            value={completionData.timeMinutes}
                            onChange={e => setCompletionData(p => ({ ...p, timeMinutes: e.target.value }))}
                            className="time-input"
                          />
                          <span>:</span>
                          <input
                            type="number"
                            placeholder="שניות"
                            value={completionData.timeSeconds}
                            onChange={e => setCompletionData(p => ({ ...p, timeSeconds: e.target.value }))}
                            className="time-input"
                          />
                          <input
                            type="text"
                            placeholder="הערות (אופציונלי)"
                            value={completionData.notes}
                            onChange={e => setCompletionData(p => ({ ...p, notes: e.target.value }))}
                            className="notes-input"
                          />
                        </div>
                        <div className="completion-form-btns">
                          <button className="btn-primary small" onClick={() => submitCompletion(weekIndex, workout.id)}>שמור</button>
                          <button className="btn-ghost small" onClick={() => setCompletingWorkout(null)}>ביטול</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
