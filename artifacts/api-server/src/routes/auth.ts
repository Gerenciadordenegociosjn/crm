import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { LoginBody } from "@workspace/api-zod";
import { sendMail } from "../lib/mailer";

const router: IRouter = Router();

const JWT_SECRET = process.env["SESSION_SECRET"] ?? "crm-dev-secret";

export function verifyToken(token: string): { userId: number; role: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: number; role: string };
  } catch {
    return null;
  }
}

export function requireAuth(req: any, res: any, next: any): void {
  const auth = req.headers["authorization"] as string | undefined;
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = auth.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }
  req.userId = payload.userId;
  req.userRole = payload.role;
  next();
}

export function requireAdmin(req: any, res: any, next: any): void {
  requireAuth(req, res, () => {
    if (req.userRole !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    next();
  });
}

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, parsed.data.email));

  if (!user || !user.active) {
    res.status(401).json({ error: "Credenciais inválidas" });
    return;
  }

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Credenciais inválidas" });
    return;
  }

  const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
      createdAt: user.createdAt,
    },
  });
});

router.get("/auth/me", requireAuth, async (req: any, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId));
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
    createdAt: user.createdAt,
  });
});

router.post("/auth/logout", requireAuth, async (_req, res): Promise<void> => {
  res.json({ success: true });
});

// ─── Forgot password ────────────────────────────────────────────────────────
router.post("/auth/forgot-password", async (req, res): Promise<void> => {
  const { email } = req.body ?? {};
  if (!email || typeof email !== "string") {
    res.status(400).json({ error: "E-mail obrigatório" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase().trim()));

  // Always respond 200 to avoid leaking which e-mails are registered
  if (!user || !user.active) {
    res.json({ success: true });
    return;
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db.update(usersTable)
    .set({ resetToken: hashedToken, resetTokenExpiresAt: expiresAt })
    .where(eq(usersTable.id, user.id));

  const appUrl = process.env["APP_URL"] ?? "https://mapey.com.br";
  const resetLink = `${appUrl}/reset-password?token=${rawToken}`;

  await sendMail({
    to: user.email,
    subject: "Redefinição de senha — Mapey CRM",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
        <img src="${appUrl}/logo.png" alt="Mapey" style="width:180px;margin-bottom:24px;" />
        <h2 style="margin:0 0 8px;color:#233b63;">Redefinição de senha</h2>
        <p style="color:#555;margin:0 0 24px;">
          Olá, <strong>${user.name}</strong>.<br/>
          Recebemos uma solicitação de redefinição de senha para sua conta no Mapey CRM.
        </p>
        <a href="${resetLink}"
           style="display:inline-block;padding:12px 28px;background:#233b63;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">
          Redefinir senha
        </a>
        <p style="color:#888;font-size:13px;margin-top:24px;">
          Este link expira em <strong>1 hora</strong>.<br/>
          Se você não solicitou a redefinição, ignore este e-mail.
        </p>
      </div>
    `,
  });

  res.json({ success: true });
});

// ─── Reset password ──────────────────────────────────────────────────────────
router.post("/auth/reset-password", async (req, res): Promise<void> => {
  const { token, password } = req.body ?? {};
  if (!token || !password || typeof token !== "string" || typeof password !== "string") {
    res.status(400).json({ error: "Token e nova senha são obrigatórios" });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: "A senha deve ter pelo menos 6 caracteres" });
    return;
  }

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const [user] = await db.select().from(usersTable).where(eq(usersTable.resetToken, hashedToken));

  if (!user || !user.resetTokenExpiresAt || user.resetTokenExpiresAt < new Date()) {
    res.status(400).json({ error: "Link inválido ou expirado. Solicite um novo." });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await db.update(usersTable)
    .set({ passwordHash, resetToken: null, resetTokenExpiresAt: null })
    .where(eq(usersTable.id, user.id));

  res.json({ success: true });
});

export default router;
