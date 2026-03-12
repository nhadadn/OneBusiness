import { SignJWT, jwtVerify } from 'jose';
import { z } from 'zod';

const accessTokenPayloadSchema = z.object({
  userId: z.number().int().positive(),
  email: z.string().email(),
  rol: z.string().min(1),
  negocios: z.array(z.number().int().positive()),
  tokenVersion: z.number().int().min(0),
});

const refreshTokenPayloadSchema = z.object({
  userId: z.number().int().positive(),
});

export type AccessTokenPayload = z.infer<typeof accessTokenPayloadSchema>;
export type RefreshTokenPayload = z.infer<typeof refreshTokenPayloadSchema>;

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET no está configurado');
  }
  return new TextEncoder().encode(secret);
}

function getAccessTokenExpiresIn(): string {
  return process.env.JWT_EXPIRES_IN ?? '15m';
}

function getRefreshTokenExpiresIn(): string {
  return process.env.REFRESH_TOKEN_EXPIRES_IN ?? '7d';
}

export async function generateAccessToken(payload: AccessTokenPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(getAccessTokenExpiresIn())
    .sign(getJwtSecret());
}

export async function generateRefreshToken(userId: number): Promise<string> {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(getRefreshTokenExpiresIn())
    .sign(getJwtSecret());
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    const parsed = accessTokenPayloadSchema.safeParse(payload);
    return parsed.success ? parsed.data : null;
  } catch (error) {
    console.error('JWT access verification failed', error);
    return null;
  }
}

export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    const parsed = refreshTokenPayloadSchema.safeParse(payload);
    return parsed.success ? parsed.data : null;
  } catch (error) {
    console.error('JWT refresh verification failed', error);
    return null;
  }
}

export async function verifyJWT(token: string): Promise<AccessTokenPayload | null> {
  return verifyAccessToken(token);
}
