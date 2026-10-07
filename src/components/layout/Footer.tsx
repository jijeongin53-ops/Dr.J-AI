import React from 'react';
import Link from 'next/link';
import { GOOGLE_DRIVE_FOLDER_URL, GOOGLE_SHEET_URL, COMMUNITY_INFO } from '@/lib/constants';
import { Folder, Database, Github } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-zinc-900 bg-black text-zinc-500 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <span className="w-2 h-2 rounded-full bg-carrot" />
            {COMMUNITY_INFO.name}
          </div>
          <p className="text-xs text-zinc-500 mt-1 max-w-md">
            {COMMUNITY_INFO.description}
          </p>
        </div>

        <div className="flex items-center gap-6 text-xs">
          <a
            href={GOOGLE_DRIVE_FOLDER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-white transition"
          >
            <Folder className="w-3.5 h-3.5 text-carrot" />
            구글 드라이브 스토리지
          </a>
          <a
            href={GOOGLE_SHEET_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-white transition"
          >
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            스프레드시트 DB
          </a>
        </div>

        <div className="text-xs text-zinc-600">
          © {new Date().getFullYear()} 당근 AI 모임. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
