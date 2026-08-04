import React from 'react';
import { PageTab } from '../types';
import { Database, Search, Bell, Settings, HelpCircle, Layers, CheckCircle2 } from 'lucide-react';

interface HeaderProps {
  activeTab: PageTab;
  onSelectTab: (tab: PageTab) => void;
  onOpenDeployGuide: () => void;
  isSupabaseConnected: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  onOpenDeployGuide,
  isSupabaseConnected,
  searchQuery,
  onSearchChange,
}) => {
  return (
    <header className="flex justify-between items-center px-6 md:px-10 w-full h-16 sticky top-0 z-40 bg-[#f7f9fb] border-b border-[#c6c5d2] shadow-xs">
      <div className="flex items-center gap-6 lg:gap-8">
        <span 
          onClick={() => onSelectTab('dashboard')}
          className="font-headline text-lg md:text-xl font-bold text-[#000d5f] cursor-pointer hover:opacity-85 transition-opacity whitespace-nowrap"
        >
          POSCO AI Doc Review
        </span>

        <nav className="hidden md:flex gap-4 lg:gap-6 font-body text-sm">
          <button
            onClick={() => onSelectTab('dashboard')}
            className={`transition-colors py-1 px-2 rounded font-medium ${
              activeTab === 'dashboard'
                ? 'text-[#000d5f] font-bold border-b-2 border-[#000d5f]'
                : 'text-[#454651] hover:bg-[#eceef0]'
            }`}
          >
            프로젝트 대시보드
          </button>
          <button
            onClick={() => onSelectTab('upload')}
            className={`transition-colors py-1 px-2 rounded font-medium ${
              activeTab === 'upload'
                ? 'text-[#000d5f] font-bold border-b-2 border-[#000d5f]'
                : 'text-[#454651] hover:bg-[#eceef0]'
            }`}
          >
            검토 워크스페이스
          </button>
          <button
            onClick={() => onSelectTab('safety')}
            className={`transition-colors py-1 px-2 rounded font-medium ${
              activeTab === 'safety'
                ? 'text-[#000d5f] font-bold border-b-2 border-[#000d5f]'
                : 'text-[#454651] hover:bg-[#eceef0]'
            }`}
          >
            안전 및 법규
          </button>
          <button
            onClick={() => onSelectTab('errors')}
            className={`transition-colors py-1 px-2 rounded font-medium ${
              activeTab === 'errors'
                ? 'text-[#000d5f] font-bold border-b-2 border-[#000d5f]'
                : 'text-[#454651] hover:bg-[#eceef0]'
            }`}
          >
            설계 오류
          </button>
          <button
            onClick={() => onSelectTab('cost_ve')}
            className={`transition-colors py-1 px-2 rounded font-medium ${
              activeTab === 'cost_ve'
                ? 'text-[#000d5f] font-bold border-b-2 border-[#000d5f]'
                : 'text-[#454651] hover:bg-[#eceef0]'
            }`}
          >
            원가 및 VE
          </button>
        </nav>
      </div>

      <div className="flex items-center gap-3 md:gap-4">
        {/* Search input */}
        <div className="relative hidden lg:block w-52 xl:w-64">
          <Search className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#767682] w-4 h-4" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="문서 또는 오류 검색..."
            className="w-full h-9 pl-9 pr-3 bg-[#f2f4f6] border border-[#c6c5d2] rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#000d5f] focus:bg-white transition-all"
          />
        </div>

        {/* Database & Deployment button */}
        <button
          onClick={onOpenDeployGuide}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-all cursor-pointer"
          title="백엔드 Supabase, Vercel & AI Engine 연동 현황"
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span className="hidden sm:inline">백엔드 연동 완료</span>
        </button>

        {/* Notifications */}
        <button 
          className="relative p-2 text-[#454651] hover:bg-[#eceef0] rounded-full transition-colors cursor-pointer"
          title="알림"
        >
          <Bell className="w-4 h-4 md:w-5 md:h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#ba1a1a] rounded-full"></span>
        </button>

        {/* Settings */}
        <button 
          onClick={onOpenDeployGuide}
          className="p-2 text-[#454651] hover:bg-[#eceef0] rounded-full transition-colors cursor-pointer"
          title="설정"
        >
          <Settings className="w-4 h-4 md:w-5 md:h-5" />
        </button>

        {/* User Profile */}
        <div className="w-8 h-8 rounded-full bg-[#d5e0f7] flex items-center justify-center border border-[#c6c5d2] cursor-pointer overflow-hidden active:opacity-80 transition-opacity">
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuATwl5yTZ0FGQv64gjX8GAECvyUb6Mh3PMFW7jKg7DMJC9I7SFodIEfBnPgCz725g_AtaaAMYhG988tblFCKj1wlwjsH-59_jihpGF7FcDSWGJAR24ZEDdoIGRiu8mCUX_Oteau_Jrkxf15TU4_GT4mgtLNL2Q58oc8BakqSQnjR-8nHzgwEajYGcyndtowEk09biliEDYdRa-P1zBYrbi9I0xVBE4Gwr5DXGAxyXfUoyub3TcqW6km6g"
            alt="사용자 프로필"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </header>
  );
};
