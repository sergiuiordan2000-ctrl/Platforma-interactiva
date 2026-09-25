/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Building2, Phone, Mail, MapPin, Clock, UserCheck } from 'lucide-react';
import { CityHallDepartment } from '../../types/directory';

interface DepartmentsListProps {
  departments: CityHallDepartment[];
}

export const DepartmentsList: React.FC<DepartmentsListProps> = ({ departments }) => {
  return (
    <div className="space-y-4">
      <div className="border-b border-slate-200 pb-2">
        <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Building2 className="w-5 h-5 text-cyan-700" />
          <span>Direcții & Servicii Administrative</span>
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Departamentele de specialitate din cadrul aparatului administrativ al Primăriei Turnu Măgurele
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        {departments.map((dept) => (
          <div
            key={dept.id}
            className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm hover:border-cyan-400 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              {/* Nume și Rol */}
              <div className="space-y-1">
                <h4 className="text-base font-bold text-slate-900 leading-snug">
                  {dept.name}
                </h4>
                {dept.headOfDepartment && (
                  <div className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                    <UserCheck className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                    <span>{dept.headOfDepartment}</span>
                  </div>
                )}
              </div>

              {/* Descriere */}
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {dept.description}
              </p>

              {/* Locație și Program */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
                {dept.location && (
                  <div className="flex items-start gap-2 text-slate-700 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>{dept.location}</span>
                  </div>
                )}

                {dept.schedule && (
                  <div className="flex items-start gap-2 text-slate-700 font-medium">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>{dept.schedule}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Canale Directe de Contact */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
              {dept.phone && (
                <a
                  href={`tel:${dept.phone.replace(/\s+/g, '')}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-50 text-cyan-800 font-bold hover:bg-cyan-100 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-cyan-600" />
                  <span>{dept.phone}</span>
                </a>
              )}

              {dept.email && (
                <a
                  href={`mailto:${dept.email}`}
                  className="inline-flex items-center gap-1.5 text-blue-700 hover:text-blue-900 font-semibold hover:underline"
                >
                  <Mail className="w-3.5 h-3.5 text-blue-500" />
                  <span className="truncate max-w-[180px]">{dept.email}</span>
                </a>
              )}
            </div>

          </div>
        ))}
      </div>
    </div>
  );
};
