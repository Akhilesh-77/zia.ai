import React, { useState, useRef, useEffect } from 'react';
import { BotProfile, ChatMessage } from '../types';
import { initChat } from '../services/geminiService';
import type { Chat } from '@google/genai';

interface ChatPageProps {
  profile: BotProfile;
  onNavigate: (page: 'home' | 'bots') => void;
  onEditBot: (id: string) => void;
  initialMessages: ChatMessage[];
  onSaveHistory: (botId: string, messages: ChatMessage[]) => void;
}

const renderMessage = (text: string) => {
    const parts = text.split(/(\*.*?\*)/g);
    return (
      <p className="whitespace-pre-wrap">
        {parts.map((part, index) => {
          if (part.startsWith('*') && part.endsWith('*')) {
            return <em key={index} className="text-accent not-italic">{part.slice(1, -1)}</em>;
          }
          return <span key={index}>{part}</span>;
        })}
      </p>
    );
};

const MessageBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
    const isUser = message.sender === 'user';
    const isAssistant = message.sender === 'assistant';
    
    return (
        <div className={`flex w-full max-w-md mx-auto animate-fadeIn ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`px-4 py-2 rounded-2xl shadow-md ${isUser ? 'bg-accent text-white rounded-br-none' : 'bg-gray-700 text-white rounded-bl-none'}`}>
                {isAssistant ? renderMessage(`"${message.text}"`) : renderMessage(message.text)}
            </div>
        </div>
    );
};

const PhotoModal: React.FC<{ photoUrl: string; onClose: () => void; }> = ({ photoUrl, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-fadeIn" onClick={onClose}>
            <div className="p-4 bg-dark-bg rounded-2xl shadow-2xl relative max-w-md w-full mx-auto" onClick={(e) => e.stopPropagation()}>
                <img src={photoUrl} alt="Bot full view" className="max-h-[80vh] w-full object-contain rounded-lg" />
                <button onClick={onClose} className="absolute -top-4 -right-4 bg-white text-black rounded-full h-8 w-8 flex items-center justify-center font-bold text-lg">&times;</button>
            </div>
        </div>
    );
};


const ChatPage: React.FC<ChatPageProps> = ({ profile, onNavigate, onEditBot, initialMessages, onSaveHistory }) => {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [photoModalUrl, setPhotoModalUrl] = useState<string | null>(null);
  const chatSession = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    chatSession.current = initChat(profile);
    
    if (messages.length === 0 && profile.scenario) {
      const scenarioMessage = { id: Date.now(), text: profile.scenario, sender: 'assistant' as const };
      setMessages([scenarioMessage]);
    }
  }, [profile]);
  
  useEffect(() => {
    onSaveHistory(profile.id, messages);
  }, [messages, profile.id, onSaveHistory]);


  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isLoading || !chatSession.current) return;

    const userMessage: ChatMessage = { id: Date.now(), text: userInput, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    const messageToSend = userInput;
    setUserInput('');
    setIsLoading(true);

    try {
      const response = await chatSession.current.sendMessage({ message: messageToSend });
      const botMessage: ChatMessage = { id: Date.now() + 1, text: response.text, sender: 'assistant' };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error("Failed to send message:", error);
      setMessages(prev => [...prev, { id: Date.now() + 1, text: "Sorry, an error occurred.", sender: 'assistant' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text">
      {photoModalUrl && <PhotoModal photoUrl={photoModalUrl} onClose={() => setPhotoModalUrl(null)} />}
      <header className="flex items-center p-2 border-b border-white/10 dark:border-black/20 shadow-md backdrop-blur-sm bg-white/5 dark:bg-black/5 z-10">
        <button onClick={() => onNavigate('bots')} className="p-2 rounded-full hover:bg-white/10 dark:hover:bg-black/20 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <img src={profile.photo} alt={profile.name} className="h-10 w-10 object-cover rounded-lg mx-2 cursor-pointer" onClick={() => setPhotoModalUrl(profile.photo)}/>
        <span className="font-bold flex-1">{profile.name}</span>
        <button onClick={() => onEditBot(profile.id)} className="p-2 rounded-full hover:bg-white/10 dark:hover:bg-black/20 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>
        </button>
      </header>

      <main className="flex-1 p-4 space-y-4 overflow-y-auto">
        {messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)}
        {isLoading && (
             <div className="flex w-full max-w-md mx-auto justify-start">
                <div className="px-4 py-2 rounded-2xl shadow-md bg-gray-700 text-white rounded-bl-none">
                    <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-accent rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-2 h-2 bg-accent rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-2 h-2 bg-accent rounded-full animate-bounce"></div>
                    </div>
                </div>
            </div>
          )}
        <div ref={messagesEndRef} />
      </main>

      <footer className="p-4 bg-light-bg dark:bg-dark-bg border-t border-white/10 dark:border-black/20">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-white/10 dark:bg-black/10 p-3 rounded-2xl border border-white/20 dark:border-black/20 focus:outline-none focus:ring-2 focus:ring-accent transition-all duration-300"
            disabled={isLoading}
          />
          <button type="submit" className="bg-accent rounded-full p-3 text-white disabled:bg-gray-600 transition-colors shadow-lg" disabled={isLoading || !userInput.trim()}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
          </button>
        </form>
      </footer>
    </div>
  );
};

export default ChatPage;