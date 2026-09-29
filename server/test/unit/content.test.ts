import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  announcementCreateRequest,
  announcementUpdateRequest,
  departmentCreateRequest,
  institutionUpdateRequest,
  linkCreateRequest,
  orderRequest,
  quickDialContactCreateRequest,
  serviceCreateRequest,
} from '@tmc/shared';

const ID = '01M3JMZC00Y9CTNMQ1MBDR40WX';
const base = {
  type: 'news' as const,
  title: 'Titlu',
  summary: 'Rezumat',
  content: 'Conținut',
  author: 'Primăria',
  category: 'Administrație',
};

describe('schemele conținutului public (5.3.1)', () => {
  it('comunicat: minim valid; câmp necunoscut respins (strict)', () => {
    assert.ok(announcementCreateRequest.safeParse(base).success);
    assert.equal(announcementCreateRequest.safeParse({ ...base, id: ID }).success, false);
    assert.equal(announcementCreateRequest.safeParse({ ...base, publishedAt: '2026-01-01T00:00:00Z' }).success, false);
  });
  it('comunicat: eveniment fără dată respins; cu dată și oră valide acceptat', () => {
    assert.equal(announcementCreateRequest.safeParse({ ...base, type: 'event' }).success, false);
    assert.ok(announcementCreateRequest.safeParse({ ...base, type: 'event', eventDate: '2026-10-10', eventTime: '17:30' }).success);
    assert.equal(announcementCreateRequest.safeParse({ ...base, type: 'event', eventDate: '10.10.2026' }).success, false);
    assert.equal(announcementCreateRequest.safeParse({ ...base, type: 'event', eventDate: '2026-10-10', eventTime: '25:00' }).success, false);
  });
  it('comunicat: titlu gol sau prea lung respins; spațiile se elimină', () => {
    assert.equal(announcementCreateRequest.safeParse({ ...base, title: '   ' }).success, false);
    assert.equal(announcementCreateRequest.safeParse({ ...base, title: 'x'.repeat(201) }).success, false);
    const r = announcementCreateRequest.parse({ ...base, title: '  Titlu  ' });
    assert.equal(r.title, 'Titlu');
  });
  it('comunicat: imaginea numai ca cale locală (DN-19); URL extern respins', () => {
    assert.ok(announcementCreateRequest.safeParse({ ...base, imageUrl: '/images/comunicate/a.webp' }).success);
    assert.equal(announcementCreateRequest.safeParse({ ...base, imageUrl: 'https://images.unsplash.com/x.jpg' }).success, false);
    assert.equal(announcementCreateRequest.safeParse({ ...base, imageUrl: '/a b.jpg' }).success, false);
  });
  it('comunicat: PATCH gol respins; PATCH parțial acceptat', () => {
    assert.equal(announcementUpdateRequest.safeParse({}).success, false);
    assert.ok(announcementUpdateRequest.safeParse({ title: 'Nou' }).success);
    assert.ok(announcementUpdateRequest.safeParse({ status: 'draft' }).success);
    assert.equal(announcementUpdateRequest.safeParse({ status: 'deleted' }).success, false);
  });
  it('ghid: instituția, direcțiile, serviciile, linkurile', () => {
    assert.equal(institutionUpdateRequest.safeParse({}).success, false);
    assert.ok(institutionUpdateRequest.safeParse({ primaryPhone: '0247 416 290', verifiedSource: 'site oficial' }).success);
    assert.equal(institutionUpdateRequest.safeParse({ websiteUrl: 'javascript:alert(1)' }).success, false);
    assert.equal(institutionUpdateRequest.safeParse({ primaryPhone: 'abc' }).success, false);
    assert.ok(departmentCreateRequest.safeParse({ name: 'Direcție', description: 'Descriere' }).success);
    assert.equal(serviceCreateRequest.safeParse({ departmentId: 'x', title: 'S', description: 'D' }).success, false);
    assert.ok(serviceCreateRequest.safeParse({ departmentId: ID, title: 'S', description: 'D', documentsRequired: ['CI'] }).success);
    assert.equal(linkCreateRequest.safeParse({ title: 'L', description: 'D', url: 'https://x.ro', category: 'Altele' }).success, false);
    assert.ok(linkCreateRequest.safeParse({ title: 'L', description: 'D', url: 'https://x.ro', category: 'Plăți & Taxe' }).success);
  });
  it('apel rapid și ordonare', () => {
    const c = { categoryId: ID, name: 'Poliția Locală', phone: '0247 000 000', formattedPhone: '0247 000 000', availability: '24/7' };
    assert.ok(quickDialContactCreateRequest.safeParse(c).success);
    assert.equal(quickDialContactCreateRequest.safeParse({ ...c, phone: '' }).success, false);
    assert.equal(orderRequest.safeParse({ ids: [] }).success, false);
    assert.ok(orderRequest.safeParse({ ids: [ID] }).success);
  });
});
