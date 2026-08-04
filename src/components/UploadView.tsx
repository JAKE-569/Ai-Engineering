import React, { useState, useRef } from 'react';
import { UploadFile, PageTab } from '../types';
import {
  UploadCloud,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Clock,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Trash2,
} from 'lucide-react';

interface UploadViewProps {
  uploadFiles: UploadFile[];
  onAddUploadFile: (file: UploadFile) => void;
  onSelectTab: (tab: PageTab) => void;
}

export const UploadView: React.FC<UploadViewProps> = ({
  uploadFiles,
  onAddUploadFile,
  onSelectTab,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processSimulatedUpload = (name: string, type: UploadFile['type'], sizeMB: number) => {
    const newFile: UploadFile = {
      id: `up-${Date.now()}`,
      name,
      type,
      sizeMB,
      progress: 100,
      status: '분석 완료',
      uploadedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
    };
    onAddUploadFile(newFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const ext = file.name.split('.').pop()?.toLowerCase();
      let fileType: UploadFile['type'] = 'PDF';
      if (ext === 'dwg' || ext === 'dxf') fileType = 'CAD';
      else if (ext === 'xlsx' || ext === 'xls') fileType = 'BoQ';
      else if (ext === 'doc' || ext === 'docx') fileType = 'Spec';

      const sizeMB = parseFloat((file.size / (1024 * 1024)).toFixed(1));
      processSimulatedUpload(file.name, fileType, sizeMB > 0 ? sizeMB : 5.4);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const ext = file.name.split('.').pop()?.toLowerCase();
      let fileType: UploadFile['type'] = 'CAD';
      if (ext === 'pdf') fileType = 'PDF';
      else if (ext === 'xlsx') fileType = 'BoQ';

      const sizeMB = parseFloat((file.size / (1024 * 1024)).toFixed(1));
      processSimulatedUpload(file.name, fileType, sizeMB > 0 ? sizeMB : 8.2);
    }
  };

  const handleTriggerPreset = (name: string, type: UploadFile['type'], sizeMB: number) => {
    processSimulatedUpload(name, type, sizeMB);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Title */}
      <div>
        <h2 className="font-headline text-2xl font-bold text-[#000d5f]">검토 워크스페이스 - 도면 및 문서 업로드</h2>
        <p className="text-xs font-body text-[#454651] mt-1">
          POSCO 제철 및 산업 플랜트 엔지니어링 도면(DWG/DXF), 시방서(PDF), 내역서(XLSX)를 업로드하여 AI 분석을 수행합니다.
        </p>
      </div>

      {/* Drag and Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
          isDragging
            ? 'border-[#000d5f] bg-[#dfe0ff]/40 scale-[1.01]'
            : 'border-[#c6c5d2] bg-white hover:border-[#000d5f] hover:bg-[#f7f9fb]'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
          accept=".dwg,.dxf,.pdf,.xlsx,.xls,.doc,.docx"
        />
        <div className="w-16 h-16 rounded-full bg-[#dfe0ff] flex items-center justify-center text-[#000d5f] mb-4 shadow-sm">
          <UploadCloud className="w-8 h-8" />
        </div>
        <h3 className="font-headline font-bold text-lg text-[#191c1e]">
          엔지니어링 도면 또는 규격 문서 끌어다 놓기
        </h3>
        <p className="font-body text-xs text-[#454651] mt-1 max-w-md">
          지원 파일: AutoCAD (.dwg, .dxf), PDF 문서, MS Excel (.xlsx 내역서). 최대 500MB까지 자동 교차 검증 지원.
        </p>
        <div className="mt-4 flex gap-3">
          <button className="px-5 py-2.5 bg-[#000d5f] text-white text-xs font-mono font-bold rounded-lg shadow-xs hover:opacity-90">
            내 컴퓨터에서 파일 선택
          </button>
        </div>
      </div>

      {/* Sample Preset Shortcut Bar */}
      <div className="bg-[#f2f4f6] p-4 rounded-lg border border-[#c6c5d2] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#000d5f]" />
          <span className="font-mono text-xs font-bold text-[#000d5f]">
            테스트용 샘플 도면 빠른 등록:
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleTriggerPreset('Posco_Blast_Furnace_Main_A101.dwg', 'CAD', 38.4)}
            className="px-3 py-1 bg-white border border-[#c6c5d2] hover:bg-[#000d5f] hover:text-white rounded text-xs font-mono transition-all cursor-pointer"
          >
            + 고로 메인 도면 (DWG)
          </button>
          <button
            onClick={() => handleTriggerPreset('Structural_Specification_2024.pdf', 'Spec', 14.2)}
            className="px-3 py-1 bg-white border border-[#c6c5d2] hover:bg-[#000d5f] hover:text-white rounded text-xs font-mono transition-all cursor-pointer"
          >
            + 시방서 (PDF)
          </button>
          <button
            onClick={() => handleTriggerPreset('BoQ_Cost_Estimation_Rev2.xlsx', 'BoQ', 4.8)}
            className="px-3 py-1 bg-white border border-[#c6c5d2] hover:bg-[#000d5f] hover:text-white rounded text-xs font-mono transition-all cursor-pointer"
          >
            + 내역서 (XLSX)
          </button>
        </div>
      </div>

      {/* Uploaded Documents Status Table */}
      <div className="bg-white border border-[#c6c5d2] rounded-lg overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-[#c6c5d2] bg-[#f7f9fb] flex justify-between items-center">
          <h4 className="font-headline font-bold text-base text-[#191c1e]">업로드 문서 분석 현황</h4>
          <span className="font-mono text-xs text-[#454651]">총 {uploadFiles.length}개 항목</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#e6e8ea] font-mono text-xs text-[#454651]">
              <tr>
                <th className="px-6 py-3.5 font-semibold">파일명</th>
                <th className="px-6 py-3.5 font-semibold">구분</th>
                <th className="px-6 py-3.5 font-semibold">용량</th>
                <th className="px-6 py-3.5 font-semibold">진행률</th>
                <th className="px-6 py-3.5 font-semibold">상태</th>
                <th className="px-6 py-3.5 font-semibold">업로드 일시</th>
                <th className="px-6 py-3.5 font-semibold text-right">분석/이동</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c6c5d2] font-body text-xs text-[#191c1e]">
              {uploadFiles.map((file) => (
                <tr key={file.id} className="hover:bg-[#f2f4f6] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-[#000d5f] text-xl">
                        {file.type === 'CAD' ? 'architecture' : file.type === 'BoQ' ? 'description' : 'picture_as_pdf'}
                      </span>
                      <span className="font-bold text-sm text-[#191c1e]">{file.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 bg-[#e6e8ea] rounded font-mono text-[11px] font-bold text-[#454651]">
                      {file.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-[#454651]">{file.sizeMB} MB</td>
                  <td className="px-6 py-4">
                    <div className="w-32 bg-[#e6e8ea] h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          file.progress === 100 ? 'bg-emerald-600' : 'bg-[#000d5f]'
                        }`}
                        style={{ width: `${file.progress}%` }}
                      ></div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-xs font-bold ${
                        file.status === '분석 완료'
                          ? 'bg-emerald-100 text-emerald-800'
                          : file.status === '분석중'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {file.status === '분석 완료' ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      )}
                      {file.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-[#454651]">{file.uploadedAt}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => onSelectTab('dashboard')}
                      className="px-3 py-1.5 bg-[#000d5f] text-white rounded text-xs font-mono font-bold hover:opacity-90 inline-flex items-center gap-1 cursor-pointer"
                    >
                      결과 보기
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
