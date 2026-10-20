import React from 'react';
import { PageTab } from '../types';
import { LayoutDashboard, Scale, AlertTriangle, DollarSign, Plus, LogOut, Factory } from 'lucide-react';

interface SidebarProps {
  activeTab: PageTab;
  onSelectTab: (tab: PageTab) => void;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab, onLogout }) => {
  return (
    <aside className="hidden md:flex flex-col h-screen w-72 bg-[#f4f7fb] border-r border-[#cbd5e1] py-6 px-4 fixed left-0 top-0 z-50 shrink-0 text-slate-900">
      {/* Brand */}
      <div className="mb-8 px-2">
        <img
          src="/ai-eng-agent-title-v2.jpg?v=20260814"
          alt="Ai ENG Agent · Engineering Review Platform"
          width={1135}
          height={284}
          draggable={false}
          className="block h-auto w-full object-contain [image-rendering:auto] [mask-image:radial-gradient(ellipse_at_center,black_52%,rgba(0,0,0,.92)_68%,transparent_100%)]"
        />

        {/* CTA Button */}
        <button
          onClick={() => onSelectTab('upload')}
          className="w-full mt-4 bg-[#123b78] text-white py-3 px-3 rounded-lg font-mono text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#0d2c5c] active:scale-95 transition-all shadow-sm cursor-pointer"
        >
          <span className="material-symbols-outlined text-base">add</span>
          새 문서 검토
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1.5">
        <button
          onClick={() => onSelectTab('dashboard')}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-lg text-sm font-mono font-semibold transition-all cursor-pointer ${
            activeTab === 'dashboard'
              ? 'bg-[#000d5f] text-white font-bold shadow-xs'
              : 'text-slate-300 hover:text-white hover:bg-[#1c2b46]'
          }`}
        >
          <span className="material-symbols-outlined text-lg">dashboard</span>
          <span>대시보드</span>
        </button>

        <button
          onClick={() => onSelectTab('safety')}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
            activeTab === 'safety'
              ? 'bg-[#000d5f] text-white font-bold shadow-xs'
              : 'text-[#454651] hover:text-[#191c1e] hover:bg-[#e6e8ea]'
          }`}
        >
          <span className="material-symbols-outlined text-lg">gavel</span>
          <span>안전 및 법규</span>
        </button>

        <button
          onClick={() => onSelectTab('errors')}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
            activeTab === 'errors'
              ? 'bg-[#000d5f] text-white font-bold shadow-xs'
              : 'text-[#454651] hover:text-[#191c1e] hover:bg-[#e6e8ea]'
          }`}
        >
          <span className="material-symbols-outlined text-lg">error_outline</span>
          <span>엔지니어링 오류</span>
        </button>

        <button
          onClick={() => onSelectTab('cost_ve')}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
            activeTab === 'cost_ve'
              ? 'bg-[#000d5f] text-white font-bold shadow-xs'
              : 'text-[#454651] hover:text-[#191c1e] hover:bg-[#e6e8ea]'
          }`}
        >
          <span className="material-symbols-outlined text-lg">payments</span>
          <span>원가 및 VE</span>
        </button>
      </nav>

      {/* Footer / Logout */}
      <div className="pt-4 border-t border-[#c6c5d2]">
        <button onClick={() => onSelectTab('report')} className="mb-2 flex w-full items-center gap-3 rounded-lg px-3.5 py-3 text-sm font-bold text-[#123b78] transition-all hover:bg-blue-100"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#123b78] text-white shadow-sm"><span className="material-symbols-outlined text-lg">description</span></span><span>통합 보고서 출력</span></button>
        <button
          onClick={onLogout || (() => alert('로그아웃 되었습니다.'))}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 text-[#454651] hover:text-[#ba1a1a] hover:bg-[#ffdad6] rounded-lg text-xs font-mono transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-lg">logout</span>
          <span>로그아웃</span>
        </button>
      </div>
    </aside>
  );
};
