import { useState, useRef } from 'react';
import { formatTime, formatPace, vdotFrom10k, predictRaceTime } from '../utils/daniels';

function parseGPX(text) {
  const parser = new DOMParser();
  const xml = parser.parseFromString(text, 'text/xml');

  // Try GPX trkpt
  const trkpts = Array.from(xml.querySelectorAll('trkpt'));
  if (trkpts.length === 0) throw new Error('GPX לא תקין');

  let totalDist = 0;
  let startTime = null;
  let endTime = null;

  for (let i = 1; i < trkpts.length; i++) {
    const prev = trkpts[i - 1];
    const curr = trkpts[i];
    const lat1 = parseFloat(prev.getAttribute('lat'));
    const lon1 = parseFloat(prev.getAttribute('lon'));
    const lat2 = parseFloat(curr.getAttribute('lat'));
    const lon2 = parseFloat(curr.getAttribute('lon'));
    totalDist += haversine(lat1, lon1, lat2, lon2);
  }

  const timeEls = xml.querySelectorAll('trkpt time');
  if (timeEls.length > 0) {
    startTime = new Date(timeEls[0].textContent);
    endTime   = new Date(timeEls[timeEls.length - 1].textContent);
  }

  const durationSec = startTime && endTime ? (endTime - startTime) / 1000 : null;
  const distKm = Math.round(totalDist / 10) / 100;

  // Try to get activity name
  const nameEl = xml.querySelector('trk name, name');
  const name = nameEl?.textContent || 'ריצה מגארמין';

  return {
    name,
    distanceKm: distKm,
    timeSeconds: durationSec ? Math.round(durationSec) : null,
    date: startTime ? startTime.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    source: 'garmin-gpx',
  };
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000; // meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function RunLog({ runs, onAddRun, onDeleteRun }) {
  const [showForm, setShowForm] = useState(false);
  const [gpxPreview, setGpxPreview] = useState(null);
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    distanceKm: '',
    timeMinutes: '',
    timeSeconds: '',
    notes: '',
    type: 'easy',
  });
  const fileInputRef = useRef();

  function handleManualSubmit(e) {
    e.preventDefault();
    const mins = parseInt(form.timeMinutes) || 0;
    const secs = parseInt(form.timeSeconds) || 0;
    onAddRun({
      date: form.date,
      distanceKm: parseFloat(form.distanceKm),
      timeSeconds: mins * 60 + secs,
      type: form.type,
      notes: form.notes,
      source: 'manual',
    });
    setShowForm(false);
    setForm({ date: new Date().toISOString().split('T')[0], distanceKm: '', timeMinutes: '', timeSeconds: '', notes: '', type: 'easy' });
  }

  async function handleGPXFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseGPX(text);
      setGpxPreview(parsed);
    } catch (err) {
      alert('שגיאה בקריאת קובץ GPX: ' + err.message);
    }
    e.target.value = '';
  }

  function confirmGPX() {
    if (!gpxPreview) return;
    onAddRun(gpxPreview);
    setGpxPreview(null);
  }

  const RUN_TYPES = {
    easy: { label: 'קל', color: '#22c55e' },
    tempo: { label: 'טמפו', color: '#f59e0b' },
    interval: { label: 'אינטרוול', color: '#ef4444' },
    long: { label: 'ארוכה', color: '#3b82f6' },
    race: { label: 'תחרות', color: '#8b5cf6' },
  };

  return (
    <div className="run-log">
      {/* Action bar */}
      <div className="log-actions">
        <button className="btn-primary" onClick={() => setShowForm(v => !v)}>
          {showForm ? '✕ סגור' : '+ הוסף ריצה ידנית'}
        </button>
        <button className="btn-secondary" onClick={() => fileInputRef.current.click()}>
          📥 ייבא GPX מגארמין
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".gpx"
          style={{ display: 'none' }}
          onChange={handleGPXFile}
        />
      </div>

      {/* GPX import instructions */}
      <div className="gpx-hint">
        <strong>ייצוא מגארמין Connect:</strong> Activities → בחר ריצה → ··· → Export to GPX
      </div>

      {/* GPX Preview */}
      {gpxPreview && (
        <div className="gpx-preview">
          <div className="gpx-preview-title">✅ קובץ GPX נקרא בהצלחה</div>
          <div className="gpx-preview-data">
            <span>📅 {gpxPreview.date}</span>
            <span>📏 {gpxPreview.distanceKm} ק"מ</span>
            {gpxPreview.timeSeconds && <span>⏱ {formatTime(gpxPreview.timeSeconds)}</span>}
            {gpxPreview.timeSeconds && gpxPreview.distanceKm && (
              <span>⚡ {formatPace(gpxPreview.timeSeconds / gpxPreview.distanceKm)}/ק"מ</span>
            )}
          </div>
          <div className="gpx-preview-btns">
            <button className="btn-primary small" onClick={confirmGPX}>שמור ריצה</button>
            <button className="btn-ghost small" onClick={() => setGpxPreview(null)}>ביטול</button>
          </div>
        </div>
      )}

      {/* Manual form */}
      {showForm && (
        <form className="run-form" onSubmit={handleManualSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>תאריך</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label>מרחק (ק"מ)</label>
              <input
                type="number"
                step="0.1"
                placeholder="10.0"
                value={form.distanceKm}
                onChange={e => setForm(p => ({ ...p, distanceKm: e.target.value }))}
                required
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>זמן (דקות)</label>
              <input
                type="number"
                placeholder="50"
                value={form.timeMinutes}
                onChange={e => setForm(p => ({ ...p, timeMinutes: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>שניות</label>
              <input
                type="number"
                placeholder="39"
                max="59"
                value={form.timeSeconds}
                onChange={e => setForm(p => ({ ...p, timeSeconds: e.target.value }))}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>סוג ריצה</label>
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                {Object.entries(RUN_TYPES).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ flex: 2 }}>
              <label>הערות</label>
              <input
                type="text"
                placeholder="איך הרגשת..."
                value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              />
            </div>
          </div>
          <button type="submit" className="btn-primary">שמור ריצה</button>
        </form>
      )}

      {/* Runs list */}
      {runs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🏃</div>
          <p>אין ריצות עדיין. הוסף ריצה ידנית או ייבא מגארמין.</p>
        </div>
      ) : (
        <div className="runs-table">
          <div className="runs-table-header">
            <span>תאריך</span>
            <span>מרחק</span>
            <span>זמן</span>
            <span>קצב</span>
            <span>VDOT</span>
            <span></span>
          </div>
          {runs.map(run => {
            const pace = run.timeSeconds && run.distanceKm ? run.timeSeconds / run.distanceKm : null;
            const est10k = pace ? predictRaceTime(run.timeSeconds, run.distanceKm, 10) : null;
            const vdot = est10k ? Math.round(vdotFrom10k(est10k) * 10) / 10 : null;
            const typeInfo = RUN_TYPES[run.type] || RUN_TYPES.easy;

            return (
              <div className="run-row" key={run.id}>
                <span className="run-date-cell">
                  {new Date(run.date).toLocaleDateString('he-IL')}
                </span>
                <span>
                  <span
                    className="type-dot"
                    style={{ background: typeInfo.color }}
                    title={typeInfo.label}
                  />
                  {run.distanceKm} ק"מ
                </span>
                <span>{run.timeSeconds ? formatTime(run.timeSeconds) : '—'}</span>
                <span>{pace ? formatPace(pace) + '/ק"מ' : '—'}</span>
                <span className="vdot-cell">{vdot || '—'}</span>
                <span>
                  <button className="delete-btn" onClick={() => onDeleteRun(run.id)} title="מחק">✕</button>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
