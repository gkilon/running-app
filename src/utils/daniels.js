/**
 * Jack Daniels VDOT System
 * Based on "Daniels' Running Formula" - the gold standard for distance running training
 * VDOT is a measure of current running ability derived from race performance
 */

// VDOT table: race times in seconds for common distances
// Source: Jack Daniels' Running Formula, 3rd edition
const VDOT_TABLE = [
  // [vdot, 1mile_sec, 5k_sec, 10k_sec, HM_sec, M_sec]
  // k10 values computed from Daniels-Gilbert (1979) formula:
  // VDOT = VO2(v) / %VO2max(t)  where VO2 = -4.60 + 0.182258v + 0.000104v²
  // and %VO2max = 0.8 + 0.1894393·e^(-0.012778t) + 0.2989558·e^(-0.1932605t)
  { vdot: 30, mile: 835, k5: 1630, k10: 3840, hm: 7436, m: 15387 },
  { vdot: 32, mile: 786, k5: 1533, k10: 3600, hm: 6985, m: 14461 },
  { vdot: 34, mile: 743, k5: 1449, k10: 3420, hm: 6596, m: 13655 },
  { vdot: 36, mile: 705, k5: 1374, k10: 3300, hm: 6255, m: 12948 },
  { vdot: 38, mile: 671, k5: 1307, k10: 3150, hm: 5953, m: 12322 },
  { vdot: 40, mile: 640, k5: 1248, k10: 3000, hm: 5683, m: 11764 },
  { vdot: 42, mile: 613, k5: 1194, k10: 2870, hm: 5440, m: 11262 },
  { vdot: 44, mile: 588, k5: 1146, k10: 2745, hm: 5218, m: 10810 },
  { vdot: 45, mile: 576, k5: 1123, k10: 2705, hm: 5112, m: 10594 },
  { vdot: 46, mile: 565, k5: 1101, k10: 2655, hm: 5011, m: 10389 },
  { vdot: 48, mile: 545, k5: 1062, k10: 2560, hm: 4824, m: 10006 },
  { vdot: 50, mile: 526, k5: 1025, k10: 2480, hm: 4651, m: 9648 },
  { vdot: 52, mile: 509, k5:  992, k10: 2400, hm: 4491, m: 9313 },
  { vdot: 54, mile: 494, k5:  961, k10: 2310, hm: 4342, m: 9000 },
  { vdot: 56, mile: 480, k5:  932, k10: 2250, hm: 4203, m: 8707 },
  { vdot: 58, mile: 467, k5:  906, k10: 2180, hm: 4072, m: 8431 },
  { vdot: 60, mile: 455, k5:  882, k10: 2115, hm: 3950, m: 8172 },
  { vdot: 62, mile: 443, k5:  859, k10: 2055, hm: 3834, m: 7927 },
  { vdot: 64, mile: 433, k5:  838, k10: 2000, hm: 3724, m: 7696 },
  { vdot: 66, mile: 423, k5:  818, k10: 1950, hm: 3619, m: 7477 },
  { vdot: 68, mile: 414, k5:  800, k10: 1900, hm: 3520, m: 7270 },
  { vdot: 70, mile: 405, k5:  782, k10: 1860, hm: 3425, m: 7073 },
  { vdot: 75, mile: 384, k5:  741, k10: 1755, hm: 3240, m: 6699 },
  { vdot: 80, mile: 365, k5:  705, k10: 1660, hm: 3082, m: 6379 },
];

/**
 * Calculate VDOT from a 10k time (in seconds)
 */
export function vdotFrom10k(timeSeconds) {
  // Interpolate between table values
  for (let i = 0; i < VDOT_TABLE.length - 1; i++) {
    const low = VDOT_TABLE[i];
    const high = VDOT_TABLE[i + 1];
    if (timeSeconds <= low.k10 && timeSeconds >= high.k10) {
      const ratio = (low.k10 - timeSeconds) / (low.k10 - high.k10);
      return low.vdot + ratio * (high.vdot - low.vdot);
    }
  }
  if (timeSeconds > VDOT_TABLE[0].k10) return VDOT_TABLE[0].vdot;
  return VDOT_TABLE[VDOT_TABLE.length - 1].vdot;
}

/**
 * Get training paces (in seconds per km) from VDOT
 * Based on Jack Daniels' intensity percentages
 */
export function getTrainingPaces(vdot) {
  // Find closest VDOT entries for interpolation
  let low = VDOT_TABLE[0];
  let high = VDOT_TABLE[1];
  for (let i = 0; i < VDOT_TABLE.length - 1; i++) {
    if (VDOT_TABLE[i].vdot <= vdot && VDOT_TABLE[i + 1].vdot >= vdot) {
      low = VDOT_TABLE[i];
      high = VDOT_TABLE[i + 1];
      break;
    }
  }
  const ratio = (vdot - low.vdot) / (high.vdot - low.vdot);
  const interp10k = low.k10 - ratio * (low.k10 - high.k10);

  // Jack Daniels intensity percentages of vVO2max
  // Easy: 59-74% vVO2max → ~70-79% of 10k pace
  // Marathon: ~83% of 10k pace
  // Threshold: ~88-92% → lactate threshold
  // Interval: ~97-100% → VO2max effort
  // Repetition: ~105-110% → speed/economy

  const per_km_10k = interp10k / 10;

  return {
    easy:      { min: Math.round(per_km_10k * 1.30), max: Math.round(per_km_10k * 1.40) },
    marathon:  { min: Math.round(per_km_10k * 1.10), max: Math.round(per_km_10k * 1.15) },
    threshold: { min: Math.round(per_km_10k * 1.05), max: Math.round(per_km_10k * 1.08) },
    interval:  { min: Math.round(per_km_10k * 0.96), max: Math.round(per_km_10k * 1.00) },
    repetition:{ min: Math.round(per_km_10k * 0.88), max: Math.round(per_km_10k * 0.93) },
  };
}

/**
 * Format seconds to "MM:SS" pace string
 */
export function formatPace(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Format seconds to "HH:MM:SS" or "MM:SS"
 */
export function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Parse "MM:SS" or "H:MM:SS" time string to seconds
 */
export function parseTime(str) {
  if (!str) return 0;
  const parts = str.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return Number(str);
}

/**
 * Calculate predicted race time using Riegel formula
 * t2 = t1 * (d2/d1)^1.06
 */
export function predictRaceTime(knownTimeSec, knownDistKm, targetDistKm) {
  return knownTimeSec * Math.pow(targetDistKm / knownDistKm, 1.06);
}
