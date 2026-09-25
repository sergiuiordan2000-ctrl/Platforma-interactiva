/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReportCategory } from '../types/report';

export const DEMO_REPORT_CATEGORIES: ReportCategory[] = [
  {
    id: 'iluminat',
    name: 'Iluminat public',
    description: 'Lămpi arse pe stâlpi, cabluri neizolate, zone întunecate sau avarii ale rețelei de iluminat.',
    iconName: 'Lightbulb',
  },
  {
    id: 'drumuri',
    name: 'Drumuri / carosabil',
    description: 'Gropi în asfalt, tasări periculoase, capace de canalizare avariate sau lipsă.',
    iconName: 'Car',
  },
  {
    id: 'trotuare',
    name: 'Trotuare & alei',
    description: 'Dale dislocate, obstacole pietonale, borduri sparte sau acces blocat pentru pietoni.',
    iconName: 'Footprints',
  },
  {
    id: 'apa_canal',
    name: 'Apă / canalizare',
    description: 'Scurgeri de apă pe carosabil, conducte avariate, refulări sau guri de scurgere înfundate.',
    iconName: 'Droplets',
  },
  {
    id: 'salubritate',
    name: 'Salubritate & deșeuri',
    description: 'Puncte de colectare necurățate, resturi vegetale neridicate, depozitări clandestine de gunoi.',
    iconName: 'Trash2',
  },
  {
    id: 'spatii_verzi',
    name: 'Spații verzi & parcuri',
    description: 'Crengi uscate periculoase, arbori căzuți, iarbă netunsă sau bănci deteriorate în parcuri.',
    iconName: 'Trees',
  },
  {
    id: 'semnalizare',
    name: 'Semnalizare rutieră',
    description: 'Indicatoare rutiere lipsă sau deteriorate, semafoare nefuncționale, treceri de pietoni șterse.',
    iconName: 'Signpost',
  },
  {
    id: 'altele',
    name: 'Alte probleme urbane',
    description: 'Alte situații ce afectează siguranța sau confortul locuitorilor din municipiu.',
    iconName: 'HelpCircle',
  },
];
