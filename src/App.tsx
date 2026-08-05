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

import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { SafetyView } from './components/SafetyView';
import { DesignErrorsView } from './components/DesignErrorsView';
import { CostVeView } from './components/CostVeView';
import { UploadView } from './components/UploadView';
import { PdfViewerModal } from './components/PdfViewerModal';
import { OcrReviewModal } from './components/OcrReviewModal';
import { DeploySupabaseModal } from './components/DeploySupabaseModal';
import { ChevronDown, Folder, Layers, Database } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<PageTab>('dashboard');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Domain Datasets initialized from empty lists (sample drawings removed for real user upload)
  const [projects] = useState<Project[]>(INITIAL_PROJECTS);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('POSCO-PLANT-01');
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>(INITIAL_REVIEW_ITEMS);
  const [safetyItems, setSafetyItems] = useState<SafetyItem[]>(INITIAL_SAFETY_ITEMS);
  const [designErrors, setDesignErrors] = useState<DesignErrorItem[]>(INITIAL_DESIGN_ERRORS);
  const [veItems, setVeItems] = useState<VeItem[]>(INITIAL_VE_ITEMS);
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>(INITIAL_UPLOAD_FILES);

  // Supabase Configuration State
  const [supabaseConfig, setSupabaseConfigState] = useState<SupabaseConfig>(getSupabaseConfig());

  // Modal States
  const [isDeployModalOpen, setIsDeployModalOpen] = useState<boolean>(false);
  const [pdfViewerFile, setPdfViewerFile] = useState<any | null>(null);
  const [ocrModalFile, setOcrModalFile] = useState<UploadFile | ReviewItem | null>(null);

  // Load data from Supabase if connected
  useEffect(() => {
    async function loadSupabaseData() {
      if (supabaseConfig.isConnected) {
        initSupabase(supabaseConfig.url, supabaseConfig.anonKey);
        const data = await fetchReviewItemsFromSupabase();
        if (data && data.length > 0) {
          setReviewItems(data);
        }
      }
    }
    loadSupabaseData();
  }, [supabaseConfig]);

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

  const handleOpenPdfViewer = (dwgFile: string, errorCode?: string) => {
    const foundErrorByFile = designErrors.find((e) => e.dwgFile === dwgFile);
    const foundErrorByCode = errorCode ? designErrors.find((e) => e.errorCode === errorCode) : undefined;
    const foundError = foundErrorByFile || foundErrorByCode;

    const foundReview = reviewItems.find((r) => r.fileName === dwgFile);
    const foundUpload = uploadFiles.find((u) => u.name === dwgFile);

    if (foundReview) {
      setPdfViewerFile(foundReview);
    } else if (foundUpload) {
      setPdfViewerFile(foundUpload);
    } else if (foundError) {
      setPdfViewerFile({
        ...foundError,
        fileName: foundError.dwgFile,
        docCategory: foundError.docCategory || '도면',
        tradeCategory: foundError.tradeCategory || '소방',
        drawingTitle: foundError.drawingTitle || dwgFile,
        fileDataUrl: foundError.fileDataUrl || foundError.cadUrl,
      });
    } else {
      setPdfViewerFile({
        id: `temp-${Date.now()}`,
        fileName: dwgFile,
        docCategory: '도면',
        tradeCategory: '소방',
        drawingTitle: dwgFile,
        description: `${dwgFile} - PDF 도면 정밀 검토`,
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
      safetyItem?: SafetyItem;
      veItem?: VeItem;
    }
  ) => {
    setUploadFiles((prev) => [newFile, ...prev]);

    if (reviewData?.reviewItem) {
      setReviewItems((prev) => [reviewData.reviewItem!, ...prev]);
    }
    if (reviewData?.designError) {
      setDesignErrors((prev) => [reviewData.designError!, ...prev]);
    }
    if (reviewData?.safetyItem) {
      setSafetyItems((prev) => [reviewData.safetyItem!, ...prev]);
    }
    if (reviewData?.veItem) {
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
              onOpenPdfViewer={handleOpenPdfViewer}
              onOpenOcrModal={(file) => setOcrModalFile(file)}
              onUpdateReviewItem={handleUpdateReviewItem}
              searchQuery={searchQuery}
            />
          )}

          {activeTab === 'safety' && (
            <SafetyView
              safetyItems={safetyItems}
              onOpenPdfViewer={handleOpenPdfViewer}
              onSelectTab={setActiveTab}
              searchQuery={searchQuery}
            />
          )}

          {activeTab === 'errors' && (
            <DesignErrorsView
              designErrors={designErrors}
              onOpenPdfViewer={handleOpenPdfViewer}
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

          {activeTab === 'upload' && (
            <UploadView
              uploadFiles={uploadFiles}
              onAddUploadFile={handleAddUploadFile}
              onDeleteUploadFile={handleDeleteUploadFile}
              onSelectTab={setActiveTab}
              onOpenOcrModal={(file) => setOcrModalFile(file)}
              onOpenPdfViewer={handleOpenPdfViewer}
            />
          )}
        </main>
      </div>

      {/* PDF Drawing Overlay Viewer Modal */}
      <PdfViewerModal
        file={pdfViewerFile}
        onClose={() => setPdfViewerFile(null)}
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
    </div>
  );
}
