import type { Instrumentation } from "next";

/**
 * Szerveroldali hibák egységes, kereshető naplózása (Vercel Logs).
 * Külső hibafigyelő (pl. Sentry) bekötése ide kerülhet: a `err` és a `request` itt mind elérhető.
 */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const error = err as Error & { digest?: string };
  console.error(
    JSON.stringify({
      level: "error",
      source: "onRequestError",
      message: error.message,
      digest: error.digest,
      path: request.path,
      method: request.method,
      routeType: context.routeType,
      routePath: context.routePath,
    })
  );
};
