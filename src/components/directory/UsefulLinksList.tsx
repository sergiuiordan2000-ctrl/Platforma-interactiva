/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ExternalLink, Globe } from 'lucide-react';
import { UsefulLink } from '../../types/directory';

interface UsefulLinksListProps {
  links: UsefulLink[];
}

export const UsefulLinksList: React.FC<UsefulLinksListProps> = ({ links }) => {
  return (
    <div className="space-y-4">
      <div className="border-b border-slate-200 pb-2">
        <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Globe className="w-5 h-5 text-indigo-600" />
          <span>Portaluri & Link-uri Utile Cetățenilor</span>
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Platforme oficiale pentru plăți electronice, transparență locală și acces la servicii guvernamentale
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {links.map((link) => (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group bg-white rounded-2xl border border-slate-200 hover:border-indigo-400 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-3 cursor-pointer"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-800 border border-indigo-200">
                  {link.category}
                </span>
                <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>

              <h4 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-indigo-700 transition-colors leading-snug">
                {link.title}
              </h4>

              <p className="text-xs text-slate-600 leading-relaxed">
                {link.description}
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-xs font-semibold text-indigo-600 group-hover:underline">
              <span>Deschide portalul</span>
              <ExternalLink className="w-3 h-3" />
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};
