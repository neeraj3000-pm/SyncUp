// Server Actions return errors as values instead of throwing, so a failure
// reaches the client as a friendly message rather than a generic crash.
export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };
