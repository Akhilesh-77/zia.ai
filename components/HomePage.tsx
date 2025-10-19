import React from 'react';
import type { BotProfile } from '../types';

// Mock data for trending bots
const trendingBots: Omit<BotProfile, 'personality' | 'scenario'>[] = [
    { id: 'trend-1', name: 'Elara Nightshade', description: 'A mysterious historian with a deep connection to ancient artifacts.', photo: 'https://i.imgur.com/8z2h8sP.png' },
    { id: 'trend-2', name: 'Kai, the Explorer', description: 'An adventurous soul charting unknown territories.', photo: 'https://i.imgur.com/pCHaT9I.png' },
    { id: 'trend-3', name: 'Seraphina, Star-Reader', description: 'A wise oracle who speaks in celestial prophecies.', photo: 'https://i.imgur.com/k2m3JtW.png' },
    { id: 'trend-4', name: 'Ronan the Rogue', description: 'A charming rogue with a quick wit and a hidden agenda.', photo: 'https://i.imgur.com/VvXvT2l.png' },
];

interface HomePageProps {
  onSelectBot: (id: string) => void; // For future use if trending bots become interactive
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const BotCard: React.FC<{ bot: Omit<BotProfile, 'personality' | 'scenario'>; onSelect: () => void; }> = 
({ bot, onSelect }) => {
    return (
        <div onClick={onSelect} className="bg-white/5 dark:bg-black/10 rounded-2xl p-4 flex flex-col transition-all duration-300 hover:scale-105 hover:shadow-accent/20 shadow-lg cursor-pointer">
            <img src={bot.photo} alt={bot.name} className="w-full h-40 object-cover rounded-lg mb-4" />
            <h3 className="font-bold text-lg">{bot.name}</h3>
            <p className="text-sm text-gray-400 dark:text-gray-300 flex-1">{bot.description}</p>
        </div>
    );
}

const HomePage: React.FC<HomePageProps> = ({ onSelectBot, theme, toggleTheme }) => {
  return (
    <div className="h-full w-full flex flex-col p-4 bg-light-bg text-light-text dark:bg-dark-bg dark:text-dark-text">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Discover</h1>
        <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-white/10 dark:hover:bg-black/20 transition-colors">
          {theme === 'dark' ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
          )}
        </button>
      </header>
      
      <main className="flex-1 overflow-y-auto pb-24 space-y-8">
        <div>
            <h2 className="text-xl font-semibold mb-4">Trending Bots</h2>
            <div className="grid grid-cols-2 gap-4">
                {trendingBots.map(bot => (
                <BotCard 
                    key={bot.id} 
                    bot={bot} 
                    onSelect={() => alert("This is a trending bot preview!")} 
                />
                ))}
            </div>
        </div>
        <div>
            <h2 className="text-xl font-semibold mb-4">Most Used</h2>
             <div className="grid grid-cols-2 gap-4">
                {trendingBots.slice(2,4).reverse().map(bot => (
                <BotCard 
                    key={bot.id} 
                    bot={bot} 
                    onSelect={() => alert("This is a trending bot preview!")} 
                />
                ))}
            </div>
        </div>
      </main>
    </div>
  );
};

export default HomePage;