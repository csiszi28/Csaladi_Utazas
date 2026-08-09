import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { deletePushSubscription, savePushSubscription } from "@/lib/web-push";

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  userAgent: z.string().max(512).nullable().optional(),
});

const unsubscribeSchema = z.object({
  endpoint: z.string().url().nullable().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const json: unknown = await request.json();
    const parsed = subscribeSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Érvénytelen feliratkozás" }, { status: 400 });
    }

    const ok = await savePushSubscription({
      userId: user.id,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
      userAgent: parsed.data.userAgent ?? null,
    });

    if (!ok) {
      return NextResponse.json({ error: "Nem sikerült menteni" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Nincs bejelentkezés" }, { status: 401 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireUser();
    let endpoint: string | undefined;
    try {
      const json: unknown = await request.json();
      const parsed = unsubscribeSchema.safeParse(json);
      if (parsed.success && parsed.data.endpoint) {
        endpoint = parsed.data.endpoint;
      }
    } catch {
      /* body opcionális */
    }

    await deletePushSubscription(user.id, endpoint);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Nincs bejelentkezés" }, { status: 401 });
  }
}
