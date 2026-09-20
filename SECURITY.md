# Security and privacy

Do not post credentials or sensitive source in public issues. Use GitHub's private vulnerability reporting if enabled; otherwise contact the maintainer before sharing sensitive details.

- Code and documentation are treated as text, never executed. URLs in submitted content are not fetched.
- Public web requests require the visitor's OpenAI API key. There is no owner-key fallback.
- The browser holds the key in React memory. Refreshing, closing the tab, or Disconnect removes the app's reference. There is no localStorage, sessionStorage, history database, or analytics integration.
- The web server forwards source and the key to OpenAI. Application code does not persist or log them. Hosting infrastructure and OpenAI have their own policies; `store: false` is not a promise of zero provider retention.
- Requests are limited to 12,000 source characters, a 60 KB request body, 3,600 output tokens, and a 60-second provider timeout. Cancellation is best effort and does not guarantee reversal of API charges.
- Common API-key and private-key patterns are rejected. This is a limited check, not a comprehensive secret scanner: remove sensitive data yourself.
- AI output is rendered as text. Explanations can be incorrect or omit important context. Validate against code and official documentation.
- MCP uses stdio and a local environment key. It has no shell, file-reading, code execution, or URL-fetching tool. The optional CLI reads only the file explicitly supplied by the user.

If a key is exposed, revoke it in OpenAI Platform and create a replacement. Never commit `.env.local` or use a browser-exposed environment variable for an operator key.
