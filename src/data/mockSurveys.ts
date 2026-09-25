/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Survey } from '../types/survey';

/**
 * Date demonstrative inițiale pentru verificarea modelului de date în Etapa 4A.
 * 
 * Reguli stricte respectate:
 * - Clar marcate cu `isDemo: true` și mențiunea explicită în titlu și descriere;
 * - Fără subiecte politice reale sau partizane;
 * - Fără rezultate care să poată fi confundate cu rezultate oficiale;
 * - Nu sunt prezentate ca sondaje reale ale Municipiului Turnu Măgurele;
 * - Acoperă cele 3 tipuri de întrebări: single_choice, multiple_choice, free_text;
 * - Acoperă statusurile din ciclul de viață: active, draft, closed.
 */
export const DEMO_SURVEYS: Survey[] = [
  {
    id: 'srv-demo-001',
    title: '[DEMO] Consultare privind amenajarea zonelor verzi din cartiere',
    description: 'Sondaj demonstrativ pentru testarea modelului de date (Etapa 4A). Are ca scop colectarea de opinii exemplificative privind prioritățile de amenajare a parcurilor și spațiilor de recreere.',
    category: 'Mediu & Spații Verzi',
    period: {
      startDate: '2026-09-01T08:00:00.000Z',
      endDate: '2026-10-31T20:00:00.000Z',
    },
    status: 'active',
    isDemo: true,
    audit: {
      createdAt: '2026-09-01T08:00:00.000Z',
      updatedAt: '2026-09-01T08:00:00.000Z',
      createdBy: 'admin_demo',
    },
    questions: [
      {
        id: 'q-demo-101',
        text: 'Cât de des frecventați parcurile sau spațiile verzi din municipiu?',
        type: 'single_choice',
        order: 1,
        isRequired: true,
        helpText: 'Selectați o singură variantă care descrie cel mai bine rutina dumneavoastră.',
        options: [
          { id: 'opt-101-a', text: 'Zilnic sau aproape zilnic', order: 1 },
          { id: 'opt-101-b', text: 'De câteva ori pe săptămână', order: 2 },
          { id: 'opt-101-c', text: 'De câteva ori pe lună', order: 3 },
          { id: 'opt-101-d', text: 'Rar sau deloc', order: 4 },
        ],
      },
      {
        id: 'q-demo-102',
        text: 'Ce dotări considerați prioritare pentru modernizarea spațiilor verzi?',
        type: 'multiple_choice',
        order: 2,
        isRequired: false,
        helpText: 'Puteți alege mai multe variante din lista de mai jos.',
        options: [
          { id: 'opt-102-a', text: 'Iluminat public ambiental eficient (LED)', order: 1 },
          { id: 'opt-102-b', text: 'Bănci noi și mobilier urban ergonomic', order: 2 },
          { id: 'opt-102-c', text: 'Locuri de joacă sigure pentru copii', order: 3 },
          { id: 'opt-102-d', text: 'Piste sau trasee amenajate pentru biciclete/alergare', order: 4 },
          { id: 'opt-102-e', text: 'Coșuri de gunoi pentru colectare selectivă', order: 5 },
        ],
      },
      {
        id: 'q-demo-103',
        text: 'Ce sugestie sau propunere punctuală aveți pentru parcurile din oraș?',
        type: 'free_text',
        order: 3,
        isRequired: false,
        helpText: 'Descrieți pe scurt o propunere sau o idee constructivă.',
      },
    ],
  },
  {
    id: 'srv-demo-002',
    title: '[DEMO] Proiect model: Modernizarea transportului public urban',
    description: 'Sondaj demonstrativ în lucru (draft) destinat testării funcționalității de pregătire a consultărilor înainte de activarea publică.',
    category: 'Mobilitate Urbană',
    period: {
      startDate: '2026-11-01T08:00:00.000Z',
      endDate: '2026-12-15T20:00:00.000Z',
    },
    status: 'draft',
    isDemo: true,
    audit: {
      createdAt: '2026-09-20T14:30:00.000Z',
      updatedAt: '2026-09-20T14:30:00.000Z',
      createdBy: 'admin_demo',
    },
    questions: [
      {
        id: 'q-demo-201',
        text: 'Ce mijloc de transport utilizați cel mai frecvent pentru deplasarea în oraș?',
        type: 'single_choice',
        order: 1,
        isRequired: true,
        options: [
          { id: 'opt-201-a', text: 'Mersul pe jos', order: 1 },
          { id: 'opt-201-b', text: 'Bicicletă / Trotinetă', order: 2 },
          { id: 'opt-201-c', text: 'Autovehicul personal', order: 3 },
          { id: 'opt-201-d', text: 'Transport public / Microbuz', order: 4 },
        ],
      },
    ],
  },
  {
    id: 'srv-demo-003',
    title: '[DEMO] Consultare încheiată: Evaluarea activităților culturale de vară',
    description: 'Sondaj demonstrativ finalizat pentru verificarea stării de arhivare (closed). Nu mai acceptă voturi sau modificări.',
    category: 'Cultură & Timp Liber',
    period: {
      startDate: '2026-06-01T08:00:00.000Z',
      endDate: '2026-08-31T23:59:59.000Z',
    },
    status: 'closed',
    isDemo: true,
    audit: {
      createdAt: '2026-05-25T11:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
      createdBy: 'admin_demo',
    },
    questions: [
      {
        id: 'q-demo-301',
        text: 'Ați participat la evenimentele culturale organizate în perioada estivală?',
        type: 'single_choice',
        order: 1,
        isRequired: true,
        options: [
          { id: 'opt-301-a', text: 'Da, la mai multe evenimente', order: 1 },
          { id: 'opt-301-b', text: 'Da, la un singur eveniment', order: 2 },
          { id: 'opt-301-c', text: 'Nu am participat', order: 3 },
        ],
      },
    ],
  },
];
