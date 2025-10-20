import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { BotProfile, ChatMessage, Persona, AIModelOption } from '../types';
import { generateBotResponse, generateUserResponseSuggestion } from '../services/geminiService';
import { xyz } from '../services/xyz';

interface ChatViewProps {
  bot: BotProfile & { persona?: Persona | null };
  onBack: () => void;
  chatHistory: ChatMessage[];
  onNewMessage: (message: ChatMessage) => void;
  onUpdateHistory: (newHistory: ChatMessage[]) => void;
  selectedAI: AIModelOption;
}

const ChatView: React.FC<ChatViewProps> = ({ bot, onBack, chatHistory, onNewMessage, onUpdateHistory, selectedAI }) => {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);
  
  useEffect(() => {
    if (chatHistory.length === 0 && bot.scenario) {
      const scenarioMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        text: bot.scenario,
        sender: 'bot',
        timestamp: Date.now(),
      };
      onNewMessage(scenarioMessage);
    }
  }, []);

  const handleSend = async (messageText: string) => {
    if (!messageText.trim()) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      text: messageText,
      sender: 'user',
      timestamp: Date.now(),
    };
    
    const newHistory = [...chatHistory, userMessage];
    onUpdateHistory(newHistory); // Update history immediately with user message
    setInput('');
    setIsTyping(true);

    try {
      const enhancedPersonality = xyz(newHistory, userMessage.text, bot.personality);
      const botResponseText = await generateBotResponse(newHistory, enhancedPersonality, selectedAI);

      const finalBotMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        text: botResponseText,
        sender: 'bot',
        timestamp: Date.now(),
      };
      onNewMessage(finalBotMessage);

    } catch (error) {
      console.error("Error sending message:", error);
      onNewMessage({
        id: `error-${Date.now()}`,
        text: "Sorry, I encountered an error. Please try again.",
        sender: 'bot',
        timestamp: Date.now()
      });
    } finally {
      setIsTyping(false);
    }
  };
  
  const handleBuildMessage = async () => {
      setIsTyping(true);
      try {
          const suggestion = await generateUserResponseSuggestion(chatHistory, bot.personality, selectedAI);
          setInput(suggestion.replace(/"/g, '')); // Remove quotes from suggestions
      } catch (error) {
          console.error("Failed to build message suggestion:", error);
          setInput("Sorry, couldn't think of anything right now.");
      } finally {
          setIsTyping(false);
      }
  };

  const handleDeleteMessage = (messageId: string) => {
      const newHistory = chatHistory.filter(m => m.id !== messageId);
      onUpdateHistory(newHistory);
  };
  
  const handleRegenerateMessage = async (messageId: string) => {
      const messageIndex = chatHistory.findIndex(m => m.id === messageId);
      if (messageIndex === -1 || chatHistory[messageIndex].sender !== 'bot') return;

      const historyForRegen = chatHistory.slice(0, messageIndex);
      setIsTyping(true);
      try {
          const enhancedPersonality = xyz(historyForRegen, historyForRegen[historyForRegen.length-1]?.text || '', bot.personality);
          const botResponseText = await generateBotResponse(historyForRegen, enhancedPersonality, selectedAI);
          
          const newHistory = [...chatHistory];
          newHistory[messageIndex] = { ...newHistory[messageIndex], text: botResponseText, timestamp: Date.now() };
          onUpdateHistory(newHistory);
      } catch (error) {
          console.error("Error regenerating message:", error);
      } finally {
          setIsTyping(false);
      }
  };

  const parseMessage = (text: string) => {
    const parts = text.split(/(\*.*?\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={index} className="text-accent italic action-text-tilted">{part.slice(1, -1)}</em>;
      }
      return part;
    });
  };

  return (
    <div className="h-full w-full flex flex-col bg-light-bg text-light-text dark:bg-dark-bg dark:text-dark-text relative">
        {bot.chatBackground && (
            <div style={{backgroundImage: `url(${bot.chatBackground})`}} className="absolute inset-0 w-full h-full bg-cover bg-center z-0" >
                <div className="absolute inset-0 w-full h-full bg-black/50 backdrop-blur-sm"></div>
            </div>
        )}
      <header className="flex items-center p-4 border-b border-white/10 dark:border-black/20 z-10 bg-light-bg/80 dark:bg-dark-bg/80 backdrop-blur-sm">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-white/10 dark:hover:bg-black/20">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <img src={bot.photo} alt={bot.name} className="h-10 w-10 rounded-full object-cover ml-4" />
        <div className="ml-3">
          <h2 className="font-bold">{bot.name}</h2>
          <p className="text-xs text-gray-400">{bot.description}</p>
        </div>
      </header>
      
      <main className="flex-1 overflow-y-auto p-4 space-y-1 z-10">
        {chatHistory.map((msg) => (
          <div key={msg.id} className={`flex items-end gap-2 group ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.sender === 'bot' && <img src={bot.photo} alt={bot.name} className="h-8 w-8 rounded-full object-cover self-start" />}
            
            <div className={`flex items-center gap-2 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`max-w-xs md:max-w-md lg:max-w-lg p-3 rounded-2xl ${msg.sender === 'user' ? 'bg-accent text-white rounded-br-none' : 'bg-white/10 dark:bg-black/20 rounded-bl-none'}`}>
                    <p className="whitespace-pre-wrap">{parseMessage(msg.text)}</p>
                </div>
                {msg.sender === 'bot' && (
                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleRegenerateMessage(msg.id)} className="p-1 rounded-full bg-black/30 hover:bg-accent"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M4 4l1.5 1.5A9 9 0 0120.5 15M20 20l-1.5-1.5A9 9 0 013.5 9" /></svg></button>
                        <button onClick={() => handleDeleteMessage(msg.id)} className="p-1 rounded-full bg-black/30 hover:bg-red-500"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                    </div>
                )}
            </div>
             {msg.sender === 'bot' && bot.persona?.photo && <img src={bot.persona.photo} alt={bot.persona.name} className="h-8 w-8 rounded-full object-cover self-start" />}
          </div>
        ))}
        {isTyping && (
            <div className="flex items-end gap-2 justify-start">
                <img src={bot.photo} alt={bot.name} className="h-8 w-8 rounded-full object-cover" />
                <div className="p-3 rounded-2xl bg-white/10 dark:bg-black/20 rounded-bl-none">
                    <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                    </div>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      <footer className="p-4 border-t border-white/10 dark:border-black/20 z-10 bg-light-bg/80 dark:bg-dark-bg/80 backdrop-blur-sm">
        <div className="flex items-center bg-white/10 dark:bg-black/20 rounded-2xl pl-2">
          <button onClick={handleBuildMessage} disabled={isTyping} className="p-2 text-gray-400 hover:text-accent disabled:opacity-50 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(input); } }}
            placeholder="Type your message..."
            rows={1}
            className="flex-1 bg-transparent p-3 focus:outline-none resize-none max-h-24"
          />
          <button onClick={() => handleSend(input)} disabled={isTyping || !input.trim()} className="bg-accent rounded-full h-10 w-10 flex items-center justify-center text-white disabled:opacity-50 transition-opacity mr-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </button>
        </div>
      </footer>
    </div>
  );
};

export default ChatView;
