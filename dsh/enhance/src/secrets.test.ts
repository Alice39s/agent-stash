import { describe, expect, test } from "vitest";
import { maskSecrets, placeholder, redactSecrets, unmaskSecrets } from "./secrets.ts";

const KEY = "sk-abc123def456ghi789jkl012mno";
const TOKEN = "ghp_0123456789abcdefghijABCDEFGHIJ0123456789";

describe("secret masking", () => {
  test("replaces each credential in a draft with a numbered placeholder", () => {
    const masked = maskSecrets(`call it with ${KEY}, then push with ${TOKEN} and ${KEY} again`);
    expect(masked.text).toBe(
      `call it with ${placeholder(1)}, then push with ${placeholder(2)} and ${placeholder(1)} again`,
    );
    expect(masked.secrets).toEqual([KEY, TOKEN]);
  });

  test("restores the placeholders in a rewritten prompt", () => {
    const masked = maskSecrets(`use ${KEY}`);
    expect(unmaskSecrets(`Call the API with ${placeholder(1)}.`, masked.secrets)).toBe(
      `Call the API with ${KEY}.`,
    );
  });

  test("masks the password of an address but keeps the rest of it", () => {
    const masked = maskSecrets("clone https://alice:hunter2pass@git.example.com/repo.git");
    expect(masked.text).toBe(`clone https://alice:${placeholder(1)}@git.example.com/repo.git`);
  });

  test("leaves ordinary text and short identifiers alone", () => {
    const text = "rename sk-button to sk-primary in the task-list skill";
    expect(maskSecrets(text)).toEqual({ text, secrets: [] });
  });

  test("redacts credentials from session context without numbering them", () => {
    const jwt =
      "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U";
    expect(redactSecrets(`token ${jwt} and key AKIAIOSFODNN7EXAMPLE`)).toBe(
      "token [redacted] and key [redacted]",
    );
  });

  test("redacts a whole private key block", () => {
    const block =
      "-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXktdjEAAAAABG5vbmU\n-----END OPENSSH PRIVATE KEY-----";
    expect(redactSecrets(`key:\n${block}\ndone`)).toBe("key:\n[redacted]\ndone");
  });
});
