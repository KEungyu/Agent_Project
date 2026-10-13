import { describe, expect, it, vi } from "vitest";
import { createRealMailer } from "./mailer";

const env = { RESEND_API_KEY: "test-key", MAIL_FROM: "team@example.test", MAIL_ALLOWLIST: "recipient@example.test" };
const mail = { to: "recipient@example.test", subject: "Test", body: "Test message", idempotencyKey: "request:approved-hash" };

describe("provider receipt validation (mock HTTP, no external email)", () => {
  it("returns the provider's nonempty receipt ID", async () => {
    const doFetch = vi.fn(async () => new Response(JSON.stringify({ id: "re_provider_receipt" }), { status: 200 }));
    const mailer = createRealMailer(env, doFetch);
    await expect(mailer.send(mail)).resolves.toEqual({ message_id: "re_provider_receipt", mode: "real" });
    expect(doFetch).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["malformed JSON", "{"],
    ["null", "null"],
    ["array", '[{"id":"re_nested"}]'],
    ["missing ID", "{}"],
    ["null ID", '{"id":null}'],
    ["numeric ID", '{"id":123}'],
    ["object ID", '{"id":{"value":"re_nested"}}'],
    ["empty ID", '{"id":""}'],
    ["whitespace ID", '{"id":"  "}'],
  ])("treats HTTP success with %s as unknown instead of inventing an accepted ID", async (_description, body) => {
    const doFetch = vi.fn(async () => new Response(body, { status: 200 }));
    const mailer = createRealMailer(env, doFetch);
    await expect(mailer.send(mail)).rejects.toMatchObject({ name: "MailError", code: "unknown" });
    expect(doFetch).toHaveBeenCalledTimes(1);
  });

  it("keeps a provider rejection distinct from an unconfirmed successful response", async () => {
    const mailer = createRealMailer(env, async () => new Response("{}", { status: 429 }));
    await expect(mailer.send(mail)).rejects.toMatchObject({ code: "rejected" });
  });
});
