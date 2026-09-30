/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/** Dezabonarea din notificările de stadiu (D9-2): linkul `#dezabonare?token=…`, fără cont. */

import React, { useEffect, useState } from 'react';
import { BellOff, Loader2 } from 'lucide-react';
import { reportService } from '../../services/reportService';

export const UnsubscribeNotice: React.FC<{ token: string }> = ({ token }) => {
  const [state, setState] = useState<'loading' | 'ok' | 'invalid' | 'error'>('loading');

  useEffect(() => {
    let alive = true;
    setState('loading');
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
      setState('invalid');
      return;
    }
    void reportService.unsubscribe(token).then((r) => alive && setState(r));
    return () => {
      alive = false;
    };
  }, [token]);

  const text = {
    loading: 'Se procesează dezabonarea...',
    ok: 'Nu veți mai primi notificări pe e-mail pentru această sesizare.',
    invalid: 'Linkul de dezabonare nu mai este valabil (sesizarea a fost ștearsă sau linkul este incomplet).',
    error: 'Dezabonarea nu a putut fi procesată acum. Încercați din nou mai târziu, din același link.',
  }[state];

  return (
    <div role="status" className="mb-5 p-4 rounded-2xl bg-white border border-slate-200 shadow-sm text-xs text-slate-700 flex items-center gap-2.5" data-testid="unsubscribe-notice">
      {state === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <BellOff className="w-4 h-4 text-slate-500" />}
      <span>{text}</span>
    </div>
  );
};
