// ─── Deep Link Targets ─────────────────────────────────────
export enum DeepLinkTarget {
    EXPLORE = 'EXPLORE',
    LISTING = 'LISTING',
    VIDEO = 'VIDEO',
    EVENT = 'EVENT',
    PROFILE = 'PROFILE',
    CUSTOM = 'CUSTOM',
}

// ─── Deep Link ─────────────────────────────────────────────
export interface DeepLink {
    target: DeepLinkTarget;
    resourceId?: string;
    fullPath: string;
    label: string;
}

// ─── Route Templates ───────────────────────────────────────
export const DEEP_LINK_ROUTES: Record<DeepLinkTarget, { template: string; label: string; requiresId: boolean }> = {
    [DeepLinkTarget.EXPLORE]: {
        template: '/explore',
        label: 'Keşfet',
        requiresId: false,
    },
    [DeepLinkTarget.LISTING]: {
        template: '/ilan/{id}',
        label: 'İlan Detayı',
        requiresId: true,
    },
    [DeepLinkTarget.VIDEO]: {
        template: '/video/{id}',
        label: 'Video Detayı',
        requiresId: true,
    },
    [DeepLinkTarget.EVENT]: {
        template: '/event/{id}',
        label: 'Etkinlik Detayı',
        requiresId: true,
    },
    [DeepLinkTarget.PROFILE]: {
        template: '/profile/{id}',
        label: 'Profil',
        requiresId: true,
    },
    [DeepLinkTarget.CUSTOM]: {
        template: '',
        label: 'Özel Yol',
        requiresId: false,
    },
};

// ─── Helper ────────────────────────────────────────────────
export const buildDeepLink = (target: DeepLinkTarget, resourceId?: string): DeepLink => {
    const route = DEEP_LINK_ROUTES[target];
    let fullPath = route.template;
    if (route.requiresId && resourceId) {
        fullPath = fullPath.replace('{id}', resourceId);
    }
    return {
        target,
        resourceId,
        fullPath,
        label: route.label,
    };
};

export const parseDeepLink = (path: string): DeepLink | null => {
    if (path === '/explore') return buildDeepLink(DeepLinkTarget.EXPLORE);

    const patterns: Array<{ regex: RegExp; target: DeepLinkTarget }> = [
        { regex: /^\/ilan\/(.+)$/, target: DeepLinkTarget.LISTING },
        { regex: /^\/video\/(.+)$/, target: DeepLinkTarget.VIDEO },
        { regex: /^\/event\/(.+)$/, target: DeepLinkTarget.EVENT },
        { regex: /^\/profile\/(.+)$/, target: DeepLinkTarget.PROFILE },
    ];

    for (const { regex, target } of patterns) {
        const match = path.match(regex);
        if (match) return buildDeepLink(target, match[1]);
    }

    return { target: DeepLinkTarget.CUSTOM, fullPath: path, label: 'Özel Yol' };
};
