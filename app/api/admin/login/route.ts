import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LoginSchema = z.object({
  token: z.string().min(1).max(512),
});

const COOKIE_NAME = "admin_token";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 días

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function POST(req: Request) {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) {
    return NextResponse.json({ error: "Admin no configurado" }, { status: 503 });
  }

  let payload: z.infer<typeof LoginSchema>;
  try {
    payload = LoginSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  if (!safeEqual(payload.token, expected)) {
    return NextResponse.json({ error: "Token incorrecto" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, payload.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}
