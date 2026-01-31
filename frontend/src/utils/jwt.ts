/**
 * JWT Token Payload
 */
export interface JwtPayload {
  sub: string;        // Subject (user ID)
  email?: string;     // User email
  exp: number;        // Expiration time (seconds since epoch)
  iat: number;        // Issued at time (seconds since epoch)
  rememberMe?: boolean; // Remember me flag
}

/**
 * Decodes a JWT token and returns its payload
 * @param token - The JWT token string
 * @returns The decoded payload or null if invalid
 */
export function decodeToken(token: string): JwtPayload | null {
  try {
    // JWT format: header.payload.signature
    const parts = token.split('.');

    if (parts.length !== 3) {
      return null;
    }

    // Decode the payload (second part)
    const payload = parts[1];

    // JWT uses Base64URL encoding (not standard Base64)
    // Replace URL-safe characters and add padding if needed
    const base64 = payload
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    // Decode from base64
    const jsonPayload = atob(base64);

    // Parse JSON
    const decoded = JSON.parse(jsonPayload);

    // Validate required fields
    if (typeof decoded.exp !== 'number' || typeof decoded.iat !== 'number') {
      return null;
    }

    return decoded as JwtPayload;
  } catch (error) {
    // Handle any decoding or parsing errors
    return null;
  }
}

/**
 * Gets the expiration timestamp in milliseconds from a JWT token
 * @param token - The JWT token string
 * @returns Expiration timestamp in milliseconds or null if invalid
 */
export function getTokenExpiration(token: string): number | null {
  const payload = decodeToken(token);
  if (!payload) {
    return null;
  }

  // Convert from seconds to milliseconds
  return payload.exp * 1000;
}

/**
 * Checks if a JWT token is expired
 * @param token - The JWT token string
 * @returns true if expired, false if valid, null if token is invalid
 */
export function isTokenExpired(token: string): boolean | null {
  const expirationTime = getTokenExpiration(token);
  if (expirationTime === null) {
    return null;
  }

  return Date.now() >= expirationTime;
}

/**
 * Gets the time remaining until token expiration in milliseconds
 * @param token - The JWT token string
 * @returns Time remaining in milliseconds or null if invalid
 */
export function getTimeUntilExpiration(token: string): number | null {
  const expirationTime = getTokenExpiration(token);
  if (expirationTime === null) {
    return null;
  }

  const remaining = expirationTime - Date.now();
  return Math.max(0, remaining);
}
