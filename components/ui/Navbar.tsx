'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Radio, Tv, Share2, Check, Edit2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/userContext';

interface NavbarProps {
  isLive?: boolean;
  viewerCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({ isLive = false }) => {
  const pathname = usePathname();
  const { user, setUsername } = useAuth();
  const [copied, setCopied] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(user.username);

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      const shareUrl = `${window.location.origin}/live`;
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInput.trim()) {
      setUsername(nameInput.trim());
      setIsEditingName(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-[#0c0e14]/95 backdrop-blur-md border-b border-white/10 px-4 lg:px-8 py-3 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Brand & Logo */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-500/25 group-hover:scale-105 transition-transform">
              <Radio className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  STREAM<span className="text-rose-500">PULSE</span>
                </span>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  LIVE
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">Live Screen & Event Broadcast</p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden sm:flex items-center gap-2 ml-4">
            <Link
              href="/"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                pathname === '/' ? 'text-white bg-white/10' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Home
            </Link>
            <Link
              href="/live"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                pathname === '/live'
                  ? 'text-white bg-rose-600/20 text-rose-300 border border-rose-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Tv className="w-4 h-4" />
              <span>Watch Live</span>
              {isLive && <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />}
            </Link>
          </nav>
        </div>

        {/* Right Section: Share + Viewer Profile */}
        <div className="flex items-center gap-3">
          {/* Public Share Button */}
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-200 bg-white/5 hover:bg-white/10 border border-white/10 transition-all active:scale-95 shadow-sm"
            title="Copy public stream link"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copied ? 'Link Copied!' : 'Share'}</span>
          </button>

          {/* Viewer Username & Editor */}
          {isEditingName ? (
            <form onSubmit={handleSaveName} className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                maxLength={18}
                autoFocus
                className="bg-slate-900 border border-white/20 rounded-lg px-2 py-0.5 text-white text-xs focus:outline-none focus:border-rose-500 w-28 sm:w-32"
              />
              <button
                type="submit"
                className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
              >
                Save
              </button>
            </form>
          ) : (
            <button
              onClick={() => {
                setNameInput(user.username);
                setIsEditingName(true);
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors group cursor-pointer"
              title="Click to edit your chat username"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-xs font-medium text-slate-200 max-w-[110px] truncate">
                {user.username}
              </span>
              <Edit2 className="w-3 h-3 text-slate-500 group-hover:text-slate-300" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
