import { extname } from "node:path";

export function inlineReceiptContentDisposition(originalName: string): string {
  const cleanName = originalName.replace(/[\u0000-\u001f\u007f]/g, "").trim() || "receipt";
  const extension = extname(cleanName).toLowerCase();
  const safeExtension = /^\.[a-z0-9]{1,8}$/.test(extension) ? extension : "";
  const encodedName = encodeURIComponent(cleanName).replace(
    /[!'()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`
  );

  return `inline; filename="receipt${safeExtension}"; filename*=UTF-8''${encodedName}`;
}
