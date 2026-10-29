import { describe, expect, test } from "vitest";
import { redact } from "./redact.ts";

describe("redact", () => {
  test.each([
    ["export SECRET_KEY=abcdef1234567890abcdef", "export SECRET_KEY=[redacted]"],
    ["mytool --password hunter2hunter2 --verbose", "mytool --password [redacted] --verbose"],
    ['deploy --api-key "k3y with spaces"', "deploy --api-key [redacted]"],
    ["mysql -u root -pSuperSecret123 app", "mysql -u root -p[redacted] app"],
    [
      "npm config set //registry.npmjs.org/:_authToken=abcdef1234567890",
      "npm config set //registry.npmjs.org/:_authToken=[redacted]",
    ],
    ["Authorization: Token abcdef1234567890", "Authorization: Token [redacted]"],
    [
      "curl -H 'Authorization: Bearer abcdefghijklmnop'",
      "curl -H 'Authorization: Bearer [redacted]'",
    ],
    ['password="correct horse battery staple"', 'password="[redacted]"'],
    ['{"client_secret": "s3cr3t value"}', '{"client_secret": "[redacted]"}'],
    [
      "git clone https://bot:pa55word@git.example.com/a.git",
      "git clone https://[redacted]@git.example.com/a.git",
    ],
    [
      "kubectl --token ghp_abcdefghijklmnopqrstuvwxyz0123456789ab get pods",
      "kubectl --token [redacted] get pods",
    ],
    [
      "curl -u admin:hunter2hunter2 https://x.example",
      "curl -u admin:[redacted] https://x.example",
    ],
    ["curl --user admin:hunter2hunter2 https://x", "curl --user admin:[redacted] https://x"],
    ["docker login -u me -p hunter2hunter2 ghcr.io", "docker login -u me -p [redacted] ghcr.io"],
    [
      "aws configure set aws_secret_access_key wJalrXUtnFEMIK7MDENGbPxRfiCYEXAMPLEKEY",
      "aws configure set aws_secret_access_key [redacted]",
    ],
    [
      "echo dckr_pat_abcdef123456 | docker login -u me --password-stdin",
      "echo [redacted] | docker login -u me --password-stdin",
    ],
    [
      'wrangler secret put API_TOKEN <<< "abcdef123456"',
      "wrangler secret put API_TOKEN <<< [redacted]",
    ],
    [
      "curl -H 'Cookie: session=0123456789abcdef0123456789abcdef' https://x.example",
      "curl -H 'Cookie: [redacted]' https://x.example",
    ],
  ])("replaces the credential in %s", (input, output) => {
    expect(redact(input)).toBe(output);
  });

  test.each([
    "git log --author Alice --since 2026-10-01",
    "max_tokens=4096 temperature=0.2",
    "pnpm --filter @agent-stash/dsh-skill-scout run bundle",
    "mysql -u root -p app",
    "git push -u origin main",
    "docker login -u me ghcr.io",
    "git config --global core.editor vim",
  ])("keeps ordinary command text: %s", (input) => {
    expect(redact(input)).toBe(input);
  });

  test("hides the user name in home paths and email addresses", () => {
    expect(redact("cd /Users/alice/code && git config user.email alice@example.com")).toBe(
      "cd ~/code && git config user.email [email]",
    );
  });
});
