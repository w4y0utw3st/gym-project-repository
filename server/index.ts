import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { prisma } from "../lib/prisma";
import {
  SESSION_COOKIE,
  createSession,
  deleteSession,
  getUserFromSessionToken,
  hashPassword,
  isValidEmail,
  toPublicUser,
  verifyPassword,
} from "../lib/auth";

const app = express();
const port = Number(process.env.PORT) || 3001;

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

function setSessionCookie(
  res: express.Response,
  token: string,
  maxAgeMs: number,
) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeMs,
  });
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/auth/register", async (req, res) => {
  const fullName = String(req.body?.fullName ?? "").trim();
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const password = String(req.body?.password ?? "");

  if (!fullName) {
    return res.status(400).json({ error: "Full name is required." });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "A valid email is required." });
  }
  if (password.length < 8) {
    return res
      .status(400)
      .json({ error: "Password must be at least 8 characters." });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: "An account with that email already exists." });
  }

  const user = await prisma.user.create({
    data: {
      fullName,
      email,
      passwordHash: await hashPassword(password),
    },
  });

  const session = await createSession(user.id);
  setSessionCookie(res, session.token, session.maxAgeMs);
  return res.status(201).json({ user: toPublicUser(user) });
});

app.post("/api/auth/login", async (req, res) => {
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const password = String(req.body?.password ?? "");

  if (!isValidEmail(email) || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const session = await createSession(user.id);
  setSessionCookie(res, session.token, session.maxAgeMs);
  return res.json({ user: toPublicUser(user) });
});

app.post("/api/auth/logout", async (req, res) => {
  await deleteSession(req.cookies[SESSION_COOKIE]);
  res.clearCookie(SESSION_COOKIE, { path: "/" });
  return res.json({ ok: true });
});

app.get("/api/auth/me", async (req, res) => {
  const user = await getUserFromSessionToken(req.cookies[SESSION_COOKIE]);
  if (!user) {
    return res.status(401).json({ error: "Not authenticated." });
  }
  return res.json({ user: toPublicUser(user) });
});

app.listen(port, () => {
  console.log(`Auth API listening on http://localhost:${port}`);
});
