import { useStore } from './store/useStore';
import Onboarding from './components/Onboarding';
import Dashboard from './components/Dashboard';
import TrainingPlan from './components/TrainingPlan';
import RunLog from './components/RunLog';
import Goals from './components/Goals';
import StravaConnect from './components/StravaConnect';
import './App.css';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'בית',     icon: '🏠' },
  { id: 'plan',      label: 'תכנית',   icon: '📋' },
  { id: 'log',       label: 'יומן',    icon: '🏃' },
  { id: 'goals',     label: 'מטרות',   icon: '🎯' },
  { id: 'settings',  label: 'הגדרות',  icon: '⚙️' },
];

export default function App() {
  const store = useStore();
  const { activeView, setActiveView } = store;

  if (!store.onboarded) {
    return <Onboarding onComplete={store.completeOnboarding} />;
  }

  return (
    <div className="app" dir="rtl">
      <header className="app-header">
        <div className="header-content">
          <div className="app-logo">⚡ RunCoach</div>
          <div className="header-meta">
            {store.profile.name && <span className="header-name">{store.profile.name}</span>}
            <span className="header-goal">{store.goal.target10kTime} ב-10 ק"מ</span>
            {store.strava.accessToken && (
              <button className="strava-sync-btn" onClick={() => store.syncStravaActivities()} disabled={store.stravaLoading}>
                {store.stravaLoading ? '⟳' : '🟠'}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="app-main">
        {activeView === 'dashboard' && (
          <Dashboard
            goal={store.goal}
            performance={store.performance}
            profile={store.profile}
            runs={store.runs}
            plan={store.plan}
            currentVdot={store.currentVdot}
            targetVdot={store.targetVdot}
            onNavigate={setActiveView}
            onGeneratePlan={() => store.regeneratePlan()}
          />
        )}
        {activeView === 'plan' && (
          <TrainingPlan
            plan={store.plan}
            currentVdot={store.currentVdot}
            onMarkComplete={store.markWorkoutComplete}
            onRegenerate={() => store.regeneratePlan()}
          />
        )}
        {activeView === 'log' && (
          <RunLog
            runs={store.runs}
            onAddRun={store.addRun}
            onDeleteRun={store.deleteRun}
            stravaConnected={!!store.strava.accessToken}
            onStravaSync={() => store.syncStravaActivities()}
            stravaLoading={store.stravaLoading}
          />
        )}
        {activeView === 'goals' && (
          <Goals
            goal={store.goal}
            performance={store.performance}
            profile={store.profile}
            onSave={(g, perf) => {
              store.setGoal(g);
              if (perf) store.setPerformance(perf);
              store.regeneratePlan(g, store.profile, perf || store.performance);
            }}
          />
        )}
        {activeView === 'settings' && (
          <div className="settings-page">
            <div className="settings-title">הגדרות</div>

            <StravaConnect
              strava={store.strava}
              onUpdate={store.updateStrava}
              onSync={store.syncStravaActivities}
              stravaLoading={store.stravaLoading}
              stravaError={store.stravaError}
            />

            <div className="settings-section">
              <div className="settings-section-title">פרופיל</div>
              <div className="profile-summary">
                {store.profile.name && <div className="profile-row"><span>שם</span><strong>{store.profile.name}</strong></div>}
                {store.profile.age && <div className="profile-row"><span>גיל</span><strong>{store.profile.age}</strong></div>}
                {store.profile.maxHR && <div className="profile-row"><span>דופק מקסימלי</span><strong>{store.profile.maxHR} bpm</strong></div>}
                {store.profile.weeklyKm && <div className="profile-row"><span>ק"מ שבועיים בסיס</span><strong>{store.profile.weeklyKm}</strong></div>}
              </div>
              <button className="btn-ghost small" onClick={() => store.completeOnboarding && window.confirm('לאפס אונבורדינג?') && localStorage.removeItem('runcoach-v2') && window.location.reload()}>
                אפס והתחל מחדש
              </button>
            </div>
          </div>
        )}
      </main>

      <nav className="bottom-nav">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            className={`nav-item ${activeView === item.id ? 'active' : ''}`}
            onClick={() => setActiveView(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
