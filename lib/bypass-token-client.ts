/**
 * Cliente: si el usuario configuró un bypass token vía `/setup-token?token=X`,
 * está guardado en `localStorage` bajo esta clave y se inyecta como header
 * `x-bypass-token` en cada POST que haga rate-limit checks.
 *
 * Sin token guardado, devuelve un objeto vacío y la request va al tier normal.
 */
export const BYPASS_TOKEN_STORAGE_KEY = "tillandsia_bypass_token";

export function getBypassTokenHeader(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const t = window.localStorage.getItem(BYPASS_TOKEN_STORAGE_KEY);
    return t ? { "x-bypass-token": t } : {};
  } catch {
    return {};
  }
}
