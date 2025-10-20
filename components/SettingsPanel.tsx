import React, { useState, useEffect } from 'react';
import type { VoiceOption } from '../App';

interface SettingsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    currentVoice: VoiceOption;
    onSetVoice: (voice: VoiceOption) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose, currentVoice, onSetVoice }) => {
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    
    useEffect(() => {
        const loadVoices = () => setVoices(speechSynthesis.getVoices());
        loadVoices();
        speechSynthesis.onvoiceschanged = loadVoices;
    }, []);

    const playPreview = (voiceType: 'male' | 'female') => {
        speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance("Hello, this is a preview of my voice.");
        if (voices.length > 0) {
            let selectedVoice: SpeechSynthesisVoice | undefined;
            if (voiceType === 'male') {
                // Fix: Property 'gender' does not exist on type 'SpeechSynthesisVoice'. Using voice name to infer gender.
                selectedVoice = voices.find(v => v.name.toLowerCase().includes('male') && v.lang.startsWith('en'));
            } else {
                // Fix: Property 'gender' does not exist on type 'SpeechSynthesisVoice'. Using voice name to infer gender.
                selectedVoice = voices.find(v => v.name.toLowerCase().includes('female') && v.lang.startsWith('en'));
            }
            if (!selectedVoice) {
                selectedVoice = voices.find(v => v.lang.startsWith('en'));
            }
            utterance.voice = selectedVoice || null;
        }
        speechSynthesis.speak(utterance);
    };

    const handleSelectVoice = (voice: VoiceOption) => {
        onSetVoice(voice);
    };

    const VoiceButton: React.FC<{
        label: string;
        type: VoiceOption;
        onPreview: () => void;
    }> = ({ label, type, onPreview }) => (
        <div className="flex items-center justify-between bg-white/5 p-3 rounded-lg">
            <label className="flex items-center cursor-pointer">
                <input
                    type="radio"
                    name="voice-option"
                    className="h-5 w-5 bg-gray-700 border-gray-600 text-accent focus:ring-accent"
                    checked={currentVoice === type}
                    onChange={() => handleSelectVoice(type)}
                />
                <span className="ml-3 font-medium">{label}</span>
            </label>
            <button onClick={onPreview} className="p-2 rounded-full hover:bg-white/20" aria-label={`Preview ${label} voice`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </button>
        </div>
    );
    

    return (
        <>
            <div 
                className={`fixed inset-0 bg-black/60 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            ></div>
            <div 
                className={`fixed top-0 left-0 h-full w-72 bg-dark-bg shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                <div className="p-4 flex flex-col h-full">
                    <header className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold">Settings</h2>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </header>
                    <div className="space-y-4">
                        <h3 className="font-semibold text-gray-400 text-sm">Text-to-Speech Voice</h3>
                        <div className="space-y-2">
                           <VoiceButton label="Auto Detect" type="auto" onPreview={() => playPreview('female')} />
                           <VoiceButton label="Female" type="female" onPreview={() => playPreview('female')} />
                           <VoiceButton label="Male" type="male" onPreview={() => playPreview('male')} />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default SettingsPanel;