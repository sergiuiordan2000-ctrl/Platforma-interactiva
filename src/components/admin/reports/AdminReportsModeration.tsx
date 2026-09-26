/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  EyeOff,
  UserCheck,
  MapPin,
  Camera,
  User,
  Phone,
  Mail,
  AlertTriangle,
  RotateCcw,
  Search,
  Filter,
  Layers,
  Sparkles,
  ShieldAlert,
  Wrench,
  PlayCircle,
  ClipboardCheck,
  Lock,
  MessageSquare,
  Send,
  Building2,
  UserMinus
} from 'lucide-react';
import { CivicReport, ModerationStatus, PublicationPreference, ResolutionStatus } from '../../../types/report';
import { reportService } from '../../../services/reportService';
import { authService } from '../../../services/authService';
import { permissionService } from '../../../services/permissionService';

interface AdminReportsModerationProps {
  onSuccess: (message: string) => void;
}

type ModerationFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'private';

const RESOLUTION_LABELS: Record<ResolutionStatus, string> = {
  new: 'Nouă',
  in_progress: 'În lucru',
  resolved: 'Rezolvată',
  closed: 'Închisă',
};

const RESOLUTION_ORDER: ResolutionStatus[] = ['new', 'in_progress', 'resolved', 'closed'];

export const AdminReportsModeration: React.FC<AdminReportsModerationProps> = ({ onSuccess }) => {
  const [reports, setReports] = useState<CivicReport[]>(() => reportService.getAllReports());
  const [activeFilter, setActiveFilter] = useState<ModerationFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Etapa 5C — text în curs de redactare pentru un răspuns administrativ nou, per sesizare
  const [responseDrafts, setResponseDrafts] = useState<Record<string, string>>({});

  const stats = reportService.getModerationStats();

  // ETAPA 6.5 (P6): permisiuni pe acțiune (matricea 5D), nu doar accesul la tab.
  const canModerate = permissionService.currentUserCan('reports.moderate');
  const canResolve = permissionService.currentUserCan('reports.resolve');
  const canReply = permissionService.currentUserCan('reports.reply');
  // Mesaj afișat când acțiunea este refuzată (lipsă permisiune sau refuz al serviciului).
  const [actionError, setActionError] = useState<string | null>(null);
  const DENIED_MESSAGE = 'Acțiunea nu a fost efectuată: nu aveți permisiunea necesară sau operația a fost refuzată.';

  // ETAPA 6.6 (C6): asumarea/preluarea folosește `reports.resolve` (schimbă automat stadiul).
  // Tipul acțiunii (individuală vs. instituțională) este stabilit de `permissionService`.
  const actsForCityHall = permissionService.currentUserActsForCityHall();
  const currentUserId = authService.getCurrentUser()?.id;
  const STORAGE_FAILURE_MESSAGE = 'Acțiunea nu a fost salvată: spațiul de stocare al browserului este plin sau indisponibil. Nu s-a modificat nimic.';

  const handleAssumptionAction = (
    action: 'assume' | 'withdraw' | 'city_hall',
    id: string,
    refNumber: string
  ) => {
    if (!canResolve) { setActionError(DENIED_MESSAGE); return; }
    const result =
      action === 'assume'
        ? reportService.assumeReport(id)
        : action === 'withdraw'
        ? reportService.withdrawAssumption(id)
        : reportService.takeOverByCityHall(id);
    if (!result.success) {
      setActionError(
        result.reason === 'quota_exceeded' || result.reason === 'storage_error' ? STORAGE_FAILURE_MESSAGE : DENIED_MESSAGE
      );
      return;
    }
    setActionError(null);
    setReports(reportService.getAllReports());
    if (!result.changed) return;
    if (action === 'assume') onSuccess(`Ați asumat sesizarea ${refNumber}.`);
    else if (action === 'withdraw') onSuccess(`Ați renunțat la asumarea sesizării ${refNumber}.`);
    else onSuccess(`Sesizarea ${refNumber} a fost preluată de Primărie.`);
  };

  const handleUpdateStatus = (id: string, refNumber: string, newStatus: ModerationStatus) => {
    if (!canModerate) { setActionError(DENIED_MESSAGE); return; }
    const success = reportService.updateModerationStatus(id, newStatus);
    if (!success) { setActionError(DENIED_MESSAGE); return; }
    if (success) {
      setActionError(null);
      setReports(reportService.getAllReports());
      if (newStatus === 'approved') {
        onSuccess(`Sesizarea ${refNumber} a fost aprobată pentru publicare.`);
      } else if (newStatus === 'rejected') {
        onSuccess(`Sesizarea ${refNumber} a fost respinsă / retrasă din publicare.`);
      } else {
        onSuccess(`Sesizarea ${refNumber} a fost readusă în starea de așteptare.`);
      }
    }
  };

  // Etapa 5C — schimbarea stadiului de soluționare (independent de moderare)
  const handleChangeResolutionStatus = (id: string, refNumber: string, newStatus: ResolutionStatus) => {
    if (!canResolve) { setActionError(DENIED_MESSAGE); return; }
    const success = reportService.updateResolutionStatus(id, newStatus);
    if (!success) { setActionError(DENIED_MESSAGE); return; }
    if (success) {
      setActionError(null);
      setReports(reportService.getAllReports());
      onSuccess(`Stadiul soluționării pentru ${refNumber} a fost actualizat: „${RESOLUTION_LABELS[newStatus]}”.`);
    }
  };

  // Etapa 5C — adăugare răspuns administrativ nou (păstrează istoricul, nu suprascrie)
  const handleAddResponse = (id: string, refNumber: string) => {
    if (!canReply) { setActionError(DENIED_MESSAGE); return; }
    const text = (responseDrafts[id] || '').trim();
    if (!text) return;

    const currentUser = authService.getCurrentUser();
    const authorName = currentUser?.name || 'Administrator';

    const created = reportService.addResponse(id, text, authorName);
    if (!created) { setActionError(DENIED_MESSAGE); return; }
    if (created) {
      setActionError(null);
      setReports(reportService.getAllReports());
      setResponseDrafts((prev) => ({ ...prev, [id]: '' }));
      onSuccess(`Răspunsul administrativ a fost adăugat la sesizarea ${refNumber}.`);
    }
  };

  // Filtrare sesizări
  const filteredReports = reports.filter((r) => {
    // 1. Filtru categorie de moderare
    if (activeFilter === 'pending' && r.moderationStatus !== 'pending') return false;
    if (activeFilter === 'approved' && r.moderationStatus !== 'approved') return false;
    if (activeFilter === 'rejected' && r.moderationStatus !== 'rejected') return false;
    if (activeFilter === 'private' && r.publicationPreference !== 'private') return false;

    // 2. Filtru căutare text (TM-XXX, categorie, descriere, adresă)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchRef = r.referenceNumber.toLowerCase().includes(q);
      const matchCat = r.categoryName.toLowerCase().includes(q);
      const matchDesc = r.description.toLowerCase().includes(q);
      const matchLoc = r.location.addressOrDetails.toLowerCase().includes(q);
      return matchRef || matchCat || matchDesc || matchLoc;
    }

    return true;
  });

  return (
    <div className="space-y-6">

      {/* ETAPA 6.5 (P6): acțiune refuzată — nu se afișează succes */}
      {actionError && (
        <div role="alert" className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-800 font-semibold flex items-center justify-between gap-3">
          <span>{actionError}</span>
          <button type="button" onClick={() => setActionError(null)} className="text-red-700 hover:text-red-900 font-bold">×</button>
        </div>
      )}

      {/* 1. Header Secțiune și Indicatori Reali (Cerința 20 din Etapa 3E) */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-700" />
              <span>Moderare Sesizări Cetățenești (Etapa 3E)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Controlul afișării publice pe hartă. Cetățeanul alege dacă dorește publicarea, administratorul aprobă eligibilitatea.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              {stats.publiclyVisible} {stats.publiclyVisible === 1 ? 'activă pe hartă' : 'active pe hartă'}
            </span>
          </div>
        </div>

        {/* 4 Carduri Indicatori Reali */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200">
            <div className="flex items-center justify-between text-amber-900 text-xs font-bold">
              <span>În așteptare</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-amber-950 mt-1">{stats.pending}</div>
            <div className="text-[10px] text-amber-700 mt-0.5">Necesită evaluare</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200">
            <div className="flex items-center justify-between text-emerald-900 text-xs font-bold">
              <span>Aprobate</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-950 mt-1">{stats.approved}</div>
            <div className="text-[10px] text-emerald-700 mt-0.5">Aprobate administrator</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-red-50/80 border border-red-200">
            <div className="flex items-center justify-between text-red-900 text-xs font-bold">
              <span>Respinse</span>
              <XCircle className="w-4 h-4 text-red-600" />
            </div>
            <div className="text-2xl font-black text-red-950 mt-1">{stats.rejected}</div>
            <div className="text-[10px] text-red-700 mt-0.5">Retrase din publicare</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between text-slate-800 text-xs font-bold">
              <span>Private</span>
              <EyeOff className="w-4 h-4 text-slate-500" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1">{stats.privateCount}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Valoare istorică, fără efect pe hartă</div>
          </div>
        </div>

        {/* Notă explicativă privind regula de publicare */}
        <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-200 text-xs text-blue-950 space-y-1">
          <div className="font-bold flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-blue-700" />
            <span>Regula centrală de publicare pe hartă (Etapa 3E, modificată în 6.6):</span>
          </div>
          <p className="text-[11px] leading-relaxed text-blue-900">
            O sesizare devine vizibilă pe hartă dacă și numai dacă: <strong>(1)</strong> administratorul a apăsat „Aprobă” <strong>ȘI</strong> <strong>(2)</strong> există coordonate GPS valide. Cetățeanul nu are o opțiune de excludere de pe hartă; sesizările marcate istoric „Private” se publică în aceleași condiții. Identitatea și datele de contact ale autorului nu sunt afișate public.
          </p>
        </div>
      </div>

      {/* 2. Filtrare și Căutare */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Butoane Filtru */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
              activeFilter === 'all'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Toate ({stats.total})
          </button>

          <button
            onClick={() => setActiveFilter('pending')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
              activeFilter === 'pending'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-white text-amber-900 hover:bg-amber-50 border border-amber-200'
            }`}
          >
            <span>În așteptare</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-900">
              {stats.pending}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter('approved')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
              activeFilter === 'approved'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-emerald-900 hover:bg-emerald-50 border border-emerald-200'
            }`}
          >
            <span>Aprobate</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-900">
              {stats.approved}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter('rejected')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
              activeFilter === 'rejected'
                ? 'bg-red-600 text-white shadow-sm'
                : 'bg-white text-red-900 hover:bg-red-50 border border-red-200'
            }`}
          >
            <span>Respinse</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-100 text-red-900">
              {stats.rejected}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter('private')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
              activeFilter === 'private'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <span>Private</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-700">
              {stats.privateCount}
            </span>
          </button>
        </div>

        {/* Input Căutare */}
        <div className="relative min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Caută TM-XXX, categorie, text..."
            className="w-full pl-9 pr-3.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
      </div>

      {/* 3. Lista Sesizărilor pentru Moderare */}
      {filteredReports.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-2">
          <p className="text-sm font-bold text-slate-700">Nu există sesizări corespunzătoare filtrului selectat.</p>
          <p className="text-xs text-slate-500">Încercați un alt filtru sau adăugați o sesizare nouă din formular.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReports.map((report) => {
            const hasGps = typeof report.location.latitude === 'number' && typeof report.location.longitude === 'number';
            const isVisibleOnMap = reportService.isPubliclyVisible(report);

            return (
              <div
                key={report.id}
                className={`bg-white rounded-3xl border-2 transition-all p-5 sm:p-6 space-y-4 shadow-sm ${
                  report.moderationStatus === 'approved'
                    ? 'border-emerald-200 hover:border-emerald-300'
                    : report.moderationStatus === 'rejected'
                    ? 'border-red-200 hover:border-red-300'
                    : 'border-amber-200 hover:border-amber-300'
                }`}
              >
                {/* Antet Card Sesizare */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono text-base font-black text-blue-900 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200">
                      {report.referenceNumber}
                    </span>

                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800">
                      {report.categoryName}
                    </span>

                    {/* Ecuson Status Moderare */}
                    <span
                      className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 ${
                        report.moderationStatus === 'approved'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : report.moderationStatus === 'rejected'
                          ? 'bg-red-100 text-red-800 border border-red-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}
                    >
                      {report.moderationStatus === 'approved' && <CheckCircle2 className="w-3.5 h-3.5" />}
                      {report.moderationStatus === 'rejected' && <XCircle className="w-3.5 h-3.5" />}
                      {report.moderationStatus === 'pending' && <Clock className="w-3.5 h-3.5" />}
                      <span>
                        {report.moderationStatus === 'approved' && 'Aprobată'}
                        {report.moderationStatus === 'rejected' && 'Respinsă'}
                        {report.moderationStatus === 'pending' && 'În Așteptare'}
                      </span>
                    </span>

                    {/* Indicator Vizibilitate Publică pe Hartă */}
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 ${
                        isVisibleOnMap
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {isVisibleOnMap ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      <span>{isVisibleOnMap ? 'Afișată pe Hartă' : 'Ascunsă de pe Hartă'}</span>
                    </span>
                  </div>

                  <div className="text-xs text-slate-400 font-medium">
                    {new Date(report.createdAt).toLocaleString('ro-RO')}
                  </div>
                </div>

                {/* Preferință Cetățean vs. Explicație Hartă */}
                <div className="flex flex-wrap items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-700">
                    <span>Opțiune aleasă de cetățean:</span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[11px] font-extrabold ${
                        report.publicationPreference === 'private'
                          ? 'bg-slate-200 text-slate-800'
                          : report.publicationPreference === 'public_anonymous'
                          ? 'bg-emerald-100 text-emerald-900'
                          : 'bg-blue-100 text-blue-900'
                      }`}
                    >
                      {report.publicationPreference === 'private' && 'Privat (valoare istorică — fără efect pe hartă)'}
                      {report.publicationPreference === 'public_anonymous' && 'Public Anonim (Protecție date)'}
                      {report.publicationPreference === 'public' && 'Public'}
                    </span>
                  </div>

                  {report.publicationPreference === 'private' && (
                    <span className="text-[11px] text-slate-500 italic">
                      (Marcată istoric „privat”: după aprobare apare pe hartă ca anonimă, fără datele autorului)
                    </span>
                  )}

                  {!hasGps && (
                    <span className="text-[11px] text-amber-700 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      <span>Fără coordonate GPS (nu poate genera pin pe hartă)</span>
                    </span>
                  )}
                </div>

                {/* Corp Sesizare: Descriere & Locație */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  {/* Descriere & Locație */}
                  <div className="md:col-span-2 space-y-2.5">
                    <div>
                      <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                        Descrierea problemei
                      </span>
                      <p className="text-slate-800 bg-slate-50/80 p-3 rounded-xl border border-slate-200 mt-1 leading-relaxed text-xs">
                        „{report.description}”
                      </p>
                    </div>

                    <div className="flex items-start gap-2 pt-1 text-slate-600">
                      <MapPin className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-slate-900">{report.location.addressOrDetails}</span>
                        {hasGps && (
                          <span className="text-[11px] text-slate-400 font-mono ml-2">
                            ({report.location.latitude?.toFixed(4)}, {report.location.longitude?.toFixed(4)})
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Fotografii optimizate atașate (3C) */}
                    {report.photos && report.photos.length > 0 && (
                      <div className="space-y-1 pt-1">
                        <span className="text-slate-500 font-semibold flex items-center gap-1 text-[11px]">
                          <Camera className="w-3.5 h-3.5 text-slate-400" />
                          <span>Fotografii optimizate atașate ({report.photos.length}):</span>
                        </span>
                        <div className="flex items-center gap-2 overflow-x-auto py-1">
                          {report.photos.map((p) => (
                            <img
                              key={p.id}
                              src={p.dataUrl}
                              alt={p.name}
                              className="w-16 h-16 object-cover rounded-xl border border-slate-200 shadow-xs"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Date Contact Petiționar (Vizibile EXCLUSIV în Admin, NICIODATĂ pe hartă) */}
                  <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 space-y-2 self-start">
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                      <User className="w-3.5 h-3.5" />
                      <span>Date Petiționar (Intern Admin)</span>
                    </div>

                    {report.contact?.name || report.contact?.phone || report.contact?.email ? (
                      <div className="space-y-1.5 text-xs text-slate-800">
                        {report.contact.name && (
                          <div className="font-bold">{report.contact.name}</div>
                        )}
                        {report.contact.phone && (
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{report.contact.phone}</span>
                          </div>
                        )}
                        {report.contact.email && (
                          <div className="flex items-center gap-1.5 text-slate-600 truncate">
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{report.contact.email}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400 italic">
                        Petiționarul nu a lăsat date de contact.
                      </div>
                    )}

                    <div className="pt-1.5 border-t border-slate-200 text-[10px] text-slate-400 flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>Confidențial: protejat față de public.</span>
                    </div>
                  </div>
                </div>

                {/* 4. Butoane de Acțiune Moderare (Cerința 9 din Etapa 3E) */}
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-[11px] text-slate-500">
                    ID Tehnic: <code className="font-mono text-slate-600">{report.id}</code>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Buton Aprobă — ETAPA 6.5 (P6): doar cu `reports.moderate` */}
                    {canModerate && report.moderationStatus !== 'approved' && (
                      <button
                        onClick={() => handleUpdateStatus(report.id, report.referenceNumber, 'approved')}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all active:scale-95"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Aprobă Publicarea</span>
                      </button>
                    )}

                    {/* Buton Respinge / Retrage */}
                    {canModerate && report.moderationStatus !== 'rejected' && (
                      <button
                        onClick={() => handleUpdateStatus(report.id, report.referenceNumber, 'rejected')}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-sm transition-all active:scale-95"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>{report.moderationStatus === 'approved' ? 'Retrage din Publicare' : 'Respinge'}</span>
                      </button>
                    )}

                    {/* Buton Re-pune în așteptare */}
                    {canModerate && report.moderationStatus !== 'pending' && (
                      <button
                        onClick={() => handleUpdateStatus(report.id, report.referenceNumber, 'pending')}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
                        title="Re-pune în starea de evaluare inițială"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>În Așteptare</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* 5. STADIUL SOLUȚIONĂRII (Etapa 5C) — concept independent de moderare */}
                {(() => {
                  const resolutionStatus = reportService.getResolutionStatus(report);
                  const responses = report.responses || [];

                  const RESOLUTION_ICONS: Record<ResolutionStatus, React.ReactNode> = {
                    new: <Sparkles className="w-3.5 h-3.5" />,
                    in_progress: <PlayCircle className="w-3.5 h-3.5" />,
                    resolved: <ClipboardCheck className="w-3.5 h-3.5" />,
                    closed: <Lock className="w-3.5 h-3.5" />,
                  };

                  const RESOLUTION_COLORS: Record<ResolutionStatus, string> = {
                    new: 'bg-blue-100 text-blue-800 border-blue-300',
                    in_progress: 'bg-amber-100 text-amber-800 border-amber-300',
                    resolved: 'bg-emerald-100 text-emerald-800 border-emerald-300',
                    closed: 'bg-slate-200 text-slate-700 border-slate-300',
                  };

                  return (
                    <div className="pt-4 mt-1 border-t-2 border-dashed border-slate-200 space-y-3.5">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                          <Wrench className="w-4 h-4 text-purple-700" />
                          <span>Stadiul Soluționării (Intern — Etapa 5C)</span>
                        </h4>
                        <span
                          className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 border ${RESOLUTION_COLORS[resolutionStatus]}`}
                        >
                          {RESOLUTION_ICONS[resolutionStatus]}
                          <span>{RESOLUTION_LABELS[resolutionStatus]}</span>
                        </span>
                      </div>

                      {/* Comutator explicit al stadiului */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {RESOLUTION_ORDER.map((rs) => (
                          <button
                            key={rs}
                            onClick={() => handleChangeResolutionStatus(report.id, report.referenceNumber, rs)}
                            disabled={resolutionStatus === rs || !canResolve}
                            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all border ${
                              resolutionStatus === rs
                                ? `${RESOLUTION_COLORS[rs]} cursor-default`
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {RESOLUTION_LABELS[rs]}
                          </button>
                        ))}
                      </div>

                      {/* ETAPA 6.6 (C6) — Asumare / Preluare (starea curentă) */}
                      {(() => {
                        const assumption = reportService.getAssumptionState(report);
                        const assumedByMe = !!currentUserId && assumption.assigneeIds.includes(currentUserId);
                        return (
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 space-y-2 text-xs">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                              <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                              <span>Asumare / Preluare</span>
                            </span>

                            <div className="flex flex-wrap items-center gap-2">
                              {assumption.takenOverByCityHall ? (
                                <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border bg-teal-100 text-teal-800 border-teal-300 flex items-center gap-1">
                                  <Building2 className="w-3.5 h-3.5" />
                                  <span>Preluată de Primărie</span>
                                </span>
                              ) : (
                                <span className="text-[11px] text-slate-500 italic">Primăria nu a preluat sesizarea.</span>
                              )}
                            </div>

                            <div className="text-slate-700">
                              <span className="font-bold">Responsabili individuali: </span>
                              {assumption.assigneeIds.length > 0 ? (
                                assumption.assigneeIds
                                  .map((aid) => {
                                    const name = authService.getDisplayNameById(aid) ?? aid;
                                    return aid === currentUserId ? `${name} (dvs.)` : name;
                                  })
                                  .join(', ')
                              ) : (
                                <span className="text-slate-400 italic">niciunul</span>
                              )}
                            </div>

                            {canResolve && (
                              <div className="flex flex-wrap items-center gap-2 pt-1">
                                {actsForCityHall && !assumption.takenOverByCityHall && (
                                  <button
                                    onClick={() => handleAssumptionAction('city_hall', report.id, report.referenceNumber)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-[11px] transition-colors"
                                  >
                                    <Building2 className="w-3.5 h-3.5" />
                                    <span>Preia de către Primărie</span>
                                  </button>
                                )}
                                {!actsForCityHall && !assumedByMe && (
                                  <button
                                    onClick={() => handleAssumptionAction('assume', report.id, report.referenceNumber)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-[11px] transition-colors"
                                  >
                                    <UserCheck className="w-3.5 h-3.5" />
                                    <span>Preia / Asumă</span>
                                  </button>
                                )}
                                {!actsForCityHall && assumedByMe && (
                                  <button
                                    onClick={() => handleAssumptionAction('withdraw', report.id, report.referenceNumber)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-[11px] transition-colors"
                                  >
                                    <UserMinus className="w-3.5 h-3.5" />
                                    <span>Renunță la asumare</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Istoric răspunsuri administrative */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                          <span>Răspunsuri administrative interne ({responses.length})</span>
                        </span>

                        {responses.length > 0 ? (
                          <div className="space-y-2">
                            {responses.map((resp) => (
                              <div key={resp.id} className="bg-purple-50/60 border border-purple-100 rounded-xl p-3 text-xs space-y-1">
                                <div className="flex items-center justify-between text-[10px] text-purple-700 font-bold">
                                  <span>{resp.authorName}</span>
                                  <span className="font-normal text-purple-500">
                                    {new Date(resp.createdAt).toLocaleString('ro-RO')}
                                  </span>
                                </div>
                                <p className="text-slate-800 leading-relaxed">{resp.message}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-400 italic">Niciun răspuns administrativ adăugat încă.</p>
                        )}

                        {/* Formular adăugare răspuns nou */}
                        <div className="flex flex-col sm:flex-row gap-2 pt-1">
                          <textarea
                            value={responseDrafts[report.id] || ''}
                            onChange={(e) =>
                              setResponseDrafts((prev) => ({ ...prev, [report.id]: e.target.value }))
                            }
                            placeholder="Adaugă un răspuns/observație administrativă internă..."
                            rows={2}
                            disabled={!canReply}
                            className="flex-1 p-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-200"
                          />
                          <button
                            onClick={() => handleAddResponse(report.id, report.referenceNumber)}
                            disabled={!canReply || !(responseDrafts[report.id] || '').trim()}
                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-xs shadow-sm transition-all shrink-0 self-start sm:self-stretch"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Adaugă răspuns</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
