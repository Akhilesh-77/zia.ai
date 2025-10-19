import React, { useState, useRef, useEffect } from 'react';
import type { BotProfile } from '../types';

interface BotsPageProps {
  bots: BotProfile[];
  onSelectBot: (id: string) => void;
  onEditBot: (id: string) => void;
  onDeleteBot: (id: string) => void;
}

const BotCard: React.FC<{ bot: BotProfile; onSelect: () => void; onEdit: () => void; onDelete: () => void; onPhotoClick: () => void; }> = 
({ bot, onSelect, onEdit, onDelete, onPhotoClick }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="bg-white/5 dark:bg-black/10 rounded-2xl p-4 flex flex-col transition-all duration-300 hover:scale-105 hover:shadow-accent/20 shadow-lg relative">
            <div onClick={onSelect} className="cursor-pointer flex-grow">
                <img src={bot.photo} alt={bot.name} className="w-full h-40 object-cover rounded-lg mb-4" onClick={(e) => { e.stopPropagation(); onPhotoClick(); }}/>
                <h3 className="font-bold text-lg">{bot.name}</h3>
                <p className="text-sm text-gray-400 dark:text-gray-300 flex-1">{bot.description}</p>
            </div>
            <div ref={menuRef} className="absolute top-5 right-5">
                <button onClick={() => setMenuOpen(!menuOpen)} className="p-1 rounded-full bg-black/30 hover:bg-black/50 text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
                </button>
                {menuOpen && (
                    <div className="absolute right-0 mt-2 w-32 bg-gray-800 rounded-lg shadow-xl z-10 animate-fadeIn">
                        <a href="#" onClick={(e) => { e.preventDefault(); onEdit(); setMenuOpen(false); }} className="block px-4 py-2 text-sm text-white hover:bg-accent rounded-t-lg">Edit</a>
                        <a href="#" onClick={(e) => { e.preventDefault(); onDelete(); setMenuOpen(false); }} className="block px-4 py-2 text-sm text-white hover:bg-red-500 rounded-b-lg">Delete</a>
                    </div>
                )}
            </div>
        </div>
    );
}

const PhotoModal: React.FC<{ photoUrl: string; onClose: () => void; }> = ({ photoUrl, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-fadeIn" onClick={onClose}>
            <div className="p-4 bg-dark-bg rounded-2xl shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
                <img src={photoUrl} alt="Bot full view" className="max-h-[80vh] max-w-[90vw] object-contain rounded-lg" />
                <button onClick={onClose} className="absolute -top-4 -right-4 bg-white text-black rounded-full h-8 w-8 flex items-center justify-center font-bold text-lg">&times;</button>
            </div>
        </div>
    );
};

const BotsPage: React.FC<BotsPageProps> = ({ bots, onSelectBot, onEditBot, onDeleteBot }) => {
  const [photoModalUrl, setPhotoModalUrl] = useState<string | null>(null);
  
  return (
    <div className="h-full w-full flex flex-col p-4 bg-light-bg text-light-text dark:bg-dark-bg dark:text-dark-text">
      {photoModalUrl && <PhotoModal photoUrl={photoModalUrl} onClose={() => setPhotoModalUrl(null)} />}
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
                onSelect={() => onSelectBot(bot.id)} 
                onEdit={() => onEditBot(bot.id)}
                onDelete={() => onDeleteBot(bot.id)}
                onPhotoClick={() => setPhotoModalUrl(bot.photo)}
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