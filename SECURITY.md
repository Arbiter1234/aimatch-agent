# Security and privacy

This is a single-user prototype, not a multi-tenant recruitment service.

- Keep `PUBLIC_SHOWCASE_MODE=true` on a public portfolio deployment. Private APIs fail closed in this mode.
- Use the private lab on loopback (`127.0.0.1`) or behind an authenticated, HTTPS-only private gateway. Do not expose the development server to the Internet.
- `AIMATCH_ACCESS_TOKEN` is a separate, high-entropy lab password. It is not your model API key. The browser holds it only in component memory.
- Never commit `.env.local`, `.dev.vars`, API keys, real resumes, local databases, logs, or evaluation outputs. Rotate exposed keys immediately through their provider.
- The application does not persist raw resumes, PDFs, JDs or full analysis reports. Knowledge text, vectors and preferences are persisted; session summaries are persisted only when explicitly selected. These summaries may still contain personal information derived by the model.
- `store: false` is sent to the Responses API. It does not by itself guarantee that the provider retains no data. Review your provider's data policies and your organization's requirements before sending real material.
- RAG context and past model summaries are treated as untrusted. Citation ID validation proves only that a retrieved chunk exists, not that every associated claim is correct. Human review is required.
- SQLite/D1 storage is not application-level encrypted. Local deletion does not promise secure erasure or removal from provider backups.
- There is no built-in rate limiter, per-user billing, tenant login, or durable LangGraph checkpoint recovery. All access-token holders share one owner namespace.

Do not put credentials or private resumes into public issues. For a vulnerability, use GitHub private vulnerability reporting if the repository enables it; otherwise contact the maintainer through a private channel without posting exploit data publicly.
