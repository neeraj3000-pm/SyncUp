// Short, human-readable session codes (PRD section 42). Excludes characters
// that are easy to misread or mishear when read aloud: O/0, I/1, S/5.
const ALPHABET = "ABCDEFGHJKLMNPQRTUVWXYZ234679";
const CODE_LENGTH = 5;

export function generateSessionCode(): string {
  const bytes = crypto.getRandomValues(new Uint32Array(CODE_LENGTH));
  return Array.from(bytes, (n) => ALPHABET[n % ALPHABET.length]).join("");
}
