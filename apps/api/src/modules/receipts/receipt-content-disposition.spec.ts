import { inlineReceiptContentDisposition } from "./receipt-content-disposition";

describe("inlineReceiptContentDisposition", () => {
  it("keeps the header ASCII-safe while preserving a Unicode filename", () => {
    const header = inlineReceiptContentDisposition("圖：電子發票證明聯.jpg");

    expect(header).toBe(
      "inline; filename=\"receipt.jpg\"; filename*=UTF-8''%E5%9C%96%EF%BC%9A%E9%9B%BB%E5%AD%90%E7%99%BC%E7%A5%A8%E8%AD%89%E6%98%8E%E8%81%AF.jpg"
    );
    expect([...header].every((character) => character.charCodeAt(0) < 128)).toBe(true);
  });

  it("removes control characters and avoids unsafe fallback extensions", () => {
    expect(inlineReceiptContentDisposition("bad\r\nname.longextension"))
      .toBe("inline; filename=\"receipt\"; filename*=UTF-8''badname.longextension");
  });
});
