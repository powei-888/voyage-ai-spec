export interface ReceiptStorage {
  save(input: {
    tripId: string;
    receiptId: string;
    originalName: string;
    buffer: Buffer;
  }): Promise<string>;
  read(storageKey: string): Promise<Buffer>;
  remove(storageKey: string): Promise<void>;
}

export const RECEIPT_STORAGE = Symbol("RECEIPT_STORAGE");
