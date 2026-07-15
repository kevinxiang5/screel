import { useCallback, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { AgeBlocked, AgeGate } from './components/AgeGate';
import { LegalDocView, type LegalDoc } from './components/LegalDocView';
import { LoadingScreen } from './components/LoadingScreen';
import { ScreelUIProvider } from './components/ScreelUI';
import { SetupFlow } from './components/SetupFlow';
import { TabBar } from './components/TabBar';
import { ScreelProvider, useScreel } from './context/ScreelContext';
import { BankScreen } from './screens/BankScreen';
import { GamesScreen } from './screens/GamesScreen';
import { HomeScreen } from './screens/HomeScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { StatsScreen } from './screens/StatsScreen';
import type { GameId, TabId } from './types';

function ScreelApp() {
  const { state } = useScreel();
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<TabId>('home');
  const [activeGame, setActiveGame] = useState<GameId>(null);
  const [legalDoc, setLegalDoc] = useState<LegalDoc | null>(null);

  const finishLoading = useCallback(() => setReady(true), []);

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
        <div className="app-shell">
          {legalDoc ? (
            <LegalDocView doc={legalDoc} onBack={() => setLegalDoc(null)} />
          ) : (
            <>
              {tab === 'home' && <HomeScreen onNavigate={changeTab} onPlay={goPlay} />}
              {tab === 'play' && (
                <GamesScreen
                  activeGame={activeGame}
                  onSelect={setActiveGame}
                  onBack={() => setActiveGame(null)}
                />
              )}
              {tab === 'bank' && <BankScreen />}
              {tab === 'stats' && <StatsScreen />}
              {tab === 'you' && <ProfileScreen onOpenLegal={setLegalDoc} />}
            </>
          )}
          {!(tab === 'play' && activeGame) && !legalDoc && <TabBar active={tab} onChange={changeTab} />}
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
