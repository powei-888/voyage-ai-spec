import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("verifies the original password", async () => {
    const encoded = await hashPassword("correct-horse-42");
    await expect(verifyPassword("correct-horse-42", encoded)).resolves.toBe(true);
  });

  it("rejects a different password", async () => {
    const encoded = await hashPassword("correct-horse-42");
    await expect(verifyPassword("wrong-password", encoded)).resolves.toBe(false);
  });

  it("rejects malformed hashes", async () => {
    await expect(verifyPassword("anything", "not-a-hash")).resolves.toBe(false);
  });
});
