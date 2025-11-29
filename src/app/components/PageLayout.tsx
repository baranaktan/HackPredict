import React from 'react';
import Link from 'next/link';
import Navigation from './Navigation';

interface PageLayoutProps {
  children: React.ReactNode;
  title?: string;
  showNavigation?: boolean;
}

const PageLayout = ({ children, title, showNavigation = true }: PageLayoutProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-blue-900 to-black text-white">
      {showNavigation && (
        <header className="relative z-10 px-6 py-4 border-b border-blue-500/20">
          <nav className="max-w-7xl mx-auto flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">H</span>
              </div>
              <span className="text-xl font-bold">HackPredict</span>
            </Link>
            <Navigation />
            <Link href="/markets">
              <button className="bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-2 rounded-lg font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all">
                Launch App
              </button>
            </Link>
          </nav>
        </header>
      )}
      <main>
        {title && (
          <div className="px-6 pt-8">
            <h1 className="text-3xl font-bold text-white">{title}</h1>
          </div>
        )}
        {children}
      </main>
    </div>
  );
};

export default PageLayout; 