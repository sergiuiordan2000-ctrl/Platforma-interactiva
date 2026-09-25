/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { QuickDialCategory } from '../../types/quickDial';

interface QuickDialCategoryPillsProps {
  categories: QuickDialCategory[];
  activeCategory: string;
  counts: Record<string, number>;
  onSelectCategory: (categoryId: string) => void;
}

export const QuickDialCategoryPills: React.FC<QuickDialCategoryPillsProps> = ({
  categories,
  activeCategory,
  counts,
  onSelectCategory,
}) => {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none" aria-label="Categorii numere utile">
      {/* Buton „Toate” */}
      <button
        onClick={() => onSelectCategory('all')}
        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-sm ${
          activeCategory === 'all'
            ? 'bg-slate-900 text-white shadow-slate-900/20'
            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'
        }`}
      >
        <span>Toate contactele</span>
        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
          activeCategory === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
        }`}>
          {counts['all'] || 0}
        </span>
      </button>

      {/* Categoriile din sistem */}
      {categories.map((cat) => {
        const isActive = activeCategory === cat.id;
        const count = counts[cat.id] || 0;

        return (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.id)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-sm ${
              isActive
                ? 'bg-blue-700 text-white shadow-blue-700/20'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <span>{cat.name}</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
              isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
};
