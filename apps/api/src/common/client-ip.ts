import type { FastifyRequest } from "fastify";

export function clientIp(request: Pick<FastifyRequest, "headers" | "ip">): string {
  const cloudflare = request.headers["cf-connecting-ip"];
  const forwarded = request.headers["x-forwarded-for"];
  const value = Array.isArray(cloudflare)
    ? cloudflare[0]
    : cloudflare || (Array.isArray(forwarded) ? forwarded[0] : forwarded);
  return value?.split(",")[0]?.trim() || request.ip;
}
