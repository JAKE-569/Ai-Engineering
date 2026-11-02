import React, { useEffect, useRef, useState } from 'react';
import type { PgptModelCatalog, PgptModelSettings } from '../lib/pgptModelSettings';

export function PgptModelSettingsDialog({ onClose, onSave }: { onClose: () => void; onSave: (settings: PgptModelSettings) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [catalog, setCatalog] = useState<PgptModelCatalog>();
  const [selected, setSelected] = useState({ gpt: '', claude: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  useEffect(() => { dialog.current?.showModal(); }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    fetch('/api/pgpt/models', { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20000)]) }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || data.error || '모델 목록 조회 실패');
      if (!controller.signal.aborted) {
        setCatalog(data);
        setSelected({ gpt: data.settings.gpt.defaultModel, claude: data.settings.claude.defaultModel });
      }
    }).catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : '모델 목록 조회 실패'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [refresh]);
  const save = async () => {
    setSaving(true); setError('');
    try {
      const response = await fetch('/api/pgpt/models', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(selected), signal: AbortSignal.timeout(25000) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || data.error || '모델 설정 저장 실패');
      onSave(data.settings);
    } catch (error) { setError(error instanceof Error ? error.message : '모델 설정 저장 실패'); }
    finally { setSaving(false); }
  };
  return <dialog ref={dialog} aria-labelledby="pgpt-settings-title" onCancel={event => { event.preventDefault(); if (!saving) onClose(); }} className="m-auto w-[min(92vw,540px)] rounded-2xl border border-slate-200 p-6 text-slate-800 shadow-2xl backdrop:bg-slate-900/40">
    <h2 id="pgpt-settings-title" className="text-lg font-bold">GPT · Claude 모델 설정</h2>
    <p className="mt-2 text-sm text-slate-600">기본 모델을 선택하세요. 저장하면 다음 문서 검토부터 적용되며 프로그램을 다시 열어도 유지됩니다.</p>
    <button type="button" disabled={loading || saving} onClick={() => setRefresh(value => value + 1)} className="my-4 rounded border border-slate-300 px-3 py-2 text-xs disabled:opacity-50">모델 목록 새로고침</button>
    {loading && <p role="status" className="text-sm">P-GPT 모델 목록을 불러오는 중입니다…</p>}
    {!loading && catalog && <div className="space-y-4">
      {(['gpt', 'claude'] as const).map(provider => <label key={provider} className="block text-sm font-semibold">{provider === 'gpt' ? 'GPT 기본 모델' : 'Claude 기본 모델'}
        <select aria-label={provider === 'gpt' ? 'GPT 기본 모델' : 'Claude 기본 모델'} value={selected[provider]} disabled={saving} onChange={event => setSelected(previous => ({ ...previous, [provider]: event.target.value }))} className="mt-2 block w-full rounded-lg border border-slate-300 bg-white p-2 font-normal">
          {catalog.settings[provider].models.map(model => <option key={model} value={model}>{model}{catalog.available[provider].includes(model) ? '' : ' (기존 설정)'}</option>)}
        </select>
      </label>)}
      <p className="text-xs text-slate-500">사내 P-GPT에 등록된 모델입니다. 모델별 이미지 지원과 사용 권한에 따라 검토 요청이 실패할 수 있습니다.</p>
    </div>}
    {error && <p role="alert" className="mt-3 rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="mt-6 flex justify-end gap-2">
      <button type="button" disabled={saving} onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">취소</button>
      <button type="button" disabled={loading || saving || !catalog} onClick={save} className="rounded-lg bg-blue-900 px-4 py-2 text-sm text-white disabled:opacity-50">{saving ? '저장 중…' : '기본 모델 저장'}</button>
    </div>
  </dialog>;
}
