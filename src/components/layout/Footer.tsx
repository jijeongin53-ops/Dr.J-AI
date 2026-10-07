import React from 'react';

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white text-gray-500 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
        <div className="flex items-center gap-2 font-medium text-gray-700">
          <span className="w-2 h-2 rounded-full bg-carrot" />
          <span>Dr. J&apos;s 모임 플랫폼</span>
        </div>

        <div className="text-gray-400">
          © {new Date().getFullYear()} Dr. J&apos;s. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
