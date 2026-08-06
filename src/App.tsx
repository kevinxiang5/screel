import { lazy, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AgeBlocked, AgeGate } from './components/AgeGate';
import type { LegalDoc } from './components/LegalDocView';
import { FirstRunGuide } from './components/FirstRunGuide';
import { LoadingScreen } from './components/LoadingScreen';
import { ScreelUIProvider, useScreelUI } from './components/ScreelUI';
import { SetupFlow } from './components/SetupFlow';
import { TabBar } from './components/TabBar';
import { TabErrorBoundary } from './components/TabErrorBoundary';
import { ScreelProvider, useScreel } from './context/ScreelContext';
import { requestReviewPrompt } from './native/requestReview';
import type { GameId, TabId } from './types';

const HomeScreen = lazy(() => import('./screens/HomeScreen').then((m) => ({ default: m.HomeScreen })));
const EarnScreen = lazy(() => import('./screens/EarnScreen').then((m) => ({ default: m.EarnScreen })));
const GamesScreen = lazy(() => import('./screens/GamesScreen').then((m) => ({ default: m.GamesScreen })));
const StatsScreen = lazy(() => import('./screens/StatsScreen').then((m) => ({ default: m.StatsScreen })));
const ProfileScreen = lazy(() => import('./screens/ProfileScreen').then((m) => ({ default: m.ProfileScreen })));
const LegalDocView = lazy(() =>
  import('./components/LegalDocView').then((m) => ({ default: m.LegalDocView })),
);

const REVIEW_PROMPT_KEY = 'screel-review-prompt-v1';

function TabPane({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <TabErrorBoundary label={label}>
      <Suspense fallback={<div className="tab-fallback" aria-hidden />}>{children}</Suspense>
    </TabErrorBoundary>
  );
}

function ScreelApp() {
  const { state } = useScreel();
  const { confirm, toast } = useScreelUI();
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<TabId>('home');
  const [activeGame, setActiveGame] = useState<GameId>(null);
  const [legalDoc, setLegalDoc] = useState<LegalDoc | null>(null);
  const launchTrackedRef = useRef(false);

  const finishLoading = useCallback(() => setReady(true), []);
  const inGame = tab === 'play' && Boolean(activeGame);
  const showTabs = !inGame && !legalDoc;
  const showGuide = state.setupComplete && !state.guideComplete;
  const showShell = state.setupComplete && state.guideComplete;

  useEffect(() => {
    if (!ready || !showShell) return;
    void Promise.all([
      import('./screens/HomeScreen'),
      import('./screens/EarnScreen'),
      import('./screens/GamesScreen'),
      import('./screens/StatsScreen'),
      import('./screens/ProfileScreen'),
      import('./components/LegalDocView'),
    ]);
  }, [ready, showShell]);

  useEffect(() => {
    if (!ready || !showShell || launchTrackedRef.current) return;
    launchTrackedRef.current = true;

    let launches = 0;
    let lastAttemptLaunch: number | null = null;
    try {
      const raw = localStorage.getItem(REVIEW_PROMPT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { launches?: number; lastAttemptLaunch?: number };
        launches = typeof parsed.launches === 'number' ? parsed.launches : 0;
        lastAttemptLaunch = typeof parsed.lastAttemptLaunch === 'number' ? parsed.lastAttemptLaunch : null;
      }
    } catch {
      /* ignore */
    }

    const nextLaunches = launches + 1;
    localStorage.setItem(REVIEW_PROMPT_KEY, JSON.stringify({ launches: nextLaunches, lastAttemptLaunch }));

    const scheduled = nextLaunches === 5 || nextLaunches === 15 || nextLaunches === 30;
    const shouldAsk =
      scheduled &&
      lastAttemptLaunch !== nextLaunches;
    if (!shouldAsk) return;

    const ask = window.setTimeout(async () => {
      const wantsToRate = await confirm({
        title: 'Enjoying Screel?',
        message: 'If Screel has been helpful so far, would you rate the app? It helps a lot.',
        confirmLabel: 'Rate app',
        cancelLabel: 'No thanks',
        dismissOnBackdrop: false,
        tone: 'default',
      });

      if (!wantsToRate) return;

      localStorage.setItem(
        REVIEW_PROMPT_KEY,
        JSON.stringify({ launches: nextLaunches, lastAttemptLaunch: nextLaunches }),
      );

      const opened = await requestReviewPrompt();
      if (!opened) {
        toast('Add your App Store ID in storeLinks.ts to open the rating page.', {
          title: 'App Store link missing',
          tone: 'info',
        });
        return;
      }

      toast('Thanks. Opened the App Store so you can leave a rating.', {
        title: 'Rate Screel',
        tone: 'success',
      });
    }, 1400);

    return () => window.clearTimeout(ask);
  }, [ready, showShell, confirm, toast]);

  const goPlay = (game: GameId) => {
    setActiveGame(game);
    setTab('play');
    setLegalDoc(null);
  };

  const changeTab = (next: TabId) => {
    if (next === tab && !legalDoc && !(next === 'play' && activeGame)) return;
    if (next !== 'play') setActiveGame(null);
    setLegalDoc(null);
    setTab(next);
  };

  const startFromGuide = (next: TabId) => {
    setActiveGame(null);
    setLegalDoc(null);
    setTab(next);
  };

  return (
    <>
      <AnimatePresence>{!ready && <LoadingScreen onDone={finishLoading} />}</AnimatePresence>
      {ready && state.ageBlocked && <AgeBlocked />}
      {ready && !state.ageBlocked && !state.ageVerified && <AgeGate />}
      {ready && !state.ageBlocked && state.ageVerified && !state.setupComplete && <SetupFlow />}
      {ready && !state.ageBlocked && state.ageVerified && showGuide && (
        <FirstRunGuide onChoose={startFromGuide} />
      )}
      {ready && !state.ageBlocked && state.ageVerified && showShell && (
        <motion.div
          className={`app-shell ${inGame ? 'in-game' : ''}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="tab-route">
            <div
              className={`tab-page ${tab === 'home' && !legalDoc ? 'is-active' : 'is-hidden'}`}
              aria-hidden={tab !== 'home' || Boolean(legalDoc)}
            >
              <TabPane label="Home">
                <HomeScreen onNavigate={changeTab} onPlay={goPlay} />
              </TabPane>
            </div>
            <div
              className={`tab-page ${tab === 'earn' && !legalDoc ? 'is-active' : 'is-hidden'}`}
              aria-hidden={tab !== 'earn' || Boolean(legalDoc)}
            >
              <TabPane label="Earn">
                <EarnScreen />
              </TabPane>
            </div>
            <div
              className={`tab-page ${tab === 'play' && !legalDoc ? 'is-active' : 'is-hidden'}`}
              aria-hidden={tab !== 'play' || Boolean(legalDoc)}
            >
              <TabPane label="Play">
                <GamesScreen
                  activeGame={activeGame}
                  onSelect={setActiveGame}
                  onBack={() => setActiveGame(null)}
                />
              </TabPane>
            </div>
            <div
              className={`tab-page ${tab === 'stats' && !legalDoc ? 'is-active' : 'is-hidden'}`}
              aria-hidden={tab !== 'stats' || Boolean(legalDoc)}
            >
              <TabPane label="Stats">
                <StatsScreen onNavigate={changeTab} />
              </TabPane>
            </div>
            <div
              className={`tab-page ${tab === 'you' && !legalDoc ? 'is-active' : 'is-hidden'}`}
              aria-hidden={tab !== 'you' || Boolean(legalDoc)}
            >
              <TabPane label="You">
                <ProfileScreen onOpenLegal={setLegalDoc} />
              </TabPane>
            </div>
          </div>

          <AnimatePresence>
            {legalDoc ? (
              <motion.div
                key={legalDoc}
                className="legal-overlay"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 18 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              >
                <TabPane>
                  <LegalDocView doc={legalDoc} onBack={() => setLegalDoc(null)} />
                </TabPane>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {showTabs ? (
            <div className="tab-bar-wrap">
              <TabBar active={tab} onChange={changeTab} />
            </div>
          ) : null}
        </motion.div>
      )}
    </>
  );
}

export default function App() {
  return (
    <ScreelProvider>
      <ScreelUIProvider>
        <ScreelApp />
      </ScreelUIProvider>
    </ScreelProvider>
  );
}
