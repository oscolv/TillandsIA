import { NextResponse, type NextRequest } from "next/server";

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};

const PUBLIC_PATHS = new Set(["/admin/login", "/api/admin/login"]);

/**
 * Comparación constante en tiempo para evitar timing attacks contra ADMIN_TOKEN.
 * Devuelve `false` ante longitudes distintas o cualquier discrepancia.
 */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const expected = process.env.ADMIN_TOKEN;
  const isApi = pathname.startsWith("/api/");

  // Si no hay token configurado en el server, todo el área admin queda cerrada.
  if (!expected) {
    return isApi
      ? NextResponse.json({ error: "Admin no configurado" }, { status: 503 })
      : new NextResponse(
          "Admin deshabilitado: configura ADMIN_TOKEN en el servidor.",
          { status: 503 },
        );
  }

  const cookie = req.cookies.get("admin_token")?.value;
  if (!cookie || !safeEqual(cookie, expected)) {
    if (isApi) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const loginUrl = new URL("/admin/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}
