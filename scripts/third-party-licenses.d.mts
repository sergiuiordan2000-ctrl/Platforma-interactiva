// Tipurile pentru scripts/third-party-licenses.mjs (folosit din vite.config.ts și din testele serverului).
export declare const EXTRA_DIR: string;
export declare const ACCEPTED_LICENSES: readonly string[];
export declare const EXTRA_SEPARATOR: string;
export declare class ThirdPartyLicenseError extends Error {}
export type ThirdPartyText = { source: string; header?: string; text: string };
export type ThirdPartyEntry = { id: string; name: string; version: string; license: string; texts: ThirdPartyText[] };
export declare function packageRootOf(file: string): string | null;
export declare function checkDeclaredLicense(id: string, license: unknown): string;
export declare function collectThirdPartyLicenses(files: string[], options?: { extraDir?: string }): ThirdPartyEntry[];
export declare function renderThirdPartyLicenses(entries: ThirdPartyEntry[], options: { title: string }): string;
