# security

| Guide | Description | Tokens | Gate |
| --- | --- | --- | --- |
| [client-side-encryption](client-side-encryption.md) | Establish shared secrets using public-key encapsulation or key agreement—including hybrid and post-quantum protection—and encrypt sensitive data in the browser with authenticated encryption. | 3815 | Volatile (tmp-webcrypto-modern-algos) |
| [digital-signatures](digital-signatures.md) | Sign and verify messages, tokens, or artifacts in the browser using classical or quantum-resistant (post-quantum) asymmetric keys to ensure data integrity and authenticity. | 2617 | Volatile (tmp-webcrypto-modern-algos) |
| [local-network-access](local-network-access.md) | Access resources on a user's local network or loopback interface from a public web application. | 3078 | - |
| [passkey-authentication](passkey-authentication.md) | Authenticate a returning user with a passkey for primary sign-in. | 2420 | - |
| [passkey-conditional-create](passkey-conditional-create.md) | Silently register a passkey for an existing user after a successful password login. | 1651 | - |
| [passkey-management](passkey-management.md) | Let users view and manage the passkeys registered to their account. | 3839 | - |
| [passkey-reauthentication](passkey-reauthentication.md) | Verify a signed-in user's identity using their existing passkeys before a sensitive action. | 1370 | - |
| [passkey-registration](passkey-registration.md) | Register a passkey for an existing user account. | 2189 | - |
| [passkeys](passkeys.md) | Comprehensive orientation and cross-cutting principles for implementing WebAuthn and Passkeys in web applications. Use this guide when handling passkey registration, authentication, management, or reauthentication. | 1096 | - |
| [quick-sign-ins](quick-sign-ins.md) | Authenticate returning users in place with their saved passkeys or passwords before navigating to a sign-in page or interrupting their workflow. | 3878 | - |
| [restrict-outbound-connections](restrict-outbound-connections.md) | Restrict a page or worker to communicating only with an explicit allowlist of network endpoints to prevent unauthorized third-party requests and client-side data exfiltration. | 3580 | Volatile (connection-allowlists) |
| [sanitize-untrusted-html](sanitize-untrusted-html.md) | Safely parse and display untrusted HTML content from user input by removing unsafe elements and attributes. | 1314 | - |
| [secure-external-subresources](secure-external-subresources.md) | Verify the cryptographic integrity of external scripts, stylesheets, fonts, and images loaded from third-party origins, and control whether those requests send credentials or referrer URLs. | 3905 | - |
| [security](security.md) | Preventative security guidelines for web developers (XSS, CSP, Cookies, Cross-Origin Isolation). Use this skill to guide the process of auditing, testing, and deploying security policies safely. | 7408 | - |
| [trusted-types](trusted-types.md) | Prevent DOM-based XSS attacks by defining a Trusted Types policy to sanitize untrusted HTML, using the policy when writing to DOM sinks like innerHTML, and enforcing Trusted Types via Content Security Policy. | 1795 | - |
| [validate-origins](validate-origins.md) | Compare and validate web origins and sites safely across cross-document messages and URLs without error-prone string parsing. | 3243 | - |
| [verify-email-ownership](verify-email-ownership.md) | Verify that a user owns an email address during account creation, sign-in, or recovery without sending a one-time passcode or magic link email. | 3671 | Origin Trial (tmp-email-verification) |
