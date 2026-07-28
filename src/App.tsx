import { lazy, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence } from 'framer-motion';
import { AgeBlocked, AgeGate } from './components/AgeGate';
import type { LegalDoc } from './components/LegalDocView';
import { LoadingScreen } from './components/LoadingScreen';
import { ScreelUIProvider, useScreelUI } from './components/ScreelUI';
import { SetupFlow } from './components/SetupFlow';
import { TabBar } from './components/TabBar';
import { ScreelProvider, useScreel } from './context/ScreelContext';
import { requestReviewPrompt } from './native/requestReview';
import type { GameId, TabId } from './types';

const HomeScreen = lazy(() => import('./screens/HomeScreen').then((m) => ({ default: m.HomeScreen })));
const GamesScreen = lazy(() => import('./screens/GamesScreen').then((m) => ({ default: m.GamesScreen })));
const BankScreen = lazy(() => import('./screens/BankScreen').then((m) => ({ default: m.BankScreen })));
const StatsScreen = lazy(() => import('./screens/StatsScreen').then((m) => ({ default: m.StatsScreen })));
const ProfileScreen = lazy(() => import('./screens/ProfileScreen').then((m) => ({ default: m.ProfileScreen })));
const LegalDocView = lazy(() =>
  import('./components/LegalDocView').then((m) => ({ default: m.LegalDocView })),
);

const REVIEW_PROMPT_KEY = 'screel-review-prompt-v1';
const REVIEW_PROMPT_LAUNCH = 5;

function TabPane({ children }: { children: ReactNode }) {
  return <Suspense fallback={<div className="tab-fallback" aria-hidden />}>{children}</Suspense>;
}

function ScreelApp() {
  const { state } = useScreel();
  const { confirm, toast } = useScreelUI();
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<TabId>('home');
  const [activeGame, setActiveGame] = useState<GameId>(null);
  const [legalDoc, setLegalDoc] = useState<LegalDoc | null>(null);
  const [visited, setVisited] = useState<ReadonlySet<TabId>>(() => new Set<TabId>(['home']));
  const launchTrackedRef = useRef(false);

  const finishLoading = useCallback(() => setReady(true), []);
  const inGame = tab === 'play' && Boolean(activeGame);
  const showTabs = !inGame && !legalDoc;

  // Prefetch every tab chunk so the first switch never hits a blank Suspense frame.
  useEffect(() => {
    if (!ready || !state.setupComplete) return;
    const id = window.setTimeout(() => {
      void Promise.all([
        import('./screens/HomeScreen'),
        import('./screens/GamesScreen'),
        import('./screens/BankScreen'),
        import('./screens/StatsScreen'),
        import('./screens/ProfileScreen'),
        import('./components/LegalDocView'),
      ]);
    }, 200);
    return () => window.clearTimeout(id);
  }, [ready, state.setupComplete]);

  useEffect(() => {
    if (!ready || !state.setupComplete || launchTrackedRef.current) return;
    launchTrackedRef.current = true;

    let launches = 0;
    let prompted = false;
    try {
      const raw = localStorage.getItem(REVIEW_PROMPT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { launches?: number; prompted?: boolean };
        launches = typeof parsed.launches === 'number' ? parsed.launches : 0;
        prompted = Boolean(parsed.prompted);
      }
    } catch {
      /* ignore malformed local state */
    }

    const nextLaunches = launches + 1;
    localStorage.setItem(
      REVIEW_PROMPT_KEY,
      JSON.stringify({
        launches: nextLaunches,
        prompted,
      }),
    );

    if (prompted || nextLaunches < REVIEW_PROMPT_LAUNCH) return;

    const ask = window.setTimeout(async () => {
      const wantsToRate = await confirm({
        title: 'Enjoying Screel?',
        message: 'If Screel has been helpful so far, would you rate the app? It helps a lot.',
        confirmLabel: 'Rate app',
        cancelLabel: 'Later',
        tone: 'default',
      });

      localStorage.setItem(
        REVIEW_PROMPT_KEY,
        JSON.stringify({
          launches: nextLaunches,
          prompted: true,
        }),
      );

      if (!wantsToRate) return;

      const opened = await requestReviewPrompt();
      if (!opened) {
        toast('Add your App Store ID in storeLinks.ts to open the rating page.', {
          title: 'App Store link missing',
          tone: 'info',
        });
        return;
      }

      toast('Thanks — opened the App Store so you can leave a rating.', {
        title: 'Rate Screel',
        tone: 'success',
      });
    }, 1400);

    return () => window.clearTimeout(ask);
  }, [ready, state.setupComplete, confirm, toast]);

  const goPlay = (game: GameId) => {
    setVisited((prev) => {
      if (prev.has('play')) return prev;
      const next = new Set(prev);
      next.add('play');
      return next;
    });
    setActiveGame(game);
    setTab('play');
    setLegalDoc(null);
  };

  const changeTab = (next: TabId) => {
    setVisited((prev) => {
      if (prev.has(next)) return prev;
      const copy = new Set(prev);
      copy.add(next);
      return copy;
    });
    if (next !== 'play') setActiveGame(null);
    setLegalDoc(null);
    setTab(next);
  };

  return (
    <>
      <AnimatePresence>{!ready && <LoadingScreen onDone={finishLoading} />}</AnimatePresence>
      {ready && state.ageBlocked && <AgeBlocked />}
      {ready && !state.ageBlocked && !state.ageVerified && <AgeGate />}
      {ready && !state.ageBlocked && state.ageVerified && !state.setupComplete && <SetupFlow />}
      {ready && !state.ageBlocked && state.ageVerified && state.setupComplete && (
        <div className={`app-shell ${inGame ? 'in-game' : ''}`}>
          {legalDoc ? (
            <TabPane>
              <LegalDocView doc={legalDoc} onBack={() => setLegalDoc(null)} />
            </TabPane>
          ) : (
            <div className="tab-route">
              {visited.has('home') && (
                <div
                  className={`tab-page ${tab === 'home' ? 'is-active' : 'is-hidden'}`}
                  aria-hidden={tab !== 'home'}
                >
                  <TabPane>
                    <HomeScreen onNavigate={changeTab} onPlay={goPlay} />
                  </TabPane>
                </div>
              )}
              {visited.has('play') && (
                <div
                  className={`tab-page ${tab === 'play' ? 'is-active' : 'is-hidden'}`}
                  aria-hidden={tab !== 'play'}
                >
                  <TabPane>
                    <GamesScreen
                      activeGame={activeGame}
                      onSelect={setActiveGame}
                      onBack={() => setActiveGame(null)}
                    />
                  </TabPane>
                </div>
              )}
              {visited.has('bank') && (
                <div
                  className={`tab-page ${tab === 'bank' ? 'is-active' : 'is-hidden'}`}
                  aria-hidden={tab !== 'bank'}
                >
                  <TabPane>
                    <BankScreen />
                  </TabPane>
                </div>
              )}
              {visited.has('stats') && (
                <div
                  className={`tab-page ${tab === 'stats' ? 'is-active' : 'is-hidden'}`}
                  aria-hidden={tab !== 'stats'}
                >
                  <TabPane>
                    <StatsScreen />
                  </TabPane>
                </div>
              )}
              {visited.has('you') && (
                <div
                  className={`tab-page ${tab === 'you' ? 'is-active' : 'is-hidden'}`}
                  aria-hidden={tab !== 'you'}
                >
                  <TabPane>
                    <ProfileScreen onOpenLegal={setLegalDoc} />
                  </TabPane>
                </div>
              )}
            </div>
          )}
          {showTabs ? (
            <div className="tab-bar-wrap">
              <TabBar active={tab} onChange={changeTab} />
            </div>
          ) : null}
        </div>
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
