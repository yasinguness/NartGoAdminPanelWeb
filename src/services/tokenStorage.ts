/**
 * Tek auth-token kaynağı. Hem axios interceptor'ı hem AuthService buradan okur
 * (eskiden axios `getAccessToken`, fetch client'ı ham `localStorage` okuyordu →
 * tutarsızlık). localStorage anahtarları: `token`, `tokenExpiration`, `user`.
 */

const TOKEN_KEY = 'token';
const EXP_KEY = 'tokenExpiration';
const USER_KEY = 'user';

/**
 * JWT payload'ını çözer. JWT base64URL kullanır (`-`/`_`, padding yok) ve payload
 * UTF-8 olabilir (Türkçe ad vb.). Düz `atob` base64url'de patlar — bu yüzden önce
 * base64url→base64 + padding + UTF-8 decode yapılır.
 */
export function decodeJwtPayload(token: string): Record<string, any> | null {
    try {
        const part = token.split('.')[1];
        if (!part) return null;
        let b64 = part.replace(/-/g, '+').replace(/_/g, '/');
        const pad = b64.length % 4;
        if (pad) b64 += '='.repeat(4 - pad);
        const json = decodeURIComponent(
            atob(b64)
                .split('')
                .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
                .join('')
        );
        return JSON.parse(json);
    } catch {
        return null;
    }
}

export function saveToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
    const payload = decodeJwtPayload(token);
    if (payload && typeof payload.exp === 'number') {
        localStorage.setItem(EXP_KEY, String(payload.exp * 1000));
    } else {
        localStorage.removeItem(EXP_KEY);
    }
}

export function getRawToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
}

export function clearTokens(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EXP_KEY);
    localStorage.removeItem(USER_KEY);
}

/**
 * Süre saptanamadıysa (exp claim'i yok / parse edilemedi) token'ı expired SAYMA —
 * gerçek expire'ı backend 401 ile reddeder. Eskiden burada `true` dönüyordu →
 * token strip ediliyor, tüm yetkili istekler 401 oluyordu.
 */
export function isTokenExpired(): boolean {
    const exp = localStorage.getItem(EXP_KEY);
    if (!exp) return false;
    return Date.now() >= parseInt(exp, 10);
}

/** Geçerli token (yoksa veya expired ise null + temizlik). Axios interceptor bunu kullanır. */
export function getValidToken(): string | null {
    const token = getRawToken();
    if (!token) return null;
    if (isTokenExpired()) {
        clearTokens();
        return null;
    }
    return token;
}
