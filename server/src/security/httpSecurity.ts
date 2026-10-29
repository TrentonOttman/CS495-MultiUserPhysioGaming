import type { Application, Request, Response as ExpressResponse, NextFunction } from "express";

const JOIN_CODE_WINDOW_MS = 60_000;
const JOIN_CODE_MAX_REQUESTS = 10;
const joinCodeRequests = new Map<string, { count: number; resetAt: number }>();

/** Apply baseline response headers and throttle join-code enumeration by client IP. */
export function installHttpSecurity(app: Application): void {
    // Cloud Run terminates TLS at its proxy and forwards the client address.
    // Trust only the single proxy hop in front of this service.
    app.set("trust proxy", 1);

    app.use((_req: Request, res: ExpressResponse, next: NextFunction) => {
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("X-Frame-Options", "DENY");
        res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
        res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
        if (process.env.NODE_ENV === "production") {
            res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
        }
        next();
    });

}

/**
 * Colyseus routes registered with createRouter bypass Express middleware.
 * Call this from the join-code endpoint itself so the limit also runs in the
 * production router path. Returns a ready 429 response when the bucket is full.
 */
export function checkJoinCodeRateLimit(request: globalThis.Request): globalThis.Response | null {
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ip = forwardedFor?.split(",")[0]?.trim() || "unknown";
    const now = Date.now();
    let bucket = joinCodeRequests.get(ip);

    if (!bucket || bucket.resetAt <= now) {
        bucket = { count: 0, resetAt: now + JOIN_CODE_WINDOW_MS };
        joinCodeRequests.set(ip, bucket);
    }

    if (bucket.count >= JOIN_CODE_MAX_REQUESTS) {
        return Response.json(
            { error: "Too many join-code attempts. Try again shortly." },
            {
                status: 429,
                headers: { "Retry-After": String(Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))) },
            },
        );
    }

    bucket.count++;
    if (joinCodeRequests.size > 1000) {
        for (const [key, entry] of joinCodeRequests) {
            if (entry.resetAt <= now) { joinCodeRequests.delete(key); }
        }
    }
    return null;
}
