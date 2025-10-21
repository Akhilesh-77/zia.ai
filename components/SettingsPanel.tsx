
import React, { useState, useEffect } from 'react';
import type { AIModelOption, VoicePreference } from '../types';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  onClearData: () => void;
  selectedAI: AIModelOption;
  onSelectAI: (model: AIModelOption) => void;
  voicePreference: VoicePreference | null;
  onSetVoicePreference: (voice: VoicePreference | null) => void;
}

const aiModelOptions: { id: AIModelOption, name: string }[] = [
    { id: 'gemini', name: 'Gemini (Default)' },
    { id: 'zia', name: 'Zia AI' },
    { id: 'deepseek', name: 'Deepseek Chat' },
    { id: 'qwen', name: 'Qwen' },
];

const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose, theme, toggleTheme, onClearData, selectedAI, onSelectAI, voicePreference, onSetVoicePreference }) => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        if(availableVoices.length > 0) {
            setVoices(availableVoices);
        }
    };
    loadVoices();
    // Voices might load asynchronously.
    window.speechSynthesis.onvoiceschanged = loadVoices;
    
    return () => {
        window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      <div 
        className={`fixed top-0 left-0 h-full w-80 max-w-[80vw] bg-light-bg dark:bg-dark-bg shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="p-6 flex flex-col h-full overflow-y-auto">
            <h2 className="text-2xl font-bold mb-8">Settings</h2>
            
            <div className="space-y-4">
                <div className="flex justify-between items-center bg-white/5 dark:bg-black/10 p-4 rounded-xl">
                    <span className="font-medium">Theme</span>
                    <button onClick={toggleTheme} className="flex items-center gap-2">
                        <span>{theme === 'dark' ? 'Dark' : 'Light'}</span>
                        {theme === 'dark' ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                        )}
                    </button>
                </div>
                
                 <div className="bg-white/5 dark:bg-black/10 p-4 rounded-xl">
                    <p className="font-medium mb-2">Voice Preference</p>
                    <p className="text-xs text-gray-400 mb-3">Select the default voice for text-to-speech.</p>
                    {voices.length > 0 ? (
                        <select
                            value={voicePreference || ''}
                            onChange={(e) => onSetVoicePreference(e.target.value || null)}
                            className="w-full bg-black/20 p-2 rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-accent"
                        >
                            <option value="">Browser Default</option>
                            {voices.map(voice => (
                                <option key={voice.name} value={voice.name}>
                                    {voice.name} ({voice.lang})
                                </option>
                            ))}
                        </select>
                    ) : (
                        <p className="text-xs text-gray-400">Loading voices...</p>
                    )}
                </div>

                <div className="bg-white/5 dark:bg-black/10 p-4 rounded-xl">
                    <p className="font-medium mb-2">AI Model</p>
                    <p className="text-xs text-gray-400 mb-3">Select the AI model for chat responses. Other models use the OpenRouter API.</p>
                    <div className="space-y-2">
                        {aiModelOptions.map(option => (
                             <label key={option.id} className="flex items-center cursor-pointer">
                                <input 
                                    type="radio" 
                                    name="ai-model" 
                                    value={option.id}
                                    checked={selectedAI === option.id}
                                    onChange={() => onSelectAI(option.id)}
                                    className="h-4 w-4 text-accent bg-gray-700 border-gray-600 focus:ring-accent"
                                />
                                <span className="ml-3 text-sm">{option.name}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="bg-white/5 dark:bg-black/10 p-4 rounded-xl">
                    <p className="font-medium mb-2">Manage Data</p>
                    <p className="text-xs text-gray-400 mb-3">This will delete all your created bots, personas, and chat history. This action cannot be undone.</p>
                     <button 
                        onClick={onClearData} 
                        className="w-full bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-colors hover:bg-red-500"
                    >
                        Clear All Data
                    </button>
                </div>
            </div>

            <div className="mt-auto text-center text-xs text-gray-500">
                <p>Zia.ai v1.2.0</p>
                <p>Powered by OpenRouter & Google Gemini</p>
            </div>
        </div>
      </div>
    </>
  );
};

export default SettingsPanel;