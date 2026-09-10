/**
 * Admin Theme Tokens — tüm admin sayfaları için tek doğruluk kaynağı.
 * Light tema (sidebar hariç). Altın accent (#C9A227) marka rengi olarak korunur.
 *
 * NOT: Dosya adı `darkAdmin.ts` tarihsel nedenlerle korundu (30+ import var).
 * İçerik artık light — import isimleri değişmedi.
 */

export const darkAdmin = {
  // ─── Background ─────────────────────────────
  bg: {
    page: '#FAFAFA',         // sayfa arkaplanı (soft gri-beyaz)
    card: '#FFFFFF',         // section/Paper içi (standart kart)
    cardAlt: '#F8FAFC',      // stat/KPI tile (biraz daha gri)
    surface: 'rgba(0,0,0,0.02)',        // input/button idle
    surfaceHover: 'rgba(0,0,0,0.04)',
  },

  // ─── Text ───────────────────────────────────
  text: {
    primary: '#1E293B',         // ana metin (slate-800)
    secondary: 'rgba(30,41,59,0.70)',    // alt metin
    muted: 'rgba(30,41,59,0.55)',        // gölgeli
    disabled: 'rgba(30,41,59,0.35)',
    accent: '#C9A227',           // altın vurgu — başlık/rakam
  },

  // ─── Border ─────────────────────────────────
  border: {
    subtle: 'rgba(0,0,0,0.06)',        // ince iç ayırıcı
    default: '#E2E8F0',                 // card çevresi (slate-200)
    accent: 'rgba(201,162,39,0.35)',    // vurgu kartlar
    strong: 'rgba(201,162,39,0.55)',    // focus/hover
  },

  // ─── Semantic Colors ─────────────────────────
  status: {
    success: '#16a34a',
    warning: '#d97706',
    error: '#dc2626',
    info: '#2563eb',
    neutral: '#64748b',
    primary: '#C9A227',         // altın
  },

  // ─── Typography ─────────────────────────────
  font: {
    // Artık Georgia kullanılmıyor — her yerde tek tip sans-serif
    displayFamily: 'inherit',
    displayStyle: 'normal' as const,
    monoFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' as const,
  },

  // ─── Section/Card Label ─────────────────────
  label: {
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    color: 'rgba(30,41,59,0.60)',
  },

  // ─── Ready-to-use sx snippets ───────────────
  sx: {
    /** Standart section/card */
    card: {
      borderRadius: 2,
      bgcolor: '#FFFFFF',
      borderColor: '#E2E8F0',
    },
    /** Stat/KPI tile (daha gri bg) */
    statTile: {
      borderRadius: 2,
      bgcolor: '#F8FAFC',
      borderColor: '#E2E8F0',
    },
    /** Section label Typography sx */
    sectionLabel: {
      fontSize: 10,
      letterSpacing: 1.5,
      fontWeight: 700,
      textTransform: 'uppercase' as const,
      color: 'rgba(30,41,59,0.60)',
    },
    /** KPI büyük rakam Typography sx — artık sans-serif, normal style */
    kpiValue: {
      fontFamily: 'inherit',
      fontStyle: 'normal',
      fontSize: 26,
      fontWeight: 700,
      lineHeight: 1.1,
      color: '#1E293B',
    },
    /** Sayfa başlığı (hero) */
    pageTitle: {
      fontFamily: 'inherit',
      fontStyle: 'normal',
      fontSize: { xs: 24, md: 32 },
      fontWeight: 700,
      lineHeight: 1.1,
      color: '#1E293B',
    },
  },
};

export type DarkAdmin = typeof darkAdmin;
