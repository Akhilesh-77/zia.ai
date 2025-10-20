import React, { useState, useEffect, useCallback } from 'react';
import HomePage from './components/HomePage';
import CreationPage from './components/CreationForm';
import ChatPage from './components/ChatView';
import BotsPage from './components/BotsPage';
import FooterNav from './components/FooterNav';
import PersonasPage from './components/PersonasPage';
import ImageGeneratorPage from './components/ImageGeneratorPage';
import SettingsPanel from './components/SettingsPanel'; // New component
import type { BotProfile, ChatMessage, Persona } from './types';

export type Page = 'home' | 'bots' | 'create' | 'chat' | 'personas' | 'images';
export type Theme = 'light' | 'dark';
export type VoiceOption = 'male' | 'female' | 'auto';

const App: React.FC = () => {
  const [page, setPage] = useState<Page>('home');
  const [bots, setBots] = useState<BotProfile[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [chatHistory, setChatHistory] = useState<Record<string, ChatMessage[]>>({});
  const [botUsage, setBotUsage] = useState<Record<string, number>>({});
  const [personaUsage, setPersonaUsage] = useState<Record<string, number>>({});
  const [activeBotId, setActiveBotId] = useState<string | null>(null);
  const [editingBotId, setEditingBotId] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>('dark');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [voicePreference, setVoicePreference] = useState<VoiceOption>('auto');

  useEffect(() => {
    // Load data from local storage
    try {
      const storedBots = localStorage.getItem('bots');
      if (storedBots) setBots(JSON.parse(storedBots));
      
      const storedPersonas = localStorage.getItem('personas');
      if (storedPersonas) setPersonas(JSON.parse(storedPersonas));
      
      const storedHistory = localStorage.getItem('chatHistory');
      if (storedHistory) setChatHistory(JSON.parse(storedHistory));
      
      const storedBotUsage = localStorage.getItem('botUsage');
      if (storedBotUsage) setBotUsage(JSON.parse(storedBotUsage));

      const storedPersonaUsage = localStorage.getItem('personaUsage');
      if (storedPersonaUsage) setPersonaUsage(JSON.parse(storedPersonaUsage));

      const storedVoicePref = localStorage.getItem('voicePreference') as VoiceOption;
      if (storedVoicePref) setVoicePreference(storedVoicePref);

    } catch (e) {
      console.error("Failed to parse data from localStorage", e);
    }
     // Load theme from local storage
    const storedTheme = localStorage.getItem('theme') as Theme;
    if (storedTheme) {
      setTheme(storedTheme);
    } else {
      setTheme(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    }
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove(theme === 'dark' ? 'light' : 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);
  
  const handleSetVoicePreference = (pref: VoiceOption) => {
      setVoicePreference(pref);
      localStorage.setItem('voicePreference', pref);
  };


  const handleSaveBot = (botData: Omit<BotProfile, 'id'> | BotProfile) => {
    let updatedBots;
    if ('id' in botData) {
      updatedBots = bots.map(b => b.id === botData.id ? botData : b);
    } else {
      const newBot = { ...botData, id: Date.now().toString() };
      updatedBots = [...bots, newBot];
    }
    setBots(updatedBots);
    localStorage.setItem('bots', JSON.stringify(updatedBots));
    setEditingBotId(null);
  };

  const handleDeleteBot = (botId: string) => {
    if (window.confirm("Are you sure you want to delete this bot and its chat history?")) {
        const updatedBots = bots.filter(b => b.id !== botId);
        setBots(updatedBots);
        localStorage.setItem('bots', JSON.stringify(updatedBots));
        
        const updatedHistory = {...chatHistory};
        delete updatedHistory[botId];
        setChatHistory(updatedHistory);
        localStorage.setItem('chatHistory', JSON.stringify(updatedHistory));
        
        const updatedUsage = {...botUsage};
        delete updatedUsage[botId];
        setBotUsage(updatedUsage);
        localStorage.setItem('botUsage', JSON.stringify(updatedUsage));
    }
  };
  
  const handleSavePersona = (personaData: Omit<Persona, 'id'> | Persona) => {
    let updatedPersonas;
    if ('id' in personaData) {
        updatedPersonas = personas.map(p => p.id === personaData.id ? personaData : p);
    } else {
        const newPersona = { ...personaData, id: Date.now().toString() };
        updatedPersonas = [...personas, newPersona];
    }
    setPersonas(updatedPersonas);
    localStorage.setItem('personas', JSON.stringify(updatedPersonas));
  };
  
  const handleAssignPersona = (personaId: string, botIdsToAssign: string[]) => {
      const persona = personas.find(p => p.id === personaId);
      if (!persona) return;

      const updatedBots = bots.map(bot => {
          if (botIdsToAssign.includes(bot.id)) {
              // Assign persona
              return { ...bot, personaId: persona.id, personality: persona.personality };
          } else if (bot.personaId === personaId && !botIdsToAssign.includes(bot.id)) {
              // Un-assign persona (bot was previously assigned but now is not)
              // We leave the personality prompt as is, but remove the link.
              return { ...bot, personaId: undefined };
          }
          return bot;
      });
      
      setBots(updatedBots);
      localStorage.setItem('bots', JSON.stringify(updatedBots));

      // Track persona usage
      const newUsage = { ...personaUsage, [personaId]: (personaUsage[personaId] || 0) + 1 };
      setPersonaUsage(newUsage);
      localStorage.setItem('personaUsage', JSON.stringify(newUsage));
  };

  const handleDeletePersona = (personaId: string) => {
    if (window.confirm("Are you sure you want to delete this persona? This will unassign it from all bots.")) {
        const updatedPersonas = personas.filter(p => p.id !== personaId);
        setPersonas(updatedPersonas);
        localStorage.setItem('personas', JSON.stringify(updatedPersonas));

        // Un-assign from bots
        const updatedBots = bots.map(bot => {
            if (bot.personaId === personaId) {
                return { ...bot, personaId: undefined };
            }
            return bot;
        });
        setBots(updatedBots);
        localStorage.setItem('bots', JSON.stringify(updatedBots));

        const updatedUsage = {...personaUsage};
        delete updatedUsage[personaId];
        setPersonaUsage(updatedUsage);
        localStorage.setItem('personaUsage', JSON.stringify(updatedUsage));
    }
  };

  const handleSaveHistory = useCallback((botId: string, messages: ChatMessage[]) => {
      const newHistory = {...chatHistory, [botId]: messages };
      setChatHistory(newHistory);
      localStorage.setItem('chatHistory', JSON.stringify(newHistory));
  }, [chatHistory]);

  const handleEditBot = (botId: string) => {
    setEditingBotId(botId);
    setPage('create');
  };

  const handleSelectBot = (botId: string) => {
    const newUsage = { ...botUsage, [botId]: (botUsage[botId] || 0) + 1 };
    setBotUsage(newUsage);
    localStorage.setItem('botUsage', JSON.stringify(newUsage));
    
    setActiveBotId(botId);
    setPage('chat');
  };

  const handleNavigate = (targetPage: Page) => {
    if (targetPage !== 'create' && targetPage !== 'chat') {
        setEditingBotId(null);
    }
    if (targetPage !== 'chat') {
        setActiveBotId(null);
    }
    setPage(targetPage);
  };
  
  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'dark' ? 'light' : 'dark');
  };

  const activeBot = bots.find(b => b.id === activeBotId);
  const botToEdit = bots.find(b => b.id === editingBotId);
  const activePersona = activeBot?.personaId ? personas.find(p => p.id === activeBot.personaId) : null;

  const renderPage = () => {
    switch(page) {
      case 'create':
        return <CreationPage 
                  onSaveBot={handleSaveBot} 
                  onNavigate={handleNavigate} 
                  botToEdit={botToEdit ?? null}
                />;
      case 'chat':
        return activeBot && <ChatPage 
                                profile={activeBot}
                                persona={activePersona} 
                                onNavigate={handleNavigate} 
                                onEditBot={handleEditBot}
                                initialMessages={chatHistory[activeBot.id] || []}
                                onSaveHistory={handleSaveHistory}
                                voicePreference={voicePreference}
                             />;
      case 'bots':
        return <BotsPage 
                  bots={bots} 
                  onSelectBot={handleSelectBot} 
                  onEditBot={handleEditBot}
                  onDeleteBot={handleDeleteBot}
                />;
      case 'personas':
        return <PersonasPage
                  personas={personas}
                  bots={bots}
                  onSave={handleSavePersona}
                  onDelete={handleDeletePersona}
                  onAssign={handleAssignPersona}
                />;
      case 'images':
        return <ImageGeneratorPage />;
      case 'home':
      default:
        return <HomePage 
                  bots={bots}
                  botUsage={botUsage}
                  onSelectBot={handleSelectBot} 
                  onEditBot={handleEditBot}
                  onDeleteBot={handleDeleteBot}
                  theme={theme} 
                  toggleTheme={toggleTheme}
                  onOpenSettings={() => setIsSettingsOpen(true)}
                />;
    }
  }

  const showFooter = page === 'home' || page === 'bots' || page === 'create' || page === 'images' || page === 'personas';

  return (
    <div className="h-screen w-full max-w-md mx-auto overflow-hidden shadow-2xl bg-light-bg dark:bg-dark-bg flex flex-col">
       <SettingsPanel 
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            currentVoice={voicePreference}
            onSetVoice={handleSetVoicePreference}
        />
      <div className="flex-1 overflow-y-auto">
        {renderPage()}
      </div>
      {showFooter && <FooterNav currentPage={page} onNavigate={handleNavigate} />}
    </div>
  );
};

export default App;