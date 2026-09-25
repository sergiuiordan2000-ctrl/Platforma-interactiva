/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CityHallInfo } from '../types/directory';

export const INITIAL_DEMO_CITY_HALL_INFO: CityHallInfo = {
  institutionName: 'Primăria Municipiului Turnu Măgurele',
  shortName: 'Primăria Turnu Măgurele',
  county: 'Județul Teleorman',
  address: 'Str. Republicii nr. 2, Turnu Măgurele, jud. Teleorman',
  postalCode: '145200',
  primaryPhone: '0247 416 410',
  secondaryPhone: '0247 416 411',
  fax: '0247 416 415',
  primaryEmail: 'primaria@turnumagurele.ro',
  registryEmail: 'registratura@turnumagurele.ro',
  websiteUrl: 'https://turnumagurele.ro',
  isDemo: true,

  schedule: [
    {
      day: 'Luni – Joi',
      hours: '08:00 – 16:30',
      note: 'Program cu publicul la ghișee: 08:30 – 14:00',
    },
    {
      day: 'Vineri',
      hours: '08:00 – 14:00',
      note: 'Program cu publicul la ghișee: 08:30 – 12:30',
    },
    {
      day: 'Sâmbătă – Duminică',
      hours: 'Închis',
      note: 'Serviciul de Stare Civilă asigură permanență pentru decese',
    },
  ],

  audienceSchedule: [
    {
      role: 'Primar',
      schedule: 'Marți: 10:00 – 12:00',
      registrationNote: 'Înscriere prealabilă la Registratura Generală în baza unei cereri scrise.',
    },
    {
      role: 'Viceprimar',
      schedule: 'Miercuri: 10:00 – 12:00',
      registrationNote: 'Înscriere în săptămâna premergătoare audienței.',
    },
    {
      role: 'Secretar General',
      schedule: 'Joi: 11:00 – 13:00',
      registrationNote: 'Audiențe pe probleme de fond funciar și legalitate.',
    },
  ],

  departments: [
    {
      id: 'dep-taxe',
      name: 'Direcția Impozite și Taxe Locale',
      description: 'Gestiunea evidenței fiscale a persoanelor fizice și juridice, încasarea taxelor, impozitelor și a amenzilor contravenționale.',
      location: 'Sediul Central, Parter, Ghișeele 1 – 4',
      phone: '0247 416 412',
      email: 'taxe@turnumagurele.ro',
      schedule: 'Luni – Joi: 08:30 – 14:00 | Vineri: 08:30 – 12:30',
      headOfDepartment: 'Director Executiv DITL',
    },
    {
      id: 'dep-urbanism',
      name: 'Direcția Urbanism și Amenajarea Teritoriului',
      description: 'Emiterea certificatelor de urbanism, a autorizațiilor de construire/desființare, avizarea documentațiilor PUG, PUZ, PUD și controlul disciplinei în construcții.',
      location: 'Sediul Central, Etajul 1, Cam. 12',
      phone: '0247 416 414',
      email: 'urbanism@turnumagurele.ro',
      schedule: 'Marți și Joi: 09:00 – 13:00 (Depunere / Eliberare documentații)',
      headOfDepartment: 'Arhitect-Șef Municipiul Turnu Măgurele',
    },
    {
      id: 'dep-stare-civila',
      name: 'Serviciul Public Comunitar Local de Evidență a Persoanelor (SPCLEP)',
      description: 'Înregistrarea actelor de naștere, căsătorie, deces, emiterea cărților de identitate și actualizarea Registrului Național de Evidență a Persoanelor.',
      location: 'Str. Mihai Eminescu nr. 1, Corp Anexă',
      phone: '0247 416 420',
      email: 'evidentapersoanelor@turnumagurele.ro',
      schedule: 'Luni, Marți, Joi: 08:30 – 15:30 | Miercuri: 08:30 – 18:00 | Vineri: 08:30 – 13:00',
      headOfDepartment: 'Șef Serviciu SPCLEP',
    },
    {
      id: 'dep-asistenta',
      name: 'Direcția de Asistență Socială (DAS)',
      description: 'Sprijin și protecție socială pentru persoanele vârstnice, copii aflați în dificultate, persoane cu dizabilități și acordarea ajutoarelor pentru încălzirea locuinței.',
      location: 'Str. 1 Decembrie nr. 6',
      phone: '0247 416 430',
      email: 'asistenta.sociala@turnumagurele.ro',
      schedule: 'Luni – Vineri: 08:30 – 14:00',
      headOfDepartment: 'Director General DAS',
    },
  ],

  services: [
    {
      id: 'srv-cert-fiscal',
      title: 'Eliberare Certificat de Atestare Fiscală',
      departmentId: 'dep-taxe',
      departmentName: 'Direcția Impozite și Taxe Locale',
      description: 'Document eliberat la cerere pentru persoane fizice sau juridice, necesar la vânzarea bunurilor, succesiuni sau obținerea de credite.',
      documentsRequired: [
        'Cerere tip completată (disponibilă la ghișeu sau online)',
        'Act de identitate titular (în original și copie)',
        'Împuternicire notarială (dacă cererea este depusă prin mandatar)',
        'Dovada achitării la zi a obligațiilor restante',
      ],
      processingTime: 'Maxim 2 zile lucrătoare (în regim normal) sau pe loc (dacă nu există debite restante)',
      fee: 'Gratuit',
      onlineLink: 'https://ghiseul.ro',
    },
    {
      id: 'srv-cert-urbanism',
      title: 'Certificat de Urbanism și Autorizație de Construire',
      departmentId: 'dep-urbanism',
      departmentName: 'Direcția Urbanism',
      description: 'Act administrativ prin care se fac cunoscute solicitantului cerințele urbanistice specifice amplasamentului și actele necesare pentru autorizare.',
      documentsRequired: [
        'Cerere-tip pentru emiterea certificatului de urbanism',
        'Plan de încadrare în zonă (scara 1:5000 / 1:2000) și plan de situație (scara 1:500)',
        'Extras de carte funciară actualizat (maxim 30 de zile)',
        'Dovada achitării taxei de emitere',
      ],
      processingTime: 'Maxim 15 – 30 de zile calendaristice',
      fee: 'Calculată în funcție de suprafața terenului/construcției',
    },
    {
      id: 'srv-carte-identitate',
      title: 'Eliberare Act de Identitate (Buletin)',
      departmentId: 'dep-stare-civila',
      departmentName: 'SPCLEP Turnu Măgurele',
      description: 'Preschimbarea cărții de identitate la expirare, schimbare de domiciliu, împlinirea vârstei de 14 ani sau pierdere/furt.',
      documentsRequired: [
        'Cerere pentru eliberarea actului de identitate',
        'Certificat de naștere (original și copie)',
        'Actul de spațiu / dovada adresei de domiciliu (original și copie)',
        'Chitanța reprezentând contravaloarea cărții de identitate (7 lei)',
      ],
      processingTime: '5 – 7 zile lucrătoare',
      fee: '7 lei (taxa tipărire buletin)',
    },
    {
      id: 'srv-inscriere-audiente',
      title: 'Înscriere în Audiență la Conducerea Primăriei',
      departmentId: 'dep-generala',
      departmentName: 'Registratura Generală',
      description: 'Înregistrarea solicitărilor cetățenilor pentru discuții directe cu Primarul, Viceprimarul sau Secretarul General.',
      documentsRequired: [
        'Cerere tip în care se menționează succint problema sesizată',
        'Copii ale documentelor justificative (răspunsuri anterioare primite de la direcții)',
        'Date de contact telefonice și e-mail pentru confirmare',
      ],
      processingTime: 'Confirmarea programării se transmite în 3 – 5 zile',
      fee: 'Gratuit',
    },
    {
      id: 'srv-ajutor-incalzire',
      title: 'Dosar Sprijin pentru Încălzirea Locuinței',
      departmentId: 'dep-asistenta',
      departmentName: 'Direcția de Asistență Socială',
      description: 'Acordarea suplimentului pentru energie și a ajutorului de încălzire pentru sezonul rece conform legii consumatorului vulnerabil.',
      documentsRequired: [
        'Cerere și declarație pe propria răspundere',
        'Adeverințe de venit net din luna anterioară pentru toți membrii familiei',
        'Factura recentă de energie electrică / gaze naturale / lemne',
        'Copii după actele de identitate ale membrilor gospodăriei',
      ],
      processingTime: 'Conform calendarului campaniei anuale de toamnă',
      fee: 'Gratuit',
    },
  ],

  usefulLinks: [
    {
      id: 'link-ghiseul',
      title: 'Ghișeul.ro — Plată Taxe Online Turnu Măgurele',
      description: 'Platforma națională oficială pentru plata fără comision a impozitelor locale, amenzilor și taxelor de parcare.',
      url: 'https://www.ghiseul.ro',
      category: 'Plăți & Taxe',
      isExternal: true,
    },
    {
      id: 'link-portal-servicii',
      title: 'Portal Servicii Electronice Cetățeni',
      description: 'Depunere cereri tipizate, urmărire stadiu documente și descărcare certificate în format digital.',
      url: 'https://turnumagurele.ro',
      category: 'Servicii Digitale',
      isExternal: true,
    },
    {
      id: 'link-monitor-oficial',
      title: 'Monitorul Oficial Local Turnu Măgurele',
      description: 'Consultarea proiectelor de hotărâre ale Consiliului Local, dispozițiile primarului și transparența bugetară.',
      url: 'https://turnumagurele.ro',
      category: 'Transparență Decizională',
      isExternal: true,
    },
    {
      id: 'link-anaf',
      title: 'ANAF — Spațiul Privat Virtual (SPV)',
      description: 'Serviciul electronic prin care contribuabilii comunică securizat cu Agenția Națională de Administrare Fiscală.',
      url: 'https://www.anaf.ro',
      category: 'Instituții Partenere',
      isExternal: true,
    },
  ],
};
