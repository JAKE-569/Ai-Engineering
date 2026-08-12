import React, { useState, useEffect } from 'react';
import { PageTab, Project, ReviewItem, SafetyItem, DesignErrorItem, VeItem, UploadFile, SupabaseConfig } from './types';
import {
  INITIAL_PROJECTS,
  INITIAL_REVIEW_ITEMS,
  INITIAL_SAFETY_ITEMS,
  INITIAL_DESIGN_ERRORS,
  INITIAL_VE_ITEMS,
  INITIAL_UPLOAD_FILES,
} from './data/mockData';
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  initSupabase,
  fetchReviewItemsFromSupabase,
  syncInitialDataToSupabase,
} from './lib/supabaseClient';

import { Header, AiUsageStatus } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { SafetyView } from './components/SafetyView';
import { DesignErrorsView } from './components/DesignErrorsView';
import { CostVeView } from './components/CostVeView';
import { UploadView } from './components/UploadView';
import { CadViewerModal } from './components/CadViewerModal';
import { ReviewWorkspaceModal } from './components/ReviewWorkspaceModal';
import { ReportView } from './components/ReportView';
import { OcrReviewModal } from './components/OcrReviewModal';
import { DeploySupabaseModal } from './components/DeploySupabaseModal';
import { ChevronDown, Folder, Layers, Database, MessageCircle, X } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<PageTab>('dashboard');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Domain Datasets initialized from empty lists (sample drawings removed for real user upload)
  const [projects] = useState<Project[]>(INITIAL_PROJECTS);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('POSCO-PLANT-01');
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [safetyItems, setSafetyItems] = useState<SafetyItem[]>([]);
  const [designErrors, setDesignErrors] = useState<DesignErrorItem[]>([]);
  const [veItems, setVeItems] = useState<VeItem[]>([]);
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [aiUsage, setAiUsage] = useState<AiUsageStatus>({ totalRequests: 0, successfulRequests: 0, failedRequests: 0, rateLimited: false });
  const handleAiUsageEvent = (event: { success: boolean; rateLimited?: boolean; model?: string }) => setAiUsage((prev) => ({
    ...prev,
    totalRequests: prev.totalRequests + 1,
    successfulRequests: prev.successfulRequests + (event.success ? 1 : 0),
    failedRequests: prev.failedRequests + (event.success ? 0 : 1),
    rateLimited: Boolean(event.rateLimited),
    lastModel: event.model || prev.lastModel,
    lastUpdated: new Date().toLocaleTimeString('ko-KR'),
  }));

  // Supabase Configuration State
  const [supabaseConfig, setSupabaseConfigState] = useState<SupabaseConfig>(getSupabaseConfig());

  // Modal States
  const [isDeployModalOpen, setIsDeployModalOpen] = useState<boolean>(false);
  const [cadModalErrorItem, setCadModalErrorItem] = useState<DesignErrorItem | null>(null);
  const [ocrModalFile, setOcrModalFile] = useState<UploadFile | ReviewItem | null>(null);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [assistantInput, setAssistantInput] = useState('');
  const [assistantMessages, setAssistantMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([
    { role: 'assistant', text: '도면 검토 결과에 대해 질문해 주세요. 현재 세션의 검토 데이터만 기준으로 답변합니다.' },
  ]);
  const sendAssistantMessage = () => {
    const text = assistantInput.trim();
    if (!text) return;
    setAssistantMessages((messages) => [...messages, { role: 'user', text }, { role: 'assistant', text: '현재 선택된 도면의 검토 결과·OCR·주석 데이터를 확인해 답변하는 기능을 준비 중입니다. 우선 대시보드의 종합 보고서에서 근거를 확인해 주세요.' }]);
    setAssistantInput('');
  };

  const handleSaveSupabaseConfig = (url: string, anonKey: string) => {
    saveSupabaseConfig(url, anonKey);
    const updated = getSupabaseConfig();
    setSupabaseConfigState(updated);
  };

  const handleSyncToSupabase = async (): Promise<boolean> => {
    const success = await syncInitialDataToSupabase(
      projects,
      reviewItems,
      safetyItems,
      designErrors,
      veItems
    );
    return success;
  };

  const handleOpenCadViewer = (dwgFile: string, errorCode?: string) => {
    const foundError = designErrors.find(
      (e) => e.dwgFile === dwgFile || (errorCode && e.errorCode === errorCode)
    );

    const foundReview = reviewItems.find((r) => r.fileName === dwgFile);
    const foundUpload = uploadFiles.find((u) => u.name === dwgFile);

    if (foundError) {
      setCadModalErrorItem({
        ...foundError,
        docCategory: foundError.docCategory || foundReview?.docCategory || foundUpload?.docCategory || '도면',
        tradeCategory: foundError.tradeCategory || foundReview?.tradeCategory || foundUpload?.tradeCategory || '소방',
        drawingTitle: foundError.drawingTitle || foundReview?.drawingTitle || foundUpload?.drawingTitle || dwgFile,
        ocrBlocks: foundError.ocrBlocks || foundReview?.ocrBlocks || foundUpload?.ocrBlocks,
        markups:
          foundError.markups && foundError.markups.length > 0
            ? foundError.markups
            : foundReview?.markups || foundUpload?.markups,
        fileDataUrl: foundError.fileDataUrl || foundReview?.fileDataUrl || foundUpload?.fileDataUrl || foundError.cadUrl,
        previewPages: foundError.previewPages || foundReview?.previewPages || foundUpload?.previewPages,
        cadUrl: foundError.cadUrl || foundReview?.fileDataUrl || foundUpload?.fileDataUrl,
      });
    } else {
      setCadModalErrorItem({
        id: `temp-${Date.now()}`,
        errorCode: errorCode || `ERR-${(foundReview?.tradeCategory || foundUpload?.tradeCategory || 'CAD').substring(0, 3).toUpperCase()}-001`,
        dwgFile,
        docCategory: foundReview?.docCategory || foundUpload?.docCategory || '도면',
        tradeCategory: foundReview?.tradeCategory || foundUpload?.tradeCategory || '소방',
        drawingTitle: foundReview?.drawingTitle || foundUpload?.drawingTitle || dwgFile,
        description: `${dwgFile} - CAD 도면 레이어, OCR 텍스트 및 기술 규격 정밀 검토`,
        type:
          (foundReview?.tradeCategory || foundUpload?.tradeCategory) === '토목'
            ? 'Civil'
            : (foundReview?.tradeCategory || foundUpload?.tradeCategory) === '건축전기'
            ? 'Electrical'
            : (foundReview?.tradeCategory || foundUpload?.tradeCategory) === '건축기계'
            ? 'Mechanical'
            : (foundReview?.tradeCategory || foundUpload?.tradeCategory) === '소방'
            ? 'Fire'
            : 'Structural',
        severity: 'CRITICAL',
        fileDataUrl: foundReview?.fileDataUrl || foundUpload?.fileDataUrl || foundReview?.cadUrl,
        previewPages: foundReview?.previewPages || foundUpload?.previewPages,
        cadUrl: foundReview?.fileDataUrl || foundUpload?.fileDataUrl || foundReview?.cadUrl,
        ocrBlocks: foundReview?.ocrBlocks || foundUpload?.ocrBlocks,
        markups: foundReview?.markups || foundUpload?.markups,
        suggestedFix: 'KDS / KEC / NFTC 국가기술기준에 의거한 설계 및 규격 수정 적용.',
      });
    }
  };

  const handleUpdateReviewItem = (updated: ReviewItem) => {
    setReviewItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
  };

  const handleAddUploadFile = (
    newFile: UploadFile,
    reviewData?: {
      reviewItem?: ReviewItem;
      designError?: DesignErrorItem;
      designErrors?: DesignErrorItem[];
      safetyItem?: SafetyItem;
      safetyItems?: SafetyItem[];
      veItem?: VeItem;
      veItems?: VeItem[];
    }
  ) => {
    setUploadFiles((prev) => [newFile, ...prev]);

    if (reviewData?.reviewItem) {
      setReviewItems((prev) => [reviewData.reviewItem!, ...prev]);
    }
    if (reviewData?.designErrors?.length) {
      setDesignErrors((prev) => [...reviewData.designErrors!, ...prev]);
    } else if (reviewData?.designError) {
      setDesignErrors((prev) => [reviewData.designError!, ...prev]);
    }
    if (reviewData?.safetyItems?.length) {
      setSafetyItems((prev) => [...reviewData.safetyItems!, ...prev]);
    } else if (reviewData?.safetyItem) {
      setSafetyItems((prev) => [reviewData.safetyItem!, ...prev]);
    }
    if (reviewData?.veItems?.length) {
      setVeItems((prev) => [...reviewData.veItems!, ...prev]);
    } else if (reviewData?.veItem) {
      setVeItems((prev) => [reviewData.veItem!, ...prev]);
    }
  };

  const handleDeleteUploadFile = (id: string) => {
    const targetFile = uploadFiles.find((f) => f.id === id);
    if (!targetFile) return;

    setUploadFiles((prev) => prev.filter((f) => f.id !== id));
    setReviewItems((prev) => prev.filter((r) => r.fileName !== targetFile.name));
    setDesignErrors((prev) => prev.filter((e) => e.dwgFile !== targetFile.name));
    setSafetyItems((prev) => prev.filter((s) => s.fileName !== targetFile.name));
    setVeItems((prev) => prev.filter((v) => !v.description.includes(targetFile.name)));
  };

  const activeProject = projects.find((p) => p.id === selectedProjectId) || projects[0];

  return (
    <div className="min-h-screen bg-[#f7f9fb] text-[#191c1e] flex">
      {/* Sidebar Navigation */}
      <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} />

      {/* Main Content Area */}
      <div className="flex-1 md:ml-64 flex flex-col min-w-0">
        {/* Header */}
        <Header
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onOpenDeployGuide={() => setIsDeployModalOpen(true)}
          isSupabaseConnected={supabaseConfig.isConnected}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          aiUsage={aiUsage}
        />

        {/* Sub-Header: Project Selector & Quick Stats */}
        <div className="bg-white border-b border-[#c6c5d2] px-6 md:px-10 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold text-[#454651]">현재 프로젝트:</span>
            <div className="relative">
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="h-8 pl-3 pr-8 bg-[#f2f4f6] border border-[#c6c5d2] rounded-lg text-xs font-body font-bold text-[#000d5f] focus:ring-1 focus:ring-[#000d5f] outline-none appearance-none cursor-pointer"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#000d5f] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <span className="hidden lg:inline text-xs font-mono text-[#767682]">
              {activeProject.description}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsDeployModalOpen(true)}
              className="text-xs font-mono text-[#000d5f] hover:underline flex items-center gap-1 font-bold cursor-pointer"
            >
              <Database className="w-3.5 h-3.5" />
              백엔드 DB & AI Engine 연동 설정
            </button>
          </div>
        </div>

        {/* View Router */}
        <main className="flex-1 px-6 md:px-10 pt-6">
          {activeTab === 'dashboard' && (
            <DashboardView
              reviewItems={reviewItems}
              uploadFiles={uploadFiles}
              onSelectTab={setActiveTab}
              onOpenCadViewer={handleOpenCadViewer}
              onOpenOcrModal={(file) => setOcrModalFile(file)}
              onUpdateReviewItem={handleUpdateReviewItem}
              searchQuery={searchQuery}
            />
          )}

          {activeTab === 'safety' && (
            <SafetyView
              safetyItems={safetyItems}
              onOpenCadViewer={handleOpenCadViewer}
              onSelectTab={setActiveTab}
              searchQuery={searchQuery}
            />
          )}

          {activeTab === 'errors' && (
            <DesignErrorsView
              designErrors={designErrors}
              onOpenCadViewer={handleOpenCadViewer}
              onSelectTab={setActiveTab}
              searchQuery={searchQuery}
            />
          )}

          {activeTab === 'cost_ve' && (
            <CostVeView
              veItems={veItems}
              onSelectTab={setActiveTab}
              searchQuery={searchQuery}
            />
          )}
          {activeTab === 'report' && <ReportView reviewItems={reviewItems} designErrors={designErrors} safetyItems={safetyItems} veItems={veItems} />}

          {activeTab === 'upload' && (
            <UploadView
              uploadFiles={uploadFiles}
              onAddUploadFile={handleAddUploadFile}
              onDeleteUploadFile={handleDeleteUploadFile}
              onSelectTab={setActiveTab}
              onOpenOcrModal={(file) => setOcrModalFile(file)}
              onOpenCadViewer={handleOpenCadViewer}
              onAiUsageEvent={handleAiUsageEvent}
            />
          )}
        </main>
      </div>

      {/* CAD Drawing Overlay Viewer Modal */}
      <ReviewWorkspaceModal
        errorItem={cadModalErrorItem}
        uploadFiles={uploadFiles}
        reviewItems={reviewItems}
        onClose={() => setCadModalErrorItem(null)}
      />

      {/* OCR Review & Text Inspection Modal */}
      <OcrReviewModal
        file={ocrModalFile}
        onClose={() => setOcrModalFile(null)}
      />

      {/* Supabase & Vercel Deployment Modal */}
      <DeploySupabaseModal
        isOpen={isDeployModalOpen}
        onClose={() => setIsDeployModalOpen(false)}
        config={supabaseConfig}
        onSaveConfig={handleSaveSupabaseConfig}
        onSyncDataToSupabase={handleSyncToSupabase}
      />

      <div className="fixed bottom-6 right-6 z-[90]">
        <div className="mb-2 text-center text-xs font-bold tracking-wide text-[#000d5f]">AI 챗봇</div>
        {isAssistantOpen && <div className="mb-3 flex h-[430px] w-[360px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"><div className="flex items-center justify-between border-b bg-[#101a2e] p-4 text-white"><div><b>설계 도우미</b><p className="text-[11px] text-slate-300">AI 도면 검토 채팅</p></div><button onClick={() => setIsAssistantOpen(false)}><X className="h-4 w-4" /></button></div><div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-3">{assistantMessages.map((message, index) => <div key={index} className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-5 ${message.role === 'user' ? 'ml-auto bg-[#000d5f] text-white' : 'bg-white text-slate-700 shadow-sm'}`}>{message.text}</div>)}</div><div className="flex gap-2 border-t bg-white p-3"><input value={assistantInput} onChange={(e) => setAssistantInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendAssistantMessage()} placeholder="검토 결과에 대해 질문" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-[#000d5f]" /><button onClick={sendAssistantMessage} className="rounded-lg bg-[#000d5f] px-3 text-xs font-bold text-white">전송</button></div></div>}
        <button onClick={() => setIsAssistantOpen((open) => !open)} className="flex h-14 w-14 items-center justify-center rounded-full bg-[#000d5f] text-white shadow-xl ring-4 ring-white hover:bg-blue-900" aria-label="설계 도우미 열기"><MessageCircle className="h-6 w-6" /></button>
      </div>
    </div>
  );
}
