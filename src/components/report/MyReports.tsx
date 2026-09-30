/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * „Sesizările mele” (D27–D28, A-6): aceeași proiecție ca pe hartă + stadiul, fără starea transmiterii.
 * Autorul își poate șterge definitiv orice sesizare proprie, în orice stadiu (D19–D22).
 */

import React, { useState } from 'react';
import { AlertTriangle, Loader2, MapPin, RefreshCw, Tag, Trash2 } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { STATUS_LABELS, reportService, type CitizenReport, type ReportStatus } from '../../services/reportService';

const STATUS_COLORS: Record<ReportStatus, string> = {
  new: 'bg-blue-100 text-blue-800 border-blue-300',
  in_analysis: 'bg-amber-100 text-amber-800 border-amber-300',
  resolved: 'bg-emerald-100 text-emerald-800 border-emerald-300',
};

export const MyReports: React.FC<{ onChanged?: (count: number) => void }> = ({ onChanged }) => {
  const { data, loading, error, reload } = useAsync<CitizenReport[]>(async () => {
    const list = await reportService.getMyReports();
    onChanged?.(list.length);
    return list;
  }, []);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const remove = async (ref: string) => {
    setBusy(ref);
    setActionError(null);
    try {
      await reportService.deleteMyReport(ref);
      setConfirming(null);
      await reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Sesizarea nu a putut fi ștearsă.');
    } finally {
      setBusy(null);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-500 p-6 justify-center">
        <Loader2 className="w-4 h-4 animate-spin" /> Se încarcă sesizările...
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between gap-2">
        <span>Lista nu a putut fi încărcată: {error}</span>
        <button type="button" onClick={() => void reload()} className="font-bold underline">
          Reîncearcă
        </button>
      </div>
    );
  }
  const list = data ?? [];

  return (
    <div className="space-y-3" data-testid="my-reports">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          {list.length === 0 ? 'Nu aveți sesizări.' : `${list.length} ${list.length === 1 ? 'sesizare' : 'sesizări'}. Se păstrează 45 de zile de la depunere.`}
        </p>
        <button type="button" onClick={() => void reload()} className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:underline">
          <RefreshCw className="w-3.5 h-3.5" /> Actualizează
        </button>
      </div>

      {actionError && (
        <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
          {actionError}
        </div>
      )}

      {list.map((r) => (
        <div key={r.referenceNumber} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2.5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm font-black text-blue-900 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">{r.referenceNumber}</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 inline-flex items-center gap-1">
                <Tag className="w-3 h-3" /> {r.categoryName}
              </span>
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider border ${STATUS_COLORS[r.status]}`}>
                {STATUS_LABELS[r.status]}
              </span>
            </div>
            <span className="text-[11px] text-slate-400">{new Date(r.createdAt).toLocaleString('ro-RO')}</span>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed">{r.publicDescription}</p>
          <div className="flex items-start gap-1.5 text-[11px] text-slate-500">
            <MapPin className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
            <span>
              {r.publicLocation.text}
              {r.publicLocation.lat === null ? (
                <span className="ml-1 text-amber-700 font-semibold">· nu apare pe hartă (fără poziție)</span>
              ) : r.locationApproximate ? (
                <span className="ml-1 text-amber-700">· zonă aproximativă</span>
              ) : null}
            </span>
          </div>

          <div className="pt-2 border-t border-slate-100 flex justify-end">
            {confirming === r.referenceNumber ? (
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="text-red-700 font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Ștergerea este definitivă, inclusiv de pe hartă.
                </span>
                <button
                  type="button"
                  onClick={() => void remove(r.referenceNumber)}
                  disabled={busy === r.referenceNumber}
                  className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold disabled:opacity-50"
                >
                  {busy === r.referenceNumber ? 'Se șterge...' : 'Da, șterge'}
                </button>
                <button type="button" onClick={() => setConfirming(null)} className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold">
                  Renunță
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(r.referenceNumber)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-600 hover:text-red-700 font-bold text-[11px]"
              >
                <Trash2 className="w-3.5 h-3.5" /> Șterge sesizarea
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
