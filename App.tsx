import React, { useState, useEffect, useCallback } from 'react';
import HomePage from './components/HomePage';
import CreationPage from './components/CreationForm';
import ChatPage from './components/ChatView';
import BotsPage from './components/BotsPage';
import FooterNav from './components/FooterNav';
import type { BotProfile, ChatMessage } from './types';

export type Page = 'home' | 'bots' | 'create' | 'chat';
type Theme = 'light' | 'dark';

const App: React.FC = () => {
  const [page, setPage] = useState<Page>('home');
  const [bots, setBots] = useState<BotProfile[]>([]);
  const [chatHistory, setChatHistory] = useState<Record<string, ChatMessage[]>>({});
  const [activeBotId, setActiveBotId] = useState<string | null>(null);
  const [editingBotId, setEditingBotId] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    // Load data from local storage
    try {
      const storedBots = localStorage.getItem('bots');
      if (storedBots) setBots(JSON.parse(storedBots));
      
      const storedHistory = localStorage.getItem('chatHistory');
      if (storedHistory) setChatHistory(JSON.parse(storedHistory));

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

  const renderPage = () => {
    switch(page) {
      case 'create':
        return <CreationPage onSaveBot={handleSaveBot} onNavigate={handleNavigate} botToEdit={botToEdit ?? null} />;
      case 'chat':
        return activeBot && <ChatPage 
                                profile={activeBot} 
                                onNavigate={handleNavigate} 
                                onEditBot={handleEditBot}
                                initialMessages={chatHistory[activeBot.id] || []}
                                onSaveHistory={handleSaveHistory}
                             />;
      case 'bots':
        return <BotsPage 
                  bots={bots} 
                  onSelectBot={handleSelectBot} 
                  onEditBot={handleEditBot}
                  onDeleteBot={handleDeleteBot}
                />;
      case 'home':
      default:
        return <HomePage 
                  onSelectBot={handleSelectBot} 
                  theme={theme} 
                  toggleTheme={toggleTheme} 
                />;
    }
  }

  const showFooter = page === 'home' || page === 'bots' || page === 'create';

  return (
    <div className="h-screen w-full max-w-md mx-auto overflow-hidden shadow-2xl bg-light-bg dark:bg-dark-bg flex flex-col">
      <div className="flex-1 overflow-y-auto">
        {renderPage()}
      </div>
      {showFooter && <FooterNav currentPage={page} onNavigate={handleNavigate} />}
    </div>
  );
};

export default App;