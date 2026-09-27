/**security.txt — signalement de vulnérabilités (RFC 9116). */
export function GET() {
  const contact = process.env.SECURITY_CONTACT ?? "discord.gg/gratianopolis";
  const expires = new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10);

  const body = [
    "Contact: mailto:" + (process.env.SECURITY_EMAIL ?? "securite@example.org"),
    "Contact: " + contact,
    "Expires: " + expires,
    "Preferred-Languages: fr, en",
    "Canonical: /.well-known/security.txt",
    "Policy: /admin (règles d'accès) — toute tentative doit rester lisible et non destructive.",
  ].join("\n");

  return new Response(body + "\n", {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
