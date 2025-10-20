import React from 'react';
import type { BotProfile } from '../types';
import BotCard from './BotCard';

interface BotsPageProps {
  bots: BotProfile[];
  onSelectBot: (id: string) => void;
  onEditBot: (id: string) => void;
  onDeleteBot: (id: string) => void;
}

const BotsPage: React.FC<BotsPageProps> = ({ bots, onSelectBot, onEditBot, onDeleteBot }) => {
  return (
    <div className="h-full w-full flex flex-col p-4 bg-light-bg text-light-text dark:bg-dark-bg dark:text-dark-text">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Your Bots</h1>
      </header>
      
      <main className="flex-1 overflow-y-auto pb-24">
        {bots.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {bots.map(bot => (
              <BotCard 
                key={bot.id} 
                bot={bot} 
                onChat={() => onSelectBot(bot.id)} 
                onEdit={() => onEditBot(bot.id)}
                onDelete={() => onDeleteBot(bot.id)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
            <p className="text-lg">No bots yet.</p>
            <p>Tap the 'Create' button below to make one!</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default BotsPage;
