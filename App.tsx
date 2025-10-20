
import React, { useState, useEffect } from 'react';
import HomePage from './components/HomePage';
import BotsPage from './components/BotsPage';
import CreationForm from './components/CreationForm';
import ChatView from './components/ChatView';
import PersonasPage from './components/PersonasPage';
import ImageGeneratorPage from './components/ImageGeneratorPage';
import FooterNav from './components/FooterNav';
import SettingsPanel from './components/SettingsPanel';
import type { BotProfile, Persona, ChatMessage, AIModelOption, VoicePreference } from './types';

export type Page = 'home' | 'bots' | 'create' | 'images' | 'personas' | 'chat';

const ApiKeyErrorScreen: React.FC = () => (
  <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 bg-red-900/80 text-white">
    <div className="bg-red-800/50 p-8 rounded-2xl shadow-2xl backdrop-blur-sm border border-red-500/50">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-red-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <h1 className="text-3xl font-bold mb-4">Configuration Error</h1>
      <p className="text-lg mb-2">The Gemini API key is missing.</p>
      <p className="max-w-md mx-auto text-red-200">
        This application cannot connect to the AI services because the required 
        <code className="bg-red-900/80 text-yellow-300 px-2 py-1 rounded-md mx-1 font-mono">API_KEY</code> 
        environment variable has not been set in the deployment environment.
      </p>
      <div className="mt-6 text-left bg-black/20 p-4 rounded-lg max-w-md mx-auto">
          <p className="font-bold mb-2">How to fix:</p>
          <p className="text-sm">
            If you are the administrator, please add the <code className="font-mono text-yellow-300">API_KEY</code> to your hosting provider's 
            (e.g., AWS Amplify, Vercel) environment variables and redeploy the application.
          </p>
      </div>
    </div>
  </div>
);


const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [bots, setBots] = useState<BotProfile[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);
  const [botToEdit, setBotToEdit] = useState<BotProfile | null>(null);
  const [chatHistories, setChatHistories] = useState<Record<string, ChatMessage[]>>({});
  const [botUsage, setBotUsage] = useState<Record<string, number>>({});
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedAI, setSelectedAI] = useState<AIModelOption>('gemini');
  const [voicePreference, setVoicePreference] = useState<VoicePreference | null>(null);

  // Check for the API key. This is the primary fix for the blank screen issue.
  if (!process.env.API_KEY) {
    return <ApiKeyErrorScreen />;
  }

  // Load data from localStorage on initial render
  useEffect(() => {
    try {
      const savedBots = localStorage.getItem('bots');
      if (savedBots) setBots(JSON.parse(savedBots));
      
      const savedPersonas = localStorage.getItem('personas');
      if (savedPersonas) setPersonas(JSON.parse(savedPersonas));
      
      const savedHistories = localStorage.getItem('chatHistories');
      if (savedHistories) setChatHistories(JSON.parse(savedHistories));

      const savedUsage = localStorage.getItem('botUsage');
      if (savedUsage) setBotUsage(JSON.parse(savedUsage));

      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'light' || savedTheme === 'dark') {
          setTheme(savedTheme);
      } else {
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          setTheme(prefersDark ? 'dark' : 'light');
      }

      const savedAI = localStorage.getItem('selectedAI');
      if (savedAI && ['gemini', 'zia', 'deepseek', 'qwen'].includes(savedAI)) {
          setSelectedAI(savedAI as AIModelOption);
      }
      
      const savedVoice = localStorage.getItem('voicePreference');
      if (savedVoice && ['male', 'female'].includes(savedVoice)) {
          setVoicePreference(savedVoice as VoicePreference);
      }


    } catch (error) {
        console.error("Failed to load data from localStorage", error);
    }
  }, []);

  // Save data to localStorage whenever it changes
  useEffect(() => {
    try {
        localStorage.setItem('bots', JSON.stringify(bots));
        localStorage.setItem('personas', JSON.stringify(personas));
        localStorage.setItem('chatHistories', JSON.stringify(chatHistories));
        localStorage.setItem('botUsage', JSON.stringify(botUsage));
        localStorage.setItem('theme', theme);
        localStorage.setItem('selectedAI', selectedAI);
        if(voicePreference) localStorage.setItem('voicePreference', voicePreference);

        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    } catch (error) {
        console.error("Failed to save data to localStorage", error);
    }
  }, [bots, personas, chatHistories, botUsage, theme, selectedAI, voicePreference]);

  const handleNavigate = (page: Page) => {
    if (page === 'create') {
        setBotToEdit(null);
    }
    setCurrentPage(page);
  };
  
  const handleSelectBot = (id: string) => {
    setSelectedBotId(id);
    setBotUsage(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
    setCurrentPage('chat');
  };

  const handleEditBot = (id: string) => {
    const bot = bots.find(b => b.id === id);
    if (bot) {
        setBotToEdit(bot);
        setCurrentPage('create');
    }
  };

  const handleDeleteBot = (id: string) => {
    if (window.confirm("Are you sure you want to delete this bot?")) {
        setBots(prev => prev.filter(b => b.id !== id));
        setChatHistories(prev => {
            const newHistories = { ...prev };
            delete newHistories[id];
            return newHistories;
        });
    }
  };

  const handleSaveBot = (botData: Omit<BotProfile, 'id'> | BotProfile) => {
    if ('id' in botData) {
      setBots(prev => prev.map(b => b.id === botData.id ? { ...b, ...botData } : b));
    } else {
      const newBot = { ...botData, id: `bot-${Date.now()}` };
      setBots(prev => [...prev, newBot]);
    }
    setBotToEdit(null);
  };
  
  const handleSavePersona = (personaData: Omit<Persona, 'id'> | Persona) => {
    if ('id' in personaData) {
        setPersonas(prev => prev.map(p => p.id === personaData.id ? { ...p, ...personaData } : p));
    } else {
        const newPersona = { ...personaData, id: `persona-${Date.now()}`};
        setPersonas(prev => [...prev, newPersona]);
    }
  };

  const handleDeletePersona = (id: string) => {
    if (window.confirm("Are you sure you want to delete this persona? This will not affect bots currently using it, but they will no longer be linked.")) {
        setPersonas(prev => prev.filter(p => p.id !== id));
        setBots(prev => prev.map(b => b.personaId === id ? { ...b, personaId: null } : b));
    }
  };
  
  const handleAssignPersona = (personaId: string, botIds: string[]) => {
      const persona = personas.find(p => p.id === personaId);
      if (!persona) return;
      
      setBots(prevBots => prevBots.map(bot => {
          if (botIds.includes(bot.id)) {
              return { ...bot, personaId: persona.id, personality: persona.personality };
          }
          return bot;
      }));
  };

  const handleNewMessage = (botId: string, message: ChatMessage) => {
    setChatHistories(prev => ({
        ...prev,
        [botId]: [...(prev[botId] || []), message]
    }));
  };
  
  const handleUpdateHistory = (botId: string, newHistory: ChatMessage[]) => {
    setChatHistories(prev => ({
      ...prev,
      [botId]: newHistory,
    }));
  };

  const handleClearData = () => {
      if (window.confirm("Are you sure you want to delete all your bots, personas, and chat history? This cannot be undone.")) {
        setBots([]);
        setPersonas([]);
        setChatHistories({});
        setBotUsage({});
        localStorage.removeItem('bots');
        localStorage.removeItem('personas');
        localStorage.removeItem('chatHistories');
        localStorage.removeItem('botUsage');
      }
  };

  const selectedBot = bots.find(b => b.id === selectedBotId);
  const personaForBot = personas.find(p => p.id === selectedBot?.personaId);
  
  const effectiveBot = selectedBot ? {
      ...selectedBot,
      personality: personaForBot?.personality || selectedBot.personality,
      persona: personaForBot
  } : null;

  const renderPage = () => {
    switch(currentPage) {
      case 'home':
        return <HomePage 
                    bots={bots} 
                    botUsage={botUsage}
                    onSelectBot={handleSelectBot} 
                    onEditBot={handleEditBot}
                    onDeleteBot={handleDeleteBot}
                    theme={theme}
                    toggleTheme={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
                    onOpenSettings={() => setIsSettingsOpen(true)}
                />;
      case 'bots':
        return <BotsPage bots={bots} onSelectBot={handleSelectBot} onEditBot={handleEditBot} onDeleteBot={handleDeleteBot} />;
      case 'create':
        return <CreationForm onSaveBot={handleSaveBot} onNavigate={handleNavigate} botToEdit={botToEdit} />;
      case 'images':
        return <ImageGeneratorPage />;
      case 'personas':
        return <PersonasPage personas={personas} bots={bots} onSave={handleSavePersona} onDelete={handleDeletePersona} onAssign={handleAssignPersona} />;
      case 'chat':
        if (effectiveBot) {
          return <ChatView 
                    bot={effectiveBot} 
                    onBack={() => setCurrentPage('home')}
                    chatHistory={chatHistories[effectiveBot.id] || []}
                    onNewMessage={(message) => handleNewMessage(effectiveBot.id, message)}
                    onUpdateHistory={(newHistory) => handleUpdateHistory(effectiveBot.id, newHistory)}
                    selectedAI={selectedAI}
                    voicePreference={voicePreference}
                 />;
        }
        setCurrentPage('home');
        return null;
      default:
        return null;
    }
  };

  return (
    <div className={`w-full h-full max-w-md mx-auto flex flex-col font-sans shadow-2xl overflow-hidden relative ${theme}`}>
      <SettingsPanel 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        theme={theme}
        toggleTheme={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
        onClearData={handleClearData}
        selectedAI={selectedAI}
        onSelectAI={setSelectedAI}
        voicePreference={voicePreference}
        onSetVoicePreference={setVoicePreference}
      />
      <div className="flex-1 overflow-hidden">
        {renderPage()}
      </div>
      {currentPage !== 'chat' && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md">
            <FooterNav currentPage={currentPage} onNavigate={handleNavigate} />
        </div>
      )}
    </div>
  );
};

export default App;
