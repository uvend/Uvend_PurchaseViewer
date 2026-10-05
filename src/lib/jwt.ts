export const authCookieName = "mra_admin_token";
export const authCookieMaxAge = 60 * 60 * 8;

export type JwtPayload = {
  userId: string;
  username: string;
  role: "USER" | "ADMIN" | "INSTALLER";
  exp: number;
};

export const authCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: authCookieMaxAge,
};

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not set");
  }

  return secret;
}

function encodeBase64Url(bytes: Uint8Array) {
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function decodeBase64Url(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "==".slice(0, (4 - (value.length % 4)) % 4);

  return atob(padded);
}

function timingSafeEqual(left: string, right: string) {
  if (left.length !== right.length) {
    return false;
  }

  let mismatch = 0;

  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return mismatch === 0;
}

async function sign(value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getJwtSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));

  return encodeBase64Url(new Uint8Array(signature));
}

export async function createJwt(payload: Omit<JwtPayload, "exp">) {
  const header = encodeBase64Url(
    new TextEncoder().encode(JSON.stringify({ alg: "HS256", typ: "JWT" })),
  );
  const body = encodeBase64Url(
    new TextEncoder().encode(
      JSON.stringify({
        ...payload,
        exp: Math.floor(Date.now() / 1000) + authCookieMaxAge,
      }),
    ),
  );
  const signature = await sign(`${header}.${body}`);

  return `${header}.${body}.${signature}`;
}

export async function verifyJwt(token?: string | null): Promise<JwtPayload | null> {
  if (!token) {
    return null;
  }

  const [header, body, signature] = token.split(".");

  if (!header || !body || !signature) {
    return null;
  }

  const expectedSignature = await sign(`${header}.${body}`);

  if (!timingSafeEqual(signature, expectedSignature)) {
    return null;
  }

  try {
    const payload = JSON.parse(decodeBase64Url(body)) as JwtPayload;

    if (!payload.userId || !payload.username || !["USER", "ADMIN", "INSTALLER"].includes(payload.role)) {
      return null;
    }

    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
