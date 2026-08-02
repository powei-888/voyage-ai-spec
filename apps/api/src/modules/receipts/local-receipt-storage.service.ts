import { Injectable } from "@nestjs/common";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { DomainError } from "../../common/domain-error";
import { ReceiptStorage } from "./receipt-storage";

@Injectable()
export class LocalReceiptStorageService implements ReceiptStorage {
  private readonly root = resolve(process.env.UPLOAD_DIR || "uploads");

  async save(input: {
    tripId: string;
    receiptId: string;
    originalName: string;
    buffer: Buffer;
  }): Promise<string> {
    const extension = this.safeExtension(input.originalName);
    const key = `receipts/${input.tripId}/${input.receiptId}${extension}`;
    const path = this.resolveKey(key);
    await mkdir(resolve(path, ".."), { recursive: true });
    await writeFile(path, input.buffer, { flag: "wx" });
    return `local://${key}`;
  }

  async read(storageKey: string): Promise<Buffer> {
    return readFile(this.resolveStorageKey(storageKey));
  }

  async remove(storageKey: string): Promise<void> {
    await rm(this.resolveStorageKey(storageKey), { force: true });
  }

  private resolveStorageKey(storageKey: string): string {
    if (!storageKey.startsWith("local://")) {
      throw new DomainError("INVALID_STORAGE_KEY", "Receipt storage key is invalid.");
    }
    return this.resolveKey(storageKey.slice("local://".length));
  }

  private resolveKey(key: string): string {
    const path = resolve(this.root, key);
    if (path !== this.root && !path.startsWith(`${this.root}${sep}`)) {
      throw new DomainError("INVALID_STORAGE_KEY", "Receipt storage key is invalid.");
    }
    return path;
  }

  private safeExtension(name: string): string {
    const extension = extname(name).toLowerCase();
    return /^\.[a-z0-9]{1,8}$/.test(extension) ? extension : ".bin";
  }
}
