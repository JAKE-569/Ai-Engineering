import React from 'react';
import { PageTab } from '../types';
import { Database, Search, Bell, Settings, CheckCircle2, Activity, X } from 'lucide-react';

export interface AiUsageStatus {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  rateLimited: boolean;
  lastModel?: string;
  lastUpdated?: string;
}

interface HeaderProps {
  activeTab: PageTab;
  onSelectTab: (tab: PageTab) => void;
  onOpenDeployGuide: () => void;
  isSupabaseConnected: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  aiUsage: AiUsageStatus;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  onOpenDeployGuide,
  isSupabaseConnected,
  searchQuery,
  onSearchChange,
  aiUsage,
}) => {
  const [isUsageOpen, setIsUsageOpen] = React.useState(false);
  return (
    <header className="flex justify-between items-center px-6 md:px-10 w-full h-16 sticky top-0 z-40 bg-[#f7f9fb] border-b border-[#c6c5d2] shadow-xs">
      <div className="flex items-center gap-6 lg:gap-8">
        <span 
          onClick={() => onSelectTab('dashboard')}
          className="font-headline text-lg md:text-xl font-bold text-[#000d5f] cursor-pointer hover:opacity-85 transition-opacity whitespace-nowrap"
        >
          FutureM Ai ENG
        </span>

        <nav className="hidden">
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

        <button
          onClick={() => setIsUsageOpen((open) => !open)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-indigo-200 bg-indigo-50 text-indigo-800 hover:bg-indigo-100 transition-all"
        >
          <Activity className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">AI 사용량</span>
          <span className={`w-1.5 h-1.5 rounded-full ${aiUsage.rateLimited ? 'bg-red-500' : 'bg-emerald-500'}`} />
        </button>

        {isUsageOpen && (
          <div className="absolute right-6 md:right-10 top-14 w-80 rounded-xl border border-slate-200 bg-white p-4 shadow-xl z-50">
            <div className="flex items-center justify-between mb-3">
              <div><p className="text-sm font-bold text-slate-900">실시간 AI API 상태</p><p className="text-[11px] text-slate-500">현재 브라우저 세션 기준</p></div>
              <button onClick={() => setIsUsageOpen(false)} className="p-1 rounded hover:bg-slate-100"><X className="w-4 h-4" /></button>
            </div>
            <div className={`mb-3 rounded-lg px-3 py-2 text-xs font-semibold ${aiUsage.rateLimited ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
              {aiUsage.rateLimited ? '요청 제한(429) 감지됨' : 'API 응답 정상'}
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3 text-center">
              <div className="rounded-lg bg-slate-50 p-2"><div className="text-lg font-bold text-slate-900">{aiUsage.totalRequests}</div><div className="text-[10px] text-slate-500">요청</div></div>
              <div className="rounded-lg bg-emerald-50 p-2"><div className="text-lg font-bold text-emerald-700">{aiUsage.successfulRequests}</div><div className="text-[10px] text-slate-500">성공</div></div>
              <div className="rounded-lg bg-red-50 p-2"><div className="text-lg font-bold text-red-700">{aiUsage.failedRequests}</div><div className="text-[10px] text-slate-500">실패</div></div>
            </div>
            <dl className="space-y-2 text-xs">
              <div className="flex justify-between gap-3"><dt className="text-slate-500">기본 모델</dt><dd className="font-mono font-semibold text-slate-800">Gemini Vision</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-500">최근 응답 모델</dt><dd className="font-mono font-semibold text-slate-800">{aiUsage.lastModel || '대기 중'}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-500">최근 갱신</dt><dd className="text-slate-700">{aiUsage.lastUpdated || '아직 요청 없음'}</dd></div>
            </dl>
            <p className="mt-3 border-t border-slate-100 pt-3 text-[10px] leading-relaxed text-slate-500">무료 잔여 한도는 Gemini API가 클라이언트에 제공하지 않으므로 정확한 잔여량 대신 실제 응답과 제한 상태를 표시합니다.</p>
          </div>
        )}

        {/* Database & Deployment button */}
        <button
          onClick={onOpenDeployGuide}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-all cursor-pointer"
          title="백엔드 DB & AI Engine 연동 현황"
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
