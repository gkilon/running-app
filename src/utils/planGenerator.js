/**
 * Training Plan Generator — Jack Daniels VDOT System
 *
 * Full 5-zone taxonomy:
 *   E  = Easy (59–74% vVO2max) — aerobic base, recovery
 *   M  = Marathon Pace (80–87% vVO2max) — longer tempo efforts
 *   T  = Threshold (88–92% vVO2max) — lactate threshold
 *   I  = Interval (97–100% vVO2max) — VO2max development
 *   R  = Repetition (105–110% vVO2max) — speed & economy
 *
 * Plan Periodization (12 weeks for 10k):
 *   Phase 1 — Foundation (weeks 1–3):  E + strides only
 *   Phase 2 — Threshold (weeks 4–6):   E + T workouts
 *   Phase 3 — Intensity (weeks 7–10):  E + T + I + R
 *   Phase 4 — Peak/Taper (weeks 11–12): quality + taper
 */

import { getTrainingPaces, formatPace } from './daniels';

export function generatePlan({ trainingDaysPerWeek = 4, currentVdot, targetVdot, profile = {}, weeks = 12 }) {
  const plan = [];

  const baseWeeklyKm = Math.max(15, Math.min(60, profile.weeklyKm || 25));
  const expMultiplier = profile.yearsRunning >= 3 ? 1.0 : profile.yearsRunning >= 1 ? 0.85 : 0.70;
  const adjustedBase = baseWeeklyKm * expMultiplier;

  for (let week = 1; week <= weeks; week++) {
    const phase = getPhase(week, weeks);
    const isTaper = week >= weeks - 1;
    const isRecovery = !isTaper && week % 4 === 0;

    const ratio = (week - 1) / (weeks - 1);
    const weekVdot = currentVdot + ratio * (targetVdot - currentVdot);
    const paces = getTrainingPaces(weekVdot);

    let volMultiplier;
    if (isTaper) volMultiplier = week === weeks ? 0.50 : 0.65;
    else if (isRecovery) volMultiplier = 0.70;
    else volMultiplier = 0.75 + Math.min(0.30, ratio * 0.35);

    const targetKm = Math.round(adjustedBase * volMultiplier * 10) / 10;
    const workouts = buildWeekWorkouts({ phase, trainingDaysPerWeek, paces, targetKm, isTaper, isRecovery, week });
    const totalKm = workouts.reduce((s, w) => s + (w.distanceKm || 0), 0);

    plan.push({
      week,
      phase,
      theme: getPhaseTheme(phase, isTaper, isRecovery),
      focus: getWeekFocus(phase, isTaper, isRecovery),
      workouts,
      totalKm: Math.round(totalKm * 10) / 10,
      paces,
    });
  }

  return plan;
}

function getPhase(week, total) {
  const r = week / total;
  if (r <= 0.25) return 'foundation';
  if (r <= 0.50) return 'threshold';
  if (r <= 0.83) return 'intensity';
  return 'peak';
}

function buildWeekWorkouts({ phase, trainingDaysPerWeek, paces, targetKm, isTaper, isRecovery, week }) {
  if (isTaper && week >= 12) return taperWeek(paces, trainingDaysPerWeek, targetKm);
  const templates = getPhaseTemplate(phase, trainingDaysPerWeek, isRecovery);
  return assignWorkouts(templates, paces, targetKm);
}

function getPhaseTemplate(phase, days, isRecovery) {
  if (isRecovery) return recoveryWeekTemplate(days);
  const map = {
    foundation: foundationTemplate(days),
    threshold:  thresholdTemplate(days),
    intensity:  intensityTemplate(days),
    peak:       peakTemplate(days),
  };
  return map[phase] || intensityTemplate(days);
}

function foundationTemplate(days) {
  return [
    { zone: 'E', workoutType: 'easy_run',  volumePct: 0.25 },
    { zone: 'E', workoutType: 'strides',   volumePct: 0.15 },
    { zone: 'E', workoutType: 'easy_run',  volumePct: 0.20 },
    { zone: 'E', workoutType: 'long_run',  volumePct: 0.35 },
    { zone: 'E', workoutType: 'easy_run',  volumePct: 0.05 },
  ].slice(0, days);
}

function thresholdTemplate(days) {
  return [
    { zone: 'E', workoutType: 'easy_run',         volumePct: 0.25 },
    { zone: 'T', workoutType: 'cruise_intervals',  volumePct: 0.20 },
    { zone: 'E', workoutType: 'easy_run',          volumePct: 0.15 },
    { zone: 'E', workoutType: 'long_run',          volumePct: 0.35 },
    { zone: 'T', workoutType: 'continuous_tempo',  volumePct: 0.05 },
  ].slice(0, days);
}

function intensityTemplate(days) {
  return [
    { zone: 'E', workoutType: 'easy_run',         volumePct: 0.20 },
    { zone: 'I', workoutType: 'vo2max_intervals',  volumePct: 0.18 },
    { zone: 'E', workoutType: 'easy_run',          volumePct: 0.12 },
    { zone: 'T', workoutType: 'cruise_intervals',  volumePct: 0.18 },
    { zone: 'E', workoutType: 'long_run',          volumePct: 0.32 },
  ].slice(0, days);
}

function peakTemplate(days) {
  return [
    { zone: 'E', workoutType: 'easy_run',         volumePct: 0.22 },
    { zone: 'I', workoutType: 'vo2max_intervals',  volumePct: 0.18 },
    { zone: 'R', workoutType: 'repetitions',       volumePct: 0.12 },
    { zone: 'T', workoutType: 'continuous_tempo',  volumePct: 0.16 },
    { zone: 'E', workoutType: 'long_run',          volumePct: 0.32 },
  ].slice(0, days);
}

function recoveryWeekTemplate(days) {
  return [
    { zone: 'E', workoutType: 'easy_run', volumePct: 0.30 },
    { zone: 'E', workoutType: 'strides',  volumePct: 0.20 },
    { zone: 'E', workoutType: 'easy_run', volumePct: 0.20 },
    { zone: 'E', workoutType: 'long_run', volumePct: 0.30 },
  ].slice(0, days);
}

function taperWeek(paces, days, targetKm) {
  return [
    buildWorkout({ zone: 'E', workoutType: 'easy_run',        distKm: Math.round(targetKm * 0.35 * 10) / 10, paces }),
    buildWorkout({ zone: 'T', workoutType: 'cruise_intervals', distKm: Math.round(targetKm * 0.30 * 10) / 10, paces }),
    buildWorkout({ zone: 'E', workoutType: 'easy_run',        distKm: Math.round(targetKm * 0.20 * 10) / 10, paces }),
  ].slice(0, Math.min(days, 3));
}

function assignWorkouts(templates, paces, totalKm) {
  const totalPct = templates.reduce((s, t) => s + t.volumePct, 0);
  return templates.map(t => {
    const km = Math.round((totalKm * (t.volumePct / totalPct)) * 10) / 10;
    return buildWorkout({ zone: t.zone, workoutType: t.workoutType, distKm: km, paces });
  });
}

function buildWorkout({ zone, workoutType, distKm, paces }) {
  const spec = getWorkoutSpec(workoutType, distKm, paces);
  return {
    id: Math.random().toString(36).slice(2),
    zone,
    workoutType,
    label: spec.label,
    distanceKm: distKm,
    description: spec.description,
    structure: spec.structure,
    intensity: zoneToIntensity(zone),
    completed: false,
    actualTime: null,
    notes: '',
  };
}

function zoneToIntensity(zone) {
  return { E: 'easy', M: 'marathon', T: 'threshold', I: 'interval', R: 'repetition' }[zone] || 'easy';
}

// ═══════════════════════════════════════════════════════
// WORKOUT SPECIFICATIONS
// ═══════════════════════════════════════════════════════

function getWorkoutSpec(type, distKm, paces) {
  const easyPace     = `${formatPace(paces.easy.min)}–${formatPace(paces.easy.max)}/ק"מ`;
  const tempoPace    = `${formatPace(paces.threshold.min)}–${formatPace(paces.threshold.max)}/ק"מ`;
  const intervalPace = `${formatPace(paces.interval.min)}–${formatPace(paces.interval.max)}/ק"מ`;
  const repPace      = `${formatPace(paces.repetition.min)}–${formatPace(paces.repetition.max)}/ק"מ`;

  switch (type) {

    case 'easy_run':
      return {
        label: `ריצה קלה ${distKm} ק"מ`,
        description: `ריצה אירובית בסיסית. הקצב צריך לאפשר שיחה מלאה — אם אתה נושם בכבדות, אתה רץ מהר מדי. 80% מהאימונים שלך אמורים להיראות כך.`,
        structure: [
          { part: 'ריצה קלה', detail: `${distKm} ק"מ @ ${easyPace}`, zone: 'E' },
        ],
      };

    case 'strides':
      return {
        label: `ריצה קלה + סטריידס`,
        description: `ריצה קלה עם 6 סטריידס בסוף. כל סטריד: 20 שניות האצה הדרגתית עד 95% → עצירה חלקה. לא ספרינט — תחושה של ריצה חלקה ואפקטיבית. שיפור כלכלת ריצה.`,
        structure: [
          { part: 'ריצה קלה', detail: `${Math.max(1, distKm - 0.8)} ק"מ @ ${easyPace}`, zone: 'E' },
          { part: 'סטריידס', detail: '6×100מ האצה עד 95%, 60 שניות ריצה קלה בין', zone: 'R' },
        ],
      };

    case 'long_run':
      return {
        label: `ריצה ארוכה ${distKm} ק"מ`,
        description: `עמוד השדרה של תכנית ריצה. קצב קל לחלוטין — בונה בסיס אירובי, מחזק גידים ורצועות, מפתח יכולת שימוש בשומן כדלק. לעולם אל תהיה גיבור ביום זה.`,
        structure: [
          { part: 'ריצה ארוכה', detail: `${distKm} ק"מ @ ${easyPace}`, zone: 'E' },
        ],
      };

    case 'continuous_tempo': {
      const warmup = 2;
      const cooldown = 2;
      const tempoKm = Math.max(2, Math.round((distKm - warmup - cooldown) * 10) / 10);
      return {
        label: `טמפו רציף ${tempoKm} ק"מ`,
        description: `מהאימונים החשובים ביותר לשיפור סף הלקטאט. תחושה: "קשה-רגוע" — לא רצה אבל מאמץ גבוה. שיפור הסף = ריצה מהירה יותר בנוחות רבה יותר.`,
        structure: [
          { part: 'חימום E', detail: `${warmup} ק"מ @ ${easyPace}`, zone: 'E' },
          { part: 'טמפו T', detail: `${tempoKm} ק"מ @ ${tempoPace}`, zone: 'T' },
          { part: 'שחזור E', detail: `${cooldown} ק"מ @ ${easyPace}`, zone: 'E' },
        ],
      };
    }

    case 'cruise_intervals': {
      const warmup = 2;
      const cooldown = 1.5;
      const workKm = Math.max(3, distKm - warmup - cooldown);
      const repsN = workKm >= 5 ? 5 : workKm >= 4 ? 4 : 3;
      return {
        label: `Cruise Intervals ${repsN}×1000מ`,
        description: `אינטרוולים בקצב סף עם מנוחה קצרה (1 דקה). שומרים על רמת לקטאט גבוהה לאורך זמן — מצוין לשיפור 10 ק"מ. קשה מטמפו רציף אבל עם פסקת נשימה.`,
        structure: [
          { part: 'חימום E', detail: `${warmup} ק"מ @ ${easyPace}`, zone: 'E' },
          { part: 'Cruise Intervals T', detail: `${repsN}×1000מ @ ${tempoPace}, מנוחה: 1 דקה ריצה קלה`, zone: 'T' },
          { part: 'שחזור E', detail: `${cooldown} ק"מ @ ${easyPace}`, zone: 'E' },
        ],
      };
    }

    case 'vo2max_intervals': {
      const warmup = 2;
      const cooldown = 2;
      const workKm = Math.max(3, distKm - warmup - cooldown);
      const reps = workKm >= 5
        ? { n: 5, dist: '1000מ', rest: '90 שניות ריצה קלה' }
        : workKm >= 4
        ? { n: 4, dist: '1000מ', rest: '90 שניות' }
        : { n: 6, dist: '600מ', rest: '90 שניות' };
      return {
        label: `אינטרוולי I ${reps.n}×${reps.dist}`,
        description: `אינטרוולי VO2max — הכלי החזק ביותר לשיפור ה-VDOT. כל חזרה = 97-100% מהמאמץ המקסימלי. מאמץ גבוה אבל לא ספרינט עיוור — כל חזרה צריכה להיות איכותית.`,
        structure: [
          { part: 'חימום E', detail: `${warmup} ק"מ @ ${easyPace}`, zone: 'E' },
          { part: 'אינטרוולים I', detail: `${reps.n}×${reps.dist} @ ${intervalPace}, מנוחה: ${reps.rest}`, zone: 'I' },
          { part: 'שחזור E', detail: `${cooldown} ק"מ @ ${easyPace}`, zone: 'E' },
        ],
      };
    }

    case 'repetitions': {
      const warmup = 2;
      const cooldown = 2;
      const workKm = Math.max(2, distKm - warmup - cooldown);
      const reps = workKm >= 3.2
        ? { n: 8, dist: '400מ', rest: '2–3 דקות הליכה / עמידה' }
        : { n: 6, dist: '300מ', rest: '2 דקות הליכה' };
      return {
        label: `חזרות R ${reps.n}×${reps.dist}`,
        description: `חזרות מהירות קצרות — משפרות כלכלת ריצה, מכניקת פסיעה ומהירות. מנוחה מלאה בין חזרות חיונית! אם לא מתאוששים — המנוחה קצרה מדי. איכות > כמות.`,
        structure: [
          { part: 'חימום E', detail: `${warmup} ק"מ @ ${easyPace}`, zone: 'E' },
          { part: 'חזרות R', detail: `${reps.n}×${reps.dist} @ ${repPace}, מנוחה מלאה: ${reps.rest}`, zone: 'R' },
          { part: 'שחזור E', detail: `${cooldown} ק"מ @ ${easyPace}`, zone: 'E' },
        ],
      };
    }

    default:
      return {
        label: `ריצה ${distKm} ק"מ`,
        description: `${distKm} ק"מ`,
        structure: [{ part: 'ריצה', detail: `${distKm} ק"מ`, zone: 'E' }],
      };
  }
}

function getPhaseTheme(phase, isTaper, isRecovery) {
  if (isTaper) return 'טייפר — חידוד לפני המירוץ';
  if (isRecovery) return 'שבוע שחזור ✓';
  return { foundation: 'בניית בסיס אירובי (E)', threshold: 'פיתוח סף לקטאט (T)', intensity: 'אינטרוולי VO2max (I+R)', peak: 'שבוע שיא' }[phase] || phase;
}

function getWeekFocus(phase, isTaper, isRecovery) {
  if (isTaper) return 'שמור כוחות. פחות זה יותר. גוף מנוח = ביצועים טובים יותר.';
  if (isRecovery) return 'שבוע שחזור — הגוף מתחזק במנוחה, לא במאמץ. אל תוסיף.';
  return {
    foundation: '80%+ בקצב שיחה. הבסיס הוא הכל. אל תמהר לאינטרוולים.',
    threshold:  'כנס לאזור הטמפו — קשה אבל נשלט. שיפור הסף = ריצה מהירה יותר בנוחות.',
    intensity:  'האינטרוולים הם כאן. קשה, קצר, אפקטיבי. שמור על איכות — לא כמות.',
    peak:       'שילוב כל האלמנטים. נפח יורד, איכות עולה. הגוף מוכן.',
  }[phase] || '';
}
