import { lazy, Suspense, useCallback, useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AgeBlocked, AgeGate } from './components/AgeGate';
import type { LegalDoc } from './components/LegalDocView';
import { LoadingScreen } from './components/LoadingScreen';
import { ScreelUIProvider } from './components/ScreelUI';
import { SetupFlow } from './components/SetupFlow';
import { TabBar } from './components/TabBar';
import { ScreelProvider, useScreel } from './context/ScreelContext';
import type { GameId, TabId } from './types';

const HomeScreen = lazy(() => import('./screens/HomeScreen').then((m) => ({ default: m.HomeScreen })));
const GamesScreen = lazy(() => import('./screens/GamesScreen').then((m) => ({ default: m.GamesScreen })));
const BankScreen = lazy(() => import('./screens/BankScreen').then((m) => ({ default: m.BankScreen })));
const StatsScreen = lazy(() => import('./screens/StatsScreen').then((m) => ({ default: m.StatsScreen })));
const ProfileScreen = lazy(() => import('./screens/ProfileScreen').then((m) => ({ default: m.ProfileScreen })));
const LegalDocView = lazy(() =>
  import('./components/LegalDocView').then((m) => ({ default: m.LegalDocView })),
);

const tabMotion = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const },
};

function TabFallback() {
  return <div className="tab-fallback" aria-hidden />;
}

function TabPane({ children }: { children: ReactNode }) {
  return <Suspense fallback={<TabFallback />}>{children}</Suspense>;
}

function ScreelApp() {
  const { state } = useScreel();
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<TabId>('home');
  const [activeGame, setActiveGame] = useState<GameId>(null);
  const [legalDoc, setLegalDoc] = useState<LegalDoc | null>(null);

  const finishLoading = useCallback(() => setReady(true), []);
  const inGame = tab === 'play' && Boolean(activeGame);
  const showTabs = !inGame && !legalDoc;

  // Warm the Play chunk so the first tab click doesn't blank the shell.
  useEffect(() => {
    if (!ready || !state.setupComplete) return;
    const id = window.setTimeout(() => {
      void import('./screens/GamesScreen');
    }, 400);
    return () => window.clearTimeout(id);
  }, [ready, state.setupComplete]);

  const goPlay = (game: GameId) => {
    setActiveGame(game);
    setTab('play');
    setLegalDoc(null);
  };

  const changeTab = (next: TabId) => {
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
              <AnimatePresence mode="wait" initial={false}>
                {tab === 'home' && (
                  <motion.div key="home" className="tab-page" {...tabMotion}>
                    <TabPane>
                      <HomeScreen onNavigate={changeTab} onPlay={goPlay} />
                    </TabPane>
                  </motion.div>
                )}
                {tab === 'play' && (
                  <motion.div key="play" className="tab-page" {...tabMotion}>
                    <TabPane>
                      <GamesScreen
                        activeGame={activeGame}
                        onSelect={setActiveGame}
                        onBack={() => setActiveGame(null)}
                      />
                    </TabPane>
                  </motion.div>
                )}
                {tab === 'bank' && (
                  <motion.div key="bank" className="tab-page" {...tabMotion}>
                    <TabPane>
                      <BankScreen />
                    </TabPane>
                  </motion.div>
                )}
                {tab === 'stats' && (
                  <motion.div key="stats" className="tab-page" {...tabMotion}>
                    <TabPane>
                      <StatsScreen />
                    </TabPane>
                  </motion.div>
                )}
                {tab === 'you' && (
                  <motion.div key="you" className="tab-page" {...tabMotion}>
                    <TabPane>
                      <ProfileScreen onOpenLegal={setLegalDoc} />
                    </TabPane>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
          <AnimatePresence>
            {showTabs && (
              <motion.div
                key="tabs"
                className="tab-bar-wrap"
                initial={{ y: 28, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 36, opacity: 0 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              >
                <TabBar active={tab} onChange={changeTab} />
              </motion.div>
            )}
          </AnimatePresence>
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
