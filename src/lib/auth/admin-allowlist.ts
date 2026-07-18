function getAdminAllowlist() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

/** True if email matches an allowlisted address or domain in ADMIN_EMAILS. */
export function isAdminEmailByEnv(email: string) {
  const allowlist = getAdminAllowlist();
  if (allowlist.length === 0) return false;

  const normalized = email.trim().toLowerCase();
  const at = normalized.lastIndexOf("@");
  if (at <= 0 || at === normalized.length - 1) return false;

  const domain = normalized.slice(at + 1);

  return allowlist.some((entry) => {
    if (entry.includes("@")) {
      return entry === normalized;
    }

    const entryDomain = entry.replace(/^@/, "");
    return domain === entryDomain;
  });
}
