// Identificatori ULID (B1 §1), monotoni: două ID-uri generate în aceeași milisecundă păstrează ordinea.

import { monotonicFactory } from 'ulid';

const factory = monotonicFactory();

export const newId = (now: Date): string => factory(now.getTime());
