import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';

const SALT_ROUNDS = 12;

export function signAuthToken(user: { id: string; email: string; role: string }): string {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'] }
  );
}

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
}) {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (existing) {
    throw new AppError('An account with this email already exists.', 409);
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      role: 'learner',
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  const token = signAuthToken(user);
  return { user, token };
}

export async function loginUser(input: { email: string; password: string }) {
  const userRecord = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (!userRecord) {
    throw new AppError('Invalid email or password.', 401);
  }

  const isValid = await bcrypt.compare(input.password, userRecord.passwordHash);
  if (!isValid) {
    throw new AppError('Invalid email or password.', 401);
  }

  const user = {
    id: userRecord.id,
    name: userRecord.name,
    email: userRecord.email,
    role: userRecord.role,
    createdAt: userRecord.createdAt,
  };

  const token = signAuthToken(user);
  return { user, token };
}

export async function getUserById(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new AppError('User account not found.', 404);
  }

  return user;
}

export async function updateUserProfile(
  userId: string,
  input: {
    name?: string;
    currentPassword?: string;
    newPassword?: string;
  }
) {
  const userRecord = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!userRecord) {
    throw new AppError('User account not found.', 404);
  }

  const updateData: { name?: string; passwordHash?: string } = {};

  if (input.name) {
    updateData.name = input.name;
  }

  if (input.newPassword) {
    if (!input.currentPassword) {
      throw new AppError('Current password is required to set a new password.', 400);
    }
    const isMatch = await bcrypt.compare(input.currentPassword, userRecord.passwordHash);
    if (!isMatch) {
      throw new AppError('Current password is incorrect.', 400);
    }
    updateData.passwordHash = await bcrypt.hash(input.newPassword, SALT_ROUNDS);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return updated;
}
