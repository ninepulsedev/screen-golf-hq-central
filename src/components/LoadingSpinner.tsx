import React from 'react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950 flex items-center justify-center">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-gray-800 border-t-violet-500 rounded-full animate-spin"></div>
        <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-b-cyan-500 rounded-full animate-spin" style={{ animationDelay: '150ms' }}></div>
      </div>
    </div>
  );
};

export default LoadingSpinner;
