import { VOYAGE_APP_NAME } from "@voyage/shared";

export function getBootstrapSections() {
  return [
    {
      title: "Web",
      body: "Next.js app shell for future trip workspace screens."
    },
    {
      title: "API",
      body: "NestJS service boundary with a health check under /api/health."
    },
    {
      title: "Shared",
      body: `Shared TypeScript types for ${VOYAGE_APP_NAME} clients and services.`
    }
  ];
}
