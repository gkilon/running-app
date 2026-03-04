import { useState, useEffect, useCallback } from 'react';
import { vdotFrom10k, parseTime } from '../utils/daniels';
import { generatePlan } from '../utils/planGenerator';
import { stravaActivityToRun, fetchStravaActivities, getValidToken } from '../utils/strava';

const STORAGE_KEY = 'runcoach-v2';

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
}
function save(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

const defaultGoal = { target10kTime: '49:59', targetDate: '', trainingDaysPerWeek: 4 };

export function useStore() {
  const saved = load();

  const [onboarded, setOnboarded]     = useState(saved.onboarded || false);
  const [profile, setProfileState]    = useState(saved.profile || {});
  const [performance, setPerformance] = useState(saved.performance || { current10kTime: '50:39' });
  const [goal, setGoalState]          = useState(saved.goal || defaultGoal);
  const [runs, setRuns]               = useState(saved.runs || []);
  const [plan, setPlan]               = useState(saved.plan || null);
  const [activeView, setActiveView]   = useState('dashboard');
  const [strava, setStrava]           = useState(saved.strava || {
    clientId: '', clientSecret: '', accessToken: '', refreshToken: '', expiresAt: null, athlete: null,
  });
  const [stravaLoading, setStravaLoading] = useState(false);
  const [stravaError, setStravaError]     = useState(null);

  useEffect(() => {
    save({ onboarded, profile, performance, goal, runs, plan, strava });
  }, [onboarded, profile, performance, goal, runs, plan, strava]);

  // Handle Strava OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code && strava.clientId && strava.clientSecret) {
      window.history.replaceState({}, '', window.location.pathname);
      setActiveView('settings');
    }
  }, []);

  const currentVdot = vdotFrom10k(parseTime(performance.current10kTime));
  const targetVdot  = vdotFrom10k(parseTime(goal.target10kTime));

  const completeOnboarding = useCallback(({ profile: p, performance: perf, goal: g }) => {
    setProfileState(p);
    setPerformance(perf);
    setGoalState(g);
    setOnboarded(true);
    const cVdot = vdotFrom10k(parseTime(perf.current10kTime));
    const tVdot  = vdotFrom10k(parseTime(g.target10kTime));
    setPlan(generatePlan({ trainingDaysPerWeek: g.trainingDaysPerWeek, currentVdot: cVdot, targetVdot: tVdot, profile: p, weeks: 12 }));
  }, []);

  const setGoal = useCallback((g) => setGoalState(g), []);

  const regeneratePlan = useCallback((g = goal, p = profile, perf = performance) => {
    const cVdot = vdotFrom10k(parseTime(perf.current10kTime));
    const tVdot  = vdotFrom10k(parseTime(g.target10kTime));
    setPlan(generatePlan({ trainingDaysPerWeek: g.trainingDaysPerWeek, currentVdot: cVdot, targetVdot: tVdot, profile: p, weeks: 12 }));
  }, [goal, profile, performance]);

  const addRun = useCallback((run) => {
    setRuns(prev => {
      if (run.id && prev.some(r => r.id === run.id)) return prev;
      return [{ ...run, id: run.id || Date.now().toString() }, ...prev];
    });
  }, []);

  const deleteRun = useCallback((id) => setRuns(prev => prev.filter(r => r.id !== id)), []);

  const markWorkoutComplete = useCallback((weekIndex, workoutId, data) => {
    setPlan(prev => prev.map((week, wi) =>
      wi === weekIndex
        ? { ...week, workouts: week.workouts.map(w => w.id === workoutId ? { ...w, completed: true, ...data } : w) }
        : week
    ));
  }, []);

  const updateStrava = useCallback((updates) => setStrava(prev => ({ ...prev, ...updates })), []);

  const syncStravaActivities = useCallback(async (token = strava.accessToken) => {
    if (!token) return;
    setStravaLoading(true);
    setStravaError(null);
    try {
      const activities = await fetchStravaActivities(token);
      const newRuns = activities.map(stravaActivityToRun);
      setRuns(prev => {
        const existingIds = new Set(prev.map(r => r.id));
        const fresh = newRuns.filter(r => !existingIds.has(r.id));
        return [...fresh, ...prev];
      });
      return newRuns.length;
    } catch (err) {
      setStravaError(err.message);
      return 0;
    } finally {
      setStravaLoading(false);
    }
  }, [strava.accessToken]);

  return {
    onboarded, completeOnboarding,
    profile, setProfile: setProfileState,
    performance, setPerformance,
    goal, setGoal,
    runs, addRun, deleteRun,
    plan, setPlan, regeneratePlan,
    markWorkoutComplete,
    currentVdot, targetVdot,
    activeView, setActiveView,
    strava, updateStrava, syncStravaActivities, stravaLoading, stravaError,
  };
}
