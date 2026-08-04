import React, { useState } from 'react';
import { SupabaseConfig } from '../types';
import { SUPABASE_SCHEMA_SQL } from '../lib/supabaseClient';
import { X, Database, Github, ExternalLink, Check, Copy, RefreshCw, Server } from 'lucide-react';

interface DeploySupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SupabaseConfig;
  onSaveConfig: (url: string, key: string) => void;
  onSyncDataToSupabase: () => Promise<boolean>;
}

export const DeploySupabaseModal: React.FC<DeploySupabaseModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  onSyncDataToSupabase,
}) => {
  const [activeTab, setActiveTab] = useState<'config' | 'sql' | 'vercel'>('config');
  const [supabaseUrl, setSupabaseUrl] = useState(config.url);
  const [supabaseKey, setSupabaseKey] = useState(config.anonKey);
  const [copiedSql, setCopiedSql] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveConfig(supabaseUrl, supabaseKey);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const handleRunSync = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const success = await onSyncDataToSupabase();
      if (success) {
        setSyncMessage('Supabase 데이터베이스에 샘플 데이터 동기화가 완료되었습니다.');
      } else {
        setSyncMessage('동기화 실패: Supabase URL과 Key를 확인해 주세요.');
      }
    } catch {
      setSyncMessage('동기화 중 오류가 발생했습니다.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white w-full max-w-3xl rounded-xl shadow-2xl border border-[#c6c5d2] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-[#000d5f] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="w-6 h-6 text-[#bbc3ff]" />
            <div>
              <h3 className="font-headline font-bold text-lg">Supabase, GitHub & Vercel 빠른 배포 가이드</h3>
              <p className="font-mono text-xs text-[#bbc3ff]">
                POSCO AI 엔지니어링 리뷰 데이터베이스 연동 및 클라우드 배포
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#c6c5d2] bg-[#f2f4f6]">
          <button
            onClick={() => setActiveTab('config')}
            className={`px-5 py-3 font-mono text-xs font-bold border-b-2 transition-all ${
              activeTab === 'config'
                ? 'border-[#000d5f] text-[#000d5f] bg-white'
                : 'border-transparent text-[#454651] hover:text-[#191c1e]'
            }`}
          >
            1. Supabase API 설정
          </button>
          <button
            onClick={() => setActiveTab('sql')}
            className={`px-5 py-3 font-mono text-xs font-bold border-b-2 transition-all ${
              activeTab === 'sql'
                ? 'border-[#000d5f] text-[#000d5f] bg-white'
                : 'border-transparent text-[#454651] hover:text-[#191c1e]'
            }`}
          >
            2. SQL 스키마 복사
          </button>
          <button
            onClick={() => setActiveTab('vercel')}
            className={`px-5 py-3 font-mono text-xs font-bold border-b-2 transition-all ${
              activeTab === 'vercel'
                ? 'border-[#000d5f] text-[#000d5f] bg-white'
                : 'border-transparent text-[#454651] hover:text-[#191c1e]'
            }`}
          >
            3. GitHub & Vercel 배포
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'config' && (
            <div className="space-y-5">
              <div className="p-4 bg-[#dfe0ff]/30 border border-[#000d5f]/20 rounded-lg text-xs space-y-1">
                <p className="font-bold text-[#000d5f] flex items-center gap-2">
                  <Server className="w-4 h-4 text-[#000d5f]" />
                  현재 연동 상태:{' '}
                  {config.isConnected ? (
                    <span className="text-emerald-700 font-bold">● 연결됨 (Supabase 클라이언트 사용 중)</span>
                  ) : (
                    <span className="text-amber-700 font-bold">○ 로컬 데이터 모드 (Supabase 미설정)</span>
                  )}
                </p>
                <p className="text-[#454651]">
                  Supabase 대시보드(supabase.com)에서 생성한 Project URL과 Anon API Key를 입력하세요.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-mono font-bold text-[#191c1e] mb-1">
                    Supabase Project URL (VITE_SUPABASE_URL)
                  </label>
                  <input
                    type="text"
                    value={supabaseUrl}
                    onChange={(e) => setSupabaseUrl(e.target.value)}
                    placeholder="https://your-project.supabase.co"
                    className="w-full h-10 px-3 border border-[#c6c5d2] rounded-lg text-xs font-mono focus:ring-2 focus:ring-[#000d5f]/20 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-[#191c1e] mb-1">
                    Supabase Anon Key (VITE_SUPABASE_ANON_KEY)
                  </label>
                  <input
                    type="password"
                    value={supabaseKey}
                    onChange={(e) => setSupabaseKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full h-10 px-3 border border-[#c6c5d2] rounded-lg text-xs font-mono focus:ring-2 focus:ring-[#000d5f]/20 outline-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleSave}
                    className="px-5 py-2.5 bg-[#000d5f] text-white font-mono text-xs font-bold rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    설정 저장
                  </button>

                  {config.isConnected && (
                    <button
                      onClick={handleRunSync}
                      disabled={isSyncing}
                      className="px-5 py-2.5 bg-emerald-600 text-white font-mono text-xs font-bold rounded-lg hover:bg-emerald-700 transition-opacity flex items-center gap-2 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                      샘플 데이터 Supabase에 동기화
                    </button>
                  )}
                </div>

                {syncMessage && (
                  <p className="text-xs font-mono p-3 bg-[#f2f4f6] border rounded text-[#191c1e]">
                    {syncMessage}
                  </p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'sql' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-[#454651]">
                  Supabase 대시보드 -&gt; <b>SQL Editor</b>에 아래 SQL 문을 붙여넣고 [Run]을 실행하세요.
                </p>
                <button
                  onClick={handleCopySql}
                  className="px-3 py-1.5 bg-[#000d5f] text-white text-xs font-mono font-bold rounded flex items-center gap-1.5 cursor-pointer hover:opacity-90"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedSql ? '복사 완료!' : 'SQL 전체 복사'}
                </button>
              </div>

              <pre className="bg-[#1e1e1e] text-emerald-400 p-4 rounded-lg font-mono text-[11px] overflow-x-auto max-h-72 border border-[#c6c5d2] custom-scrollbar">
                {SUPABASE_SCHEMA_SQL}
              </pre>
            </div>
          )}

          {activeTab === 'vercel' && (
            <div className="space-y-5 text-xs text-[#191c1e]">
              <div className="p-4 bg-[#f2f4f6] border border-[#c6c5d2] rounded-lg space-y-3">
                <h4 className="font-bold text-sm text-[#000d5f] flex items-center gap-2">
                  <Github className="w-4 h-4" />
                  GitHub Repository 준비
                </h4>
                <ol className="list-decimal pl-5 space-y-1.5 text-[#454651]">
                  <li>AI Studio 우측 상단 메뉴에서 <b>Export to GitHub</b> 또는 ZIP으로 소스를 다운로드합니다.</li>
                  <li>본인의 GitHub 계정에 새 저장소(Repository)를 생성하고 코드를 Push합니다.</li>
                </ol>
              </div>

              <div className="p-4 bg-[#f2f4f6] border border-[#c6c5d2] rounded-lg space-y-3">
                <h4 className="font-bold text-sm text-[#000d5f] flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  Vercel 원클릭 배포 설정
                </h4>
                <ol className="list-decimal pl-5 space-y-1.5 text-[#454651]">
                  <li>Vercel (vercel.com) 로그인 후 <b>Add New Project</b>를 클릭하고 GitHub 레포지토리를 선택합니다.</li>
                  <li>
                    <b>Environment Variables</b> 항목에 다음 변수를 등록합니다:
                    <ul className="list-disc pl-5 mt-1 space-y-1 font-mono text-[11px] text-[#000d5f]">
                      <li>VITE_SUPABASE_URL = [Supabase URL]</li>
                      <li>VITE_SUPABASE_ANON_KEY = [Supabase Anon Key]</li>
                      <li>GEMINI_API_KEY = [Gemini API Key]</li>
                    </ul>
                  </li>
                  <li><b>Deploy</b> 버튼을 누르면 1분 내에 POSCO AI Doc Review 서비스가 배포됩니다.</li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-[#f2f4f6] border-t border-[#c6c5d2] px-6 py-3 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#000d5f] text-white text-xs font-mono font-bold rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
