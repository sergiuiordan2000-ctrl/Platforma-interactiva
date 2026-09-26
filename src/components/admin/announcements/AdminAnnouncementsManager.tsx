/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Megaphone,
  Plus,
  Edit3,
  Power,
  X,
  Search,
  Calendar,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { Announcement, AnnouncementType, AnnouncementFilterType } from '../../../types/announcement';
import { announcementService } from '../../../services/announcementService';
import { permissionService } from '../../../services/permissionService';
import { formatDateTimeRo } from '../../../utils/dateFormatter';

interface AdminAnnouncementsManagerProps {
  onSuccess: (msg: string) => void;
}

const TYPE_LABELS: Record<AnnouncementType, string> = {
  notification: 'Notificare',
  announcement: 'Anunț',
  news: 'Știre',
  event: 'Eveniment',
};

const emptyForm = {
  type: 'announcement' as AnnouncementType,
  title: '',
  summary: '',
  content: '',
  author: '',
  category: '',
  imageUrl: '',
  isUrgent: false,
  expiresAt: '',
  eventDate: '',
  eventTime: '',
  eventLocation: '',
  eventOrganizer: '',
};

export const AdminAnnouncementsManager: React.FC<AdminAnnouncementsManagerProps> = ({ onSuccess }) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>(() =>
    announcementService.getAll('all', 'published_desc', true)
  );

  const [activeFilter, setActiveFilter] = useState<AnnouncementFilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formState, setFormState] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // ETAPA 6.5 (P6): permisiuni pe acțiune (matricea 5D). Un comunicat nou este creat direct
  // publicat, deci crearea cere `announcements.create` + `announcements.publish`.
  const canCreate = permissionService.currentUserCanAll(['announcements.create', 'announcements.publish']);
  const canEdit = permissionService.currentUserCan('announcements.edit');
  const canPublish = permissionService.currentUserCan('announcements.publish');
  const canDisable = permissionService.currentUserCan('announcements.disable');
  const [actionError, setActionError] = useState<string | null>(null);
  const DENIED_MESSAGE = 'Acțiunea nu a fost efectuată: nu aveți permisiunea necesară sau operația a fost refuzată.';

  const refresh = () => {
    setAnnouncements(announcementService.getAll('all', 'published_desc', true));
  };

  const visibleAnnouncements = announcements
    .filter((a) => (activeFilter === 'all' ? true : a.type === activeFilter))
    .filter((a) => {
      if (!searchQuery.trim()) return true;
      const term = searchQuery.toLowerCase().trim();
      return a.title.toLowerCase().includes(term) || a.summary.toLowerCase().includes(term);
    });

  const handleStartCreate = () => {
    if (!canCreate) { setActionError(DENIED_MESSAGE); return; }
    setFormState(emptyForm);
    setFormErrors({});
    setIsCreating(true);
    setEditingAnnouncement(null);
  };

  const handleStartEdit = (a: Announcement) => {
    if (!canEdit) { setActionError(DENIED_MESSAGE); return; }
    setFormState({
      type: a.type,
      title: a.title,
      summary: a.summary,
      content: a.content,
      author: a.author,
      category: a.category,
      imageUrl: a.imageUrl || '',
      isUrgent: a.isUrgent || false,
      expiresAt: a.expiresAt ? a.expiresAt.slice(0, 16) : '',
      eventDate: a.eventDate || '',
      eventTime: a.eventTime || '',
      eventLocation: a.eventLocation || '',
      eventOrganizer: a.eventOrganizer || '',
    });
    setFormErrors({});
    setEditingAnnouncement(a);
    setIsCreating(false);
  };

  const handleCancelForm = () => {
    setIsCreating(false);
    setEditingAnnouncement(null);
    setFormErrors({});
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!formState.title.trim()) errs.title = 'Titlul este obligatoriu.';
    if (!formState.summary.trim()) errs.summary = 'Rezumatul este obligatoriu.';
    if (!formState.content.trim()) errs.content = 'Conținutul complet este obligatoriu.';
    if (!formState.author.trim()) errs.author = 'Autorul / sursa este obligatorie.';
    if (!formState.category.trim()) errs.category = 'Categoria este obligatorie.';
    if (formState.type === 'event' && !formState.eventDate.trim()) {
      errs.eventDate = 'Data desfășurării este obligatorie pentru un eveniment.';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const basePayload = {
      type: formState.type,
      title: formState.title.trim(),
      summary: formState.summary.trim(),
      content: formState.content.trim(),
      author: formState.author.trim(),
      category: formState.category.trim(),
      imageUrl: formState.imageUrl.trim() || undefined,
      isUrgent: formState.type === 'notification' ? formState.isUrgent : false,
      expiresAt: formState.expiresAt ? new Date(formState.expiresAt).toISOString() : undefined,
      eventDate: formState.type === 'event' ? formState.eventDate.trim() : undefined,
      eventTime: formState.type === 'event' ? formState.eventTime.trim() || undefined : undefined,
      eventLocation: formState.type === 'event' ? formState.eventLocation.trim() || undefined : undefined,
      eventOrganizer: formState.type === 'event' ? formState.eventOrganizer.trim() || undefined : undefined,
    };

    if (isCreating) {
      if (!canCreate) { setActionError(DENIED_MESSAGE); return; }
      const created = announcementService.create({
        ...basePayload,
        publishedAt: new Date().toISOString(),
        status: 'published',
        isDemo: false,
      });
      // ETAPA 6.5 (P6): succes afișat DOAR dacă serviciul a acceptat operația
      if (!created) { setActionError(DENIED_MESSAGE); return; }
      setActionError(null);
      onSuccess(`Comunicatul „${formState.title}” a fost creat și publicat cu succes!`);
    } else if (editingAnnouncement) {
      if (!canEdit) { setActionError(DENIED_MESSAGE); return; }
      const updated = announcementService.update(editingAnnouncement.id, basePayload);
      if (!updated) { setActionError(DENIED_MESSAGE); return; }
      setActionError(null);
      onSuccess(`Comunicatul „${formState.title}” a fost actualizat cu succes!`);
    }

    handleCancelForm();
    refresh();
  };

  const handleToggleStatus = (a: Announcement) => {
    const isCurrentlyPublished = (a.status ?? 'published') === 'published';
    // ETAPA 6.5 (P6): dezactivare → `announcements.disable`; publicare → `announcements.publish`
    if (isCurrentlyPublished ? !canDisable : !canPublish) { setActionError(DENIED_MESSAGE); return; }
    const changed = announcementService.setStatus(a.id, isCurrentlyPublished ? 'draft' : 'published');
    if (!changed) { setActionError(DENIED_MESSAGE); return; }
    setActionError(null);
    onSuccess(
      `Comunicatul „${a.title}” este acum ${isCurrentlyPublished ? 'DEZACTIVAT (ciornă)' : 'PUBLICAT'} în zona publică.`
    );
    refresh();
  };

  return (
    <div className="space-y-6">

      {/* ETAPA 6.5 (P6): acțiune refuzată — nu se afișează succes */}
      {actionError && (
        <div role="alert" className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-800 font-semibold flex items-center justify-between gap-3">
          <span>{actionError}</span>
          <button type="button" onClick={() => setActionError(null)} className="text-red-700 hover:text-red-900 font-bold">×</button>
        </div>
      )}

      {/* Bară Superioară: Titlu + Buton Adăugare */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-blue-600" />
            <span>Gestiune Comunicate & Evenimente</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Total {announcements.length} comunicate (
            {announcements.filter((a) => (a.status ?? 'published') === 'published').length} publicate)
          </p>
        </div>

        {canCreate && !isCreating && !editingAnnouncement && (
          <button
            onClick={handleStartCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Adaugă Comunicat Nou</span>
          </button>
        )}
      </div>

      {/* Formular Adăugare / Editare */}
      {(isCreating || editingAnnouncement) && (
        <form onSubmit={handleSaveForm} className="bg-slate-50 border-2 border-blue-300 rounded-3xl p-5 sm:p-6 space-y-4 shadow-md animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-blue-600" />
              <span>{isCreating ? 'Adăugare Comunicat Nou' : `Editare: ${editingAnnouncement?.title}`}</span>
            </h4>
            <button
              type="button"
              onClick={handleCancelForm}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 bg-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Tip conținut *</label>
              <select
                value={formState.type}
                onChange={(e) => setFormState({ ...formState, type: e.target.value as AnnouncementType })}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 cursor-pointer"
              >
                {(Object.keys(TYPE_LABELS) as AnnouncementType[]).map((t) => (
                  <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Categorie *</label>
              <input
                type="text"
                value={formState.category}
                onChange={(e) => setFormState({ ...formState, category: e.target.value })}
                placeholder="ex: Infrastructură, Cultură, Sănătate"
                className={`w-full p-2.5 bg-white border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 ${
                  formErrors.category ? 'border-red-400 focus:ring-red-200' : 'border-slate-200 focus:ring-blue-200'
                }`}
              />
              {formErrors.category && <p className="text-[11px] text-red-600">{formErrors.category}</p>}
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-bold text-slate-700">Titlu *</label>
              <input
                type="text"
                value={formState.title}
                onChange={(e) => setFormState({ ...formState, title: e.target.value })}
                placeholder="Titlul comunicatului"
                className={`w-full p-2.5 bg-white border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 ${
                  formErrors.title ? 'border-red-400 focus:ring-red-200' : 'border-slate-200 focus:ring-blue-200'
                }`}
              />
              {formErrors.title && <p className="text-[11px] text-red-600">{formErrors.title}</p>}
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-bold text-slate-700">Rezumat scurt (afișat în listă) *</label>
              <input
                type="text"
                value={formState.summary}
                onChange={(e) => setFormState({ ...formState, summary: e.target.value })}
                placeholder="Rezumat de 1-2 fraze"
                className={`w-full p-2.5 bg-white border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 ${
                  formErrors.summary ? 'border-red-400 focus:ring-red-200' : 'border-slate-200 focus:ring-blue-200'
                }`}
              />
              {formErrors.summary && <p className="text-[11px] text-red-600">{formErrors.summary}</p>}
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-bold text-slate-700">Conținut complet *</label>
              <textarea
                value={formState.content}
                onChange={(e) => setFormState({ ...formState, content: e.target.value })}
                placeholder="Textul integral al comunicatului (paragrafele se separă cu linie goală)"
                rows={5}
                className={`w-full p-2.5 bg-white border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 ${
                  formErrors.content ? 'border-red-400 focus:ring-red-200' : 'border-slate-200 focus:ring-blue-200'
                }`}
              />
              {formErrors.content && <p className="text-[11px] text-red-600">{formErrors.content}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Autor / Sursă *</label>
              <input
                type="text"
                value={formState.author}
                onChange={(e) => setFormState({ ...formState, author: e.target.value })}
                placeholder="ex: Primăria Turnu Măgurele"
                className={`w-full p-2.5 bg-white border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 ${
                  formErrors.author ? 'border-red-400 focus:ring-red-200' : 'border-slate-200 focus:ring-blue-200'
                }`}
              />
              {formErrors.author && <p className="text-[11px] text-red-600">{formErrors.author}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Imagine (URL, opțional)</label>
              <input
                type="text"
                value={formState.imageUrl}
                onChange={(e) => setFormState({ ...formState, imageUrl: e.target.value })}
                placeholder="https://..."
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Expiră la (opțional — după această dată, dispare din zona publică)</span>
              </label>
              <input
                type="datetime-local"
                value={formState.expiresAt}
                onChange={(e) => setFormState({ ...formState, expiresAt: e.target.value })}
                className="w-full sm:w-auto p-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            {formState.type === 'notification' && (
              <div className="sm:col-span-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formState.isUrgent}
                    onChange={(e) => setFormState({ ...formState, isUrgent: e.target.checked })}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300"
                  />
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Marchează drept Alertă Urgentă</span>
                  </span>
                </label>
              </div>
            )}

            {/* CÂMPURI SPECIFICE EVENIMENTULUI */}
            {formState.type === 'event' && (
              <div className="sm:col-span-2 p-4 rounded-2xl bg-purple-50 border border-purple-200 space-y-4">
                <div className="flex items-center gap-2 text-purple-900 font-bold text-xs uppercase tracking-wider">
                  <Calendar className="w-3.5 h-3.5 text-purple-700" />
                  <span>Date de desfășurare a evenimentului</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Data desfășurării *</label>
                    <input
                      type="date"
                      value={formState.eventDate}
                      onChange={(e) => setFormState({ ...formState, eventDate: e.target.value })}
                      className={`w-full p-2.5 bg-white border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 ${
                        formErrors.eventDate ? 'border-red-400 focus:ring-red-200' : 'border-slate-200 focus:ring-purple-200'
                      }`}
                    />
                    {formErrors.eventDate && <p className="text-[11px] text-red-600">{formErrors.eventDate}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Ora de începere (opțional)</label>
                    <input
                      type="time"
                      value={formState.eventTime}
                      onChange={(e) => setFormState({ ...formState, eventTime: e.target.value })}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-bold text-slate-700">Locație (opțional)</label>
                    <input
                      type="text"
                      value={formState.eventLocation}
                      onChange={(e) => setFormState({ ...formState, eventLocation: e.target.value })}
                      placeholder="ex: Casa de Cultură Turnu Măgurele"
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-bold text-slate-700">Organizator (opțional)</label>
                    <input
                      type="text"
                      value={formState.eventOrganizer}
                      onChange={(e) => setFormState({ ...formState, eventOrganizer: e.target.value })}
                      placeholder="ex: Centrul Cultural Local"
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={handleCancelForm}
              className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition-colors"
            >
              Anulează
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all"
            >
              {isCreating ? 'Salvează și Publică' : 'Actualizează Comunicatul'}
            </button>
          </div>
        </form>
      )}

      {/* Bară de Filtrare și Căutare */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Caută comunicate după titlu sau rezumat..."
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <select
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value as AnnouncementFilterType)}
          className="p-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200 cursor-pointer"
        >
          <option value="all">Toate Tipurile</option>
          {(Object.keys(TYPE_LABELS) as AnnouncementType[]).map((t) => (
            <option key={t} value={t}>{TYPE_LABELS[t]}</option>
          ))}
        </select>
      </div>

      {/* Listă Comunicate */}
      <div className="space-y-3">
        {visibleAnnouncements.length === 0 && (
          <div className="text-center py-10 bg-white rounded-2xl border border-slate-200 text-xs text-slate-500">
            Niciun comunicat nu corespunde filtrului selectat.
          </div>
        )}

        {visibleAnnouncements.map((a) => {
          const isPublished = (a.status ?? 'published') === 'published';
          const isExpired = a.expiresAt ? new Date(a.expiresAt).getTime() < Date.now() : false;

          return (
            <div
              key={a.id}
              className={`bg-white rounded-2xl border p-4 sm:p-5 shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                !isPublished || isExpired ? 'opacity-60 bg-slate-50 border-dashed border-slate-300' : 'border-slate-200'
              }`}
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                    {TYPE_LABELS[a.type]}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      isPublished
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : 'bg-slate-200 text-slate-700 border-slate-300'
                    }`}
                  >
                    {isPublished ? 'Publicat' : 'Ciornă (Dezactivat)'}
                  </span>
                  {isExpired && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                      Expirat
                    </span>
                  )}
                  {a.isUrgent && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">
                      Urgent
                    </span>
                  )}
                  {a.isDemo && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                      DEMO
                    </span>
                  )}
                </div>

                <h4 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                  {a.title}
                </h4>
                <p className="text-xs text-slate-600 line-clamp-1">{a.summary}</p>

                <div className="flex items-center gap-3 flex-wrap text-[11px] text-slate-500 pt-1">
                  <span>Publicat: {formatDateTimeRo(a.publishedAt)}</span>
                  {a.expiresAt && <span>Expiră: {formatDateTimeRo(a.expiresAt)}</span>}
                  {a.type === 'event' && a.eventDate && <span>Eveniment: {a.eventDate}</span>}
                </div>
              </div>

              {/* Acțiuni */}
              <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0">
                <button
                  onClick={() => handleToggleStatus(a)}
                  disabled={isPublished ? !canDisable : !canPublish}
                  title={isPublished ? 'Dezactivează (ciornă)' : 'Publică în zona publică'}
                  className={`p-1.5 rounded-lg border transition-colors ${
                    !isPublished
                      ? 'border-slate-300 text-slate-400 hover:text-emerald-700 hover:border-emerald-300'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => handleStartEdit(a)}
                  disabled={!canEdit}
                  title="Editează comunicatul"
                  className="p-1.5 rounded-lg border border-slate-200 text-blue-700 hover:bg-blue-50 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
