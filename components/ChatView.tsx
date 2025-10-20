import React, { useState, useRef, useEffect } from 'react';
import { BotProfile, ChatMessage, Persona } from '../types';
import { VoiceOption } from '../App';
import { generateBotResponse, generateUserResponseSuggestion } from '../services/geminiService';

interface ChatPageProps {
  profile: BotProfile;
  persona?: Persona | null;
  onNavigate: (page: 'home' | 'bots') => void;
  onEditBot: (id: string) => void;
  initialMessages: ChatMessage[];
  onSaveHistory: (botId: string, messages: ChatMessage[]) => void;
  voicePreference: VoiceOption;
}

const renderMessageText = (text: string) => {
    const parts = text.split(/(\*.*?\*)/g);
    return (
      <p className="whitespace-pre-wrap">
        {parts.map((part, index) => {
          if (part.startsWith('*') && part.endsWith('*')) {
            return <em key={index} className="text-accent italic not-italic action-text-tilted">{part.slice(1, -1)}</em>;
          }
          return <span key={index}>{part}</span>;
        })}
      </p>
    );
};

const MessageBubble: React.FC<{
    message: ChatMessage;
    botPhotoUrl?: string;
    personaPhotoUrl?: string;
    onDelete: () => void;
    onRegenerate: () => void;
    onPlayVoice: (text: string) => void;
    onPhotoClick: (url: string) => void;
}> = ({ message, botPhotoUrl, personaPhotoUrl, onDelete, onRegenerate, onPlayVoice, onPhotoClick }) => {
    const isUser = message.sender === 'user';
    const isAssistant = message.sender === 'assistant';

    return (
        <div className={`group flex w-full items-end gap-2.5 max-w-md mx-auto animate-fadeIn ${isUser ? 'justify-end' : 'justify-start'}`}>
            {isAssistant && botPhotoUrl && (
                 <img src={botPhotoUrl} alt="Bot" className="h-8 w-8 rounded-full shadow-md object-cover ring-1 ring-accent/50 cursor-pointer flex-shrink-0" onClick={() => onPhotoClick(botPhotoUrl)} />
            )}
            
            <div className={`flex items-center gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`relative px-4 py-3 rounded-2xl shadow-md max-w-xs md:max-w-md ${isUser ? 'bg-accent text-white rounded-br-none' : 'bg-gray-700 text-white rounded-bl-none'}`}>
                    {isAssistant ? renderMessageText(`"${message.text}"`) : renderMessageText(message.text)}
                </div>

                <div className={`flex items-center self-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity`}>
                    {isAssistant && (
                        <>
                            <button onClick={() => onPlayVoice(message.text)} className="p-1.5 rounded-full hover:bg-white/20" aria-label="Play voice">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.858 5.858a3 3 0 000 4.243m12.728 0a3 3 0 000-4.243M12 12h.01" /></svg>
                            </button>
                            <button onClick={onRegenerate} className="p-1.5 rounded-full hover:bg-white/20" aria-label="Regenerate">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M4 4l1.5 1.5A9 9 0 0120.5 13M20 20l-1.5-1.5A9 9 0 003.5 11" /></svg>
                            </button>
                        </>
                    )}
                    <button onClick={onDelete} className="p-1.5 rounded-full hover:bg-white/20" aria-label="Delete">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                </div>
            </div>

            {isAssistant && personaPhotoUrl && (
                <img src={personaPhotoUrl} alt="Persona" className="h-8 w-8 rounded-full shadow-md object-cover ring-1 ring-white/20 cursor-pointer flex-shrink-0" onClick={() => onPhotoClick(personaPhotoUrl)} />
            )}
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


const ChatPage: React.FC<ChatPageProps> = ({ profile, persona, onNavigate, onEditBot, initialMessages, onSaveHistory, voicePreference }) => {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);
  const [photoModalUrl, setPhotoModalUrl] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  
  useEffect(() => {
    const loadVoices = () => setVoices(speechSynthesis.getVoices());
    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (messages.length === 0 && profile.scenario) {
      const scenarioMessage = { id: Date.now(), text: profile.scenario, sender: 'assistant' as const };
      setMessages([scenarioMessage]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id]); 
  
  useEffect(() => {
    onSaveHistory(profile.id, messages);
  }, [messages, profile.id, onSaveHistory]);

  const getBotResponse = async (history: ChatMessage[], prompt: string) => {
      setIsLoading(true);
      try {
        const botResponseText = await generateBotResponse(profile, history, prompt);
        const botMessage: ChatMessage = { id: Date.now() + 1, text: botResponseText, sender: 'assistant' };
        setMessages(prev => [...prev, botMessage]);
      } catch (error) {
        console.error("Failed to get bot response:", error);
        setMessages(prev => [...prev, { id: Date.now() + 1, text: "Sorry, an error occurred.", sender: 'assistant' }]);
      } finally {
        setIsLoading(false);
      }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isLoading) return;

    const userMessage: ChatMessage = { id: Date.now(), text: userInput, sender: 'user' };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    const messageToSend = userInput;
    setUserInput('');
    await getBotResponse(newMessages, messageToSend);
  };
  
  const handleDeleteMessage = (messageId: number) => {
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
  };
  
  const handleBuildMessage = async () => {
    if (isBuilding || messages.length === 0) return;
    setIsBuilding(true);
    try {
        const suggestion = await generateUserResponseSuggestion(profile, messages);
        setUserInput(suggestion);
    } catch (error) {
        console.error("Failed to build message:", error);
    } finally {
        setIsBuilding(false);
    }
  };

  const handleRegenerate = async (messageId: number) => {
      if (isLoading) return;
      const messageIndex = messages.findIndex(m => m.id === messageId);
      if (messageIndex <= 0 || messages[messageIndex].sender !== 'assistant') return;
      
      const historyForApi = messages.slice(0, messageIndex);
      const lastUserMessage = historyForApi.slice().reverse().find(m => m.sender === 'user');
      
      if (!lastUserMessage) return;

      setIsLoading(true);
      try {
          const newBotText = await generateBotResponse(profile, historyForApi, lastUserMessage.text);
          const updatedMessages = [...messages];
          updatedMessages[messageIndex] = { ...updatedMessages[messageIndex], text: newBotText };
          setMessages(updatedMessages);
      } catch (error) {
          console.error("Failed to regenerate message:", error);
      } finally {
          setIsLoading(false);
      }
  };
  
  const handlePlayVoice = (text: string) => {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      if (voices.length > 0) {
          let selectedVoice: SpeechSynthesisVoice | undefined;
          if (voicePreference === 'male') {
              // Fix: Property 'gender' does not exist on type 'SpeechSynthesisVoice'. Using voice name to infer gender.
              selectedVoice = voices.find(v => v.name.toLowerCase().includes('male') && v.lang.startsWith('en'));
          } else if (voicePreference === 'female') {
              // Fix: Property 'gender' does not exist on type 'SpeechSynthesisVoice'. Using voice name to infer gender.
              selectedVoice = voices.find(v => v.name.toLowerCase().includes('female') && v.lang.startsWith('en'));
          }
          // If auto or preferred not found, use a default english voice
          if (!selectedVoice) {
              selectedVoice = voices.find(v => v.lang.startsWith('en'));
          }
          utterance.voice = selectedVoice || null;
      }
      speechSynthesis.speak(utterance);
  }

  return (
    <div className="relative h-full w-full flex flex-col bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text">
      {profile.chatBackground && (
        <>
            <div 
                className="absolute inset-0 bg-cover bg-center z-0" 
                style={{ backgroundImage: `url(${profile.chatBackground})`, opacity: 0.85 }}
            ></div>
            <div className="absolute inset-0 bg-dark-bg/30 z-0"></div>
        </>
      )}
      <div className="relative z-10 flex flex-col h-full">
        {photoModalUrl && <PhotoModal photoUrl={photoModalUrl} onClose={() => setPhotoModalUrl(null)} />}
        <header className="flex items-center p-2 border-b border-white/10 dark:border-black/20 shadow-md backdrop-blur-sm bg-white/5 dark:bg-black/5 gap-2">
            <button onClick={() => onNavigate('bots')} className="p-2 rounded-full hover:bg-white/10 dark:hover:bg-black/20 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <img src={profile.photo} alt={profile.name} className="h-10 w-10 object-cover rounded-lg cursor-pointer" onClick={() => setPhotoModalUrl(profile.photo)}/>
            <span className="font-bold flex-1">{profile.name}</span>
            {profile.gif && (
            <img src={profile.gif} alt={`${profile.name} gif`} className="w-10 h-10 object-cover rounded-md" />
            )}
            <button onClick={() => onEditBot(profile.id)} className="p-2 rounded-full hover:bg-white/10 dark:hover:bg-black/20 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>
            </button>
        </header>
        
        <main className="flex-1 p-4 space-y-4 overflow-y-auto">
            {messages.map((msg) => 
                <MessageBubble 
                    key={msg.id} 
                    message={msg} 
                    botPhotoUrl={profile.photo}
                    personaPhotoUrl={persona?.photo}
                    onDelete={() => handleDeleteMessage(msg.id)}
                    onRegenerate={() => handleRegenerate(msg.id)}
                    onPlayVoice={handlePlayVoice}
                    onPhotoClick={setPhotoModalUrl}
                />
            )}
            {isLoading && (
                <div className="flex w-full items-end gap-2.5 max-w-md mx-auto justify-start">
                     <img src={profile.photo} alt="Bot" className="h-8 w-8 rounded-full shadow-md object-cover" />
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

        <footer className="p-4 bg-light-bg/80 dark:bg-dark-bg/80 border-t border-white/10 dark:border-black/20 backdrop-blur-sm">
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <button type="button" onClick={handleBuildMessage} disabled={isBuilding} className="p-2 rounded-full hover:bg-white/10 dark:hover:bg-black/20 transition-colors disabled:opacity-50">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
            </button>
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
    </div>
  );
};

export default ChatPage;