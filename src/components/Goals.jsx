import { useState } from 'react';
import { vdotFrom10k, parseTime, formatTime, predictRaceTime, formatPace, getTrainingPaces } from '../utils/daniels';

const COMMON_TARGETS = [
  { label: 'תת-50 דקות', time: '49:59' },
  { label: 'תת-45 דקות', time: '44:59' },
  { label: 'תת-40 דקות', time: '39:59' },
];

export default function Goals({ goal, onSave, onRegeneratePlan }) {
  const [form, setForm] = useState({ ...goal });
  const [saved, setSaved] = useState(false);

  const currentVdot = vdotFrom10k(parseTime(form.current10kTime));
  const targetVdot  = vdotFrom10k(parseTime(form.target10kTime));

  // Predicted times at target VDOT
  const targetTimesSec = parseTime(form.target10kTime);
  const predicted5k  = predictRaceTime(targetTimesSec, 10, 5);
  const predictedHM  = predictRaceTime(targetTimesSec, 10, 21.097);
  const predictedM   = predictRaceTime(targetTimesSec, 10, 42.195);

  const vdotGap = targetVdot - currentVdot;

  function handleSave(e) {
    e.preventDefault();
    onSave(form);
    onRegeneratePlan(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="goals-page">
      <form className="goals-form" onSubmit={handleSave}>
        <div className="goals-section-title">הגדרת מטרות</div>

        <div className="form-group">
          <label>זמן נוכחי ב-10 ק"מ</label>
          <input
            type="text"
            placeholder="50:39"
            value={form.current10kTime}
            onChange={e => setForm(p => ({ ...p, current10kTime: e.target.value }))}
          />
          <div className="field-hint">VDOT נוכחי: {Math.round(currentVdot * 10) / 10}</div>
        </div>

        <div className="form-group">
          <label>זמן יעד ב-10 ק"מ</label>
          <div className="quick-targets">
            {COMMON_TARGETS.map(t => (
              <button
                key={t.time}
                type="button"
                className={`quick-target-btn ${form.target10kTime === t.time ? 'active' : ''}`}
                onClick={() => setForm(p => ({ ...p, target10kTime: t.time }))}
              >
                {t.label}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="49:59"
            value={form.target10kTime}
            onChange={e => setForm(p => ({ ...p, target10kTime: e.target.value }))}
          />
          <div className="field-hint">VDOT יעד: {Math.round(targetVdot * 10) / 10} (שיפור של {Math.round(vdotGap * 10) / 10})</div>
        </div>

        <div className="form-group">
          <label>תאריך יעד (אופציונלי)</label>
          <input
            type="date"
            value={form.targetDate}
            onChange={e => setForm(p => ({ ...p, targetDate: e.target.value }))}
          />
        </div>

        <div className="form-group">
          <label>ימי אימון בשבוע</label>
          <div className="days-selector">
            {[3, 4, 5].map(d => (
              <button
                key={d}
                type="button"
                className={`day-btn ${form.trainingDaysPerWeek === d ? 'active' : ''}`}
                onClick={() => setForm(p => ({ ...p, trainingDaysPerWeek: d }))}
              >
                {d} ימים
              </button>
            ))}
          </div>
        </div>

        <button type="submit" className={`btn-primary ${saved ? 'saved' : ''}`}>
          {saved ? '✓ נשמר ונוצרה תכנית חדשה' : 'שמור ועדכן תכנית'}
        </button>
      </form>

      {/* Predictions */}
      <div className="predictions-card">
        <div className="predictions-title">תחזיות בהגעה ליעד</div>
        <div className="predictions-grid">
          {[
            { label: '5 ק"מ',     time: predicted5k },
            { label: '10 ק"מ',    time: targetTimesSec },
            { label: 'חצי מרתון', time: predictedHM },
            { label: 'מרתון',     time: predictedM },
          ].map(({ label, time }) => (
            <div className="prediction-item" key={label}>
              <div className="prediction-dist">{label}</div>
              <div className="prediction-time">{formatTime(Math.round(time))}</div>
              <div className="prediction-pace">
                {formatPace(time / (label === '5 ק"מ' ? 5 : label === '10 ק"מ' ? 10 : label === 'חצי מרתון' ? 21.097 : 42.195))}/ק"מ
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Training paces at goal */}
      <div className="predictions-card">
        <div className="predictions-title">קצבי אימון ביעד</div>
        <div className="paces-at-goal">
          {(() => {
            const p = getTrainingPaces(targetVdot);
            return Object.entries({
              'קל': p.easy,
              'טמפו': p.threshold,
              'אינטרוול': p.interval,
              'מרתון': p.marathon,
            }).map(([label, pace]) => (
              <div className="pace-at-goal-item" key={label}>
                <div className="pace-at-goal-label">{label}</div>
                <div className="pace-at-goal-value">
                  {formatPace(pace.min)}–{formatPace(pace.max)}/ק"מ
                </div>
              </div>
            ));
          })()}
        </div>
      </div>
    </div>
  );
}
