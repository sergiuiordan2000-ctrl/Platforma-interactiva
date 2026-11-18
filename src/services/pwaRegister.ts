// Lotul PWA (propunerea r2): înregistrarea service worker-ului (public/sw.js), NUMAI în construcția de producție
// și numai dacă browserul îl suportă. În dezvoltare nu se înregistrează nimic (fără cache-uri rămase în browser).

type SwContainer = { register: (url: string, opts: { scope: string }) => Promise<unknown> };
type NavigatorLike = { serviceWorker?: SwContainer };

/** Se înregistrează? Pur, pentru teste: numai în producție și numai cu suport în browser. */
export function shouldRegisterServiceWorker(isProduction: boolean, nav: NavigatorLike | undefined): boolean {
  return isProduction && !!nav && !!nav.serviceWorker;
}

/** Înregistrarea, după încărcarea paginii (nu întârzie afișarea). O eroare nu afectează aplicația. */
export function registerServiceWorker(isProduction: boolean): void {
  // globalThis, nu window: fișierul e verificat și de tsconfig-ul serverului (testul API îl importă)
  const g = globalThis as unknown as { navigator?: NavigatorLike; addEventListener?: (t: string, f: () => void) => void };
  const nav = g.navigator;
  if (!shouldRegisterServiceWorker(isProduction, nav) || !g.addEventListener) return;
  g.addEventListener('load', () => {
    nav!.serviceWorker!.register('/sw.js', { scope: '/' }).catch(() => undefined);
  });
}
