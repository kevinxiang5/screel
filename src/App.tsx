import { useCallback, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { LoadingScreen } from './components/LoadingScreen';
import { TabBar } from './components/TabBar';
import { ScreelProvider } from './context/ScreelContext';
import { BankScreen } from './screens/BankScreen';
import { GamesScreen } from './screens/GamesScreen';
import { HomeScreen } from './screens/HomeScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { StatsScreen } from './screens/StatsScreen';
import type { GameId, TabId } from './types';

function ScreelApp() {
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<TabId>('home');
  const [activeGame, setActiveGame] = useState<GameId>(null);

  const finishLoading = useCallback(() => setReady(true), []);

  const goPlay = (game: GameId) => {
    setActiveGame(game);
    setTab('play');
  };

  const changeTab = (next: TabId) => {
    if (next !== 'play') setActiveGame(null);
    setTab(next);
  };

  return (
    <>
      <AnimatePresence>{!ready && <LoadingScreen onDone={finishLoading} />}</AnimatePresence>
      {ready && (
        <div className="app-shell">
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
          {tab === 'you' && <ProfileScreen />}
          {!(tab === 'play' && activeGame) && <TabBar active={tab} onChange={changeTab} />}
        </div>
      )}
    </>
  );
}

export default function App() {
  return (
    <ScreelProvider>
      <ScreelApp />
    </ScreelProvider>
  );
}
