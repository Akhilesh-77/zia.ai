import React from 'react';
import type { Page } from '../App';

interface FooterNavProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

const NavButton: React.FC<{
  label: string;
  // FIX: Replaced JSX.Element with React.ReactNode to fix "Cannot find namespace 'JSX'" error.
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}> = ({ label, icon, isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center w-full transition-colors duration-200 ${isActive ? 'text-accent' : 'text-gray-400 hover:text-accent'}`}
      aria-label={label}
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
};


const FooterNav: React.FC<FooterNavProps> = ({ currentPage, onNavigate }) => {
  return (
    <footer className="w-full max-w-md mx-auto h-20 bg-light-bg dark:bg-dark-bg border-t border-white/10 dark:border-black/20 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80 shadow-t-lg">
      <nav className="flex items-center justify-around h-full px-2">
        <NavButton
          label="Home"
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>}
          isActive={currentPage === 'home'}
          onClick={() => onNavigate('home')}
        />
        <NavButton
          label="Create"
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          isActive={currentPage === 'create'}
          onClick={() => onNavigate('create')}
        />
        <NavButton
          label="Bots"
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          isActive={currentPage === 'bots'}
          onClick={() => onNavigate('bots')}
        />
      </nav>
    </footer>
  );
};

export default FooterNav;