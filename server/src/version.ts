// Versiunea aplicației: injectată de build (esbuild `define`), „dev” la rularea din sursă.
declare const __APP_VERSION__: string | undefined;

export const APP_VERSION: string =
  typeof __APP_VERSION__ === 'string' && __APP_VERSION__ !== '' ? __APP_VERSION__ : 'dev';
