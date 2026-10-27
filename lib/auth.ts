import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const SESSION_COOKIE = "session";

export type PublicUser = {
  id: string;
  fullName: string;
  email: string;
  age: number | null;
  bio: string | null;
  phoneNumber: string | null;
  profilePicUrl: string | null;
  createdAt: Date;
};

export function toPublicUser(user: {
  id: string;
  fullName: string;
  email: string;
  age: number | null;
  bio: string | null;
  phoneNumber: string | null;
  profilePicUrl: string | null;
  createdAt: Date;
}): PublicUser {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    age: user.age,
    bio: user.bio,
    phoneNumber: user.phoneNumber,
    profilePicUrl: user.profilePicUrl,
    createdAt: user.createdAt,
  };
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt,
    },
  });

  return { token, expiresAt, maxAgeMs: SESSION_TTL_MS };
}

export async function getUserFromSessionToken(token: string | undefined) {
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });

  if (!session) return null;

  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } });
    return null;
  }

  return session.user;
}

export async function deleteSession(token: string | undefined) {
  if (!token) return;
  await prisma.session.deleteMany({
    where: { tokenHash: hashToken(token) },
  });
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
