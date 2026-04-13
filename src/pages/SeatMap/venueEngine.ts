/**
 * Venue Design Engine
 * Core types, geometry calculations, and venue templates.
 *
 * Supports: Proscenium, Arena, Amphitheater, Thrust, Stadium, OpenAir
 * Each venue = stage + N sections. Each section = M curved/straight rows of seats.
 * Every seat gets a computed (x, y) world-coordinate for canvas rendering.
 */

// ─── TYPES ─────────────────────────────────────────────────────────────────

export type VenueType = 'proscenium' | 'arena' | 'amphitheater' | 'thrust' | 'stadium' | 'openair';
export type StageShape = 'rectangle' | 'semicircle' | 'circle' | 'thrust' | 'oval';
export type SeatStatus = 'available' | 'sold' | 'reserved' | 'disabled' | 'blocked' | 'manual_assigned';

// ─── Koltuk sahip bilgisi (manuel atama veya satış) ──────────────────────
export interface SeatAssignment {
  ownerName?: string;
  ownerEmail?: string;
  ticketCode?: string;
  assignedAt?: string;
  assignedBy?: string; // admin email
  note?: string;
}

// ─── Profil Bazlı Kayıtlı Şablon ───────────────────────────────────────
export interface SavedVenueTemplate {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string; // admin email
  thumbnail?: string; // base64 preview image
  venue: VenueConfig;
  categories: SeatCategory[];
  isDefault?: boolean; // platform varsayılanı mı
}

export interface SeatCategory {
  id: string;
  name: string;
  color: string;
  price: number;
}

export const DEFAULT_CATEGORIES: SeatCategory[] = [
  { id: 'premium', name: 'Sahne Önü', color: '#f59e0b', price: 450 },
  { id: 'vip', name: 'VIP', color: '#a855f7', price: 280 },
  { id: 'standard', name: 'Standart', color: '#3b82f6', price: 120 },
  { id: 'economy', name: 'Ekonomi', color: '#6b7280', price: 80 },
  { id: 'wheelchair', name: 'Engelli', color: '#0ea5e9', price: 120 },
  { id: 'reserved', name: 'Rezerve', color: '#9ca3af', price: 0 },
];

export interface StageConfig {
  shape: StageShape;
  width: number;
  height: number;
  x: number;
  y: number;
  label: string;
}

export interface SectionConfig {
  id: string;
  name: string;
  /** Block label for user-facing display (e.g. "A Blok", "Tribün 1") */
  blockLabel?: string;
  /** Seat number range description (e.g. "1-100 arası koltuklar") */
  seatRangeDesc?: string;
  /** World-space offset of section origin */
  x: number;
  y: number;
  /** Section rotation in degrees (around its own origin) */
  rotation: number;
  /** 0 = straight rows, >0 = curved rows with this radius for innermost row */
  curveRadius: number;
  /** For curved sections: the angular span in degrees (e.g. 180 for semicircle) */
  arcSpan: number;
  /** Row definitions */
  rows: RowConfig[];
  /** Default category for new seats */
  defaultCategory: string;
  /** Section-level color override (for category renklendirme) */
  colorOverride?: string;
}

export interface RowConfig {
  label: string;
  seatCount: number;
  /** Spacing between seats in px */
  seatSpacing: number;
  /** Distance from previous row (or from section origin for first row) */
  rowGap: number;
  /** Indices (0-based) after which an aisle gap is inserted */
  aisleAfter: number[];
  /** Aisle width in px */
  aisleWidth: number;
}

export interface Seat {
  id: string;
  sectionId: string;
  sectionName: string;
  rowLabel: string;
  seatNumber: number;
  /** World coordinates */
  x: number;
  y: number;
  category: string;
  status: SeatStatus;
  /** Atama bilgisi (manuel bilet veya satış) */
  assignment?: SeatAssignment;
}

export interface StandingZone {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  capacity: number;
  category: string;
}

export interface VenueConfig {
  type: VenueType;
  name: string;
  stage: StageConfig;
  sections: SectionConfig[];
  standingZones: StandingZone[];
}

// ─── GEOMETRY ENGINE ───────────────────────────────────────────────────────

const DEG2RAD = Math.PI / 180;

function rotatePoint(x: number, y: number, angleDeg: number, cx = 0, cy = 0): [number, number] {
  const rad = angleDeg * DEG2RAD;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = x - cx;
  const dy = y - cy;
  return [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos];
}

/**
 * Generate seat positions for a single section.
 * Straight: seats laid out in a grid, then rotated/offset.
 * Curved: seats distributed along arcs, each row at increasing radius.
 */
export function generateSectionSeats(section: SectionConfig): Seat[] {
  const seats: Seat[] = [];
  let currentY = 0; // local Y accumulator (distance from section origin)

  for (let ri = 0; ri < section.rows.length; ri++) {
    const row = section.rows[ri];
    currentY += row.rowGap;

    if (section.curveRadius > 0 && section.arcSpan > 0) {
      // ── CURVED ROW ──
      const radius = section.curveRadius + currentY;
      const spanRad = section.arcSpan * DEG2RAD;
      // Center angle: curves are symmetric around the section's local "up" direction
      const startAngle = -spanRad / 2;

      // Total seats including aisle gaps
      const totalAisles = row.aisleAfter.length;
      const effectiveCount = row.seatCount + totalAisles; // conceptual slots
      const angleStep = spanRad / Math.max(effectiveCount - 1, 1);

      let seatIdx = 0;
      let slotIdx = 0;
      for (let s = 0; s < row.seatCount; s++) {
        // Check if we need an aisle gap before this seat
        if (row.aisleAfter.includes(s)) {
          slotIdx++; // skip a slot for the aisle
        }
        const angle = startAngle + slotIdx * angleStep;
        // In our local coordinate system: angle 0 = straight ahead (negative Y = toward stage)
        // Canvas: +Y is down. So seat at angle θ from center:
        //   localX = radius * sin(θ)
        //   localY = -radius * cos(θ) + curveRadius + currentY (adjust so center of curve is at origin)
        const localX = radius * Math.sin(angle);
        const localY = radius * (1 - Math.cos(angle));

        // Apply section rotation and offset
        const [wx, wy] = rotatePoint(localX, localY, section.rotation);

        seats.push({
          id: `${section.id}-${row.label}-${s + 1}`,
          sectionId: section.id,
          sectionName: section.name,
          rowLabel: row.label,
          seatNumber: s + 1,
          x: section.x + wx,
          y: section.y + wy,
          category: section.defaultCategory,
          status: 'available',
        });

        seatIdx++;
        slotIdx++;
      }
    } else {
      // ── STRAIGHT ROW ──
      // Calculate total row width including aisles
      const totalAisleWidth = row.aisleAfter.length * row.aisleWidth;
      const totalRowWidth = (row.seatCount - 1) * row.seatSpacing + totalAisleWidth;
      const startX = -totalRowWidth / 2;

      let xAccum = startX;
      for (let s = 0; s < row.seatCount; s++) {
        const localX = xAccum;
        const localY = currentY;

        const [wx, wy] = rotatePoint(localX, localY, section.rotation);

        seats.push({
          id: `${section.id}-${row.label}-${s + 1}`,
          sectionId: section.id,
          sectionName: section.name,
          rowLabel: row.label,
          seatNumber: s + 1,
          x: section.x + wx,
          y: section.y + wy,
          category: section.defaultCategory,
          status: 'available',
        });

        xAccum += row.seatSpacing;
        if (row.aisleAfter.includes(s)) {
          xAccum += row.aisleWidth;
        }
      }
    }
  }

  return seats;
}

/**
 * Generate all seats for a venue.
 */
export function generateVenueSeats(venue: VenueConfig): Seat[] {
  const allSeats: Seat[] = [];
  for (const section of venue.sections) {
    allSeats.push(...generateSectionSeats(section));
  }
  return allSeats;
}

// ─── HELPER: Row builder ────────────────────────────────────────────────────

export function makeRows(count: number, seatsPerRow: number, opts: {
  seatSpacing?: number;
  rowGap?: number;
  aisleCenter?: boolean;
  startLabel?: string;
} = {}): RowConfig[] {
  const sp = opts.seatSpacing ?? 26;
  const rg = opts.rowGap ?? 28;
  const startCode = opts.startLabel?.charCodeAt(0) ?? 65; // 'A'
  const rows: RowConfig[] = [];

  for (let i = 0; i < count; i++) {
    const label = String.fromCharCode(startCode + i);
    rows.push({
      label,
      seatCount: seatsPerRow,
      seatSpacing: sp,
      rowGap: i === 0 ? rg * 2 : rg, // first row has more gap from stage
      aisleAfter: opts.aisleCenter ? [Math.floor(seatsPerRow / 2) - 1] : [],
      aisleWidth: 20,
    });
  }
  return rows;
}

// ─── VENUE TEMPLATES ───────────────────────────────────────────────────────

export interface VenueTemplate {
  type: VenueType;
  label: string;
  icon: string;
  description: string;
  generate: () => VenueConfig;
}

const prosceniumTemplate = (): VenueConfig => ({
  type: 'proscenium',
  name: 'Klasik Tiyatro',
  stage: { shape: 'rectangle', width: 300, height: 80, x: 0, y: 0, label: 'SAHNE' },
  sections: [
    // Ön bölüm (premium) — straight rows
    {
      id: 'orch-center',
      name: 'Orkestra',
      x: 0, y: 120,
      rotation: 0,
      curveRadius: 0, arcSpan: 0,
      defaultCategory: 'premium',
      rows: makeRows(3, 20, { aisleCenter: true, rowGap: 28 }),
    },
    // Orta bölüm (VIP)
    {
      id: 'mid-center',
      name: 'Orta Bölüm',
      x: 0, y: 230,
      rotation: 0,
      curveRadius: 0, arcSpan: 0,
      defaultCategory: 'vip',
      rows: makeRows(4, 22, { aisleCenter: true, startLabel: 'D' }),
    },
    // Arka bölüm (standart)
    {
      id: 'rear',
      name: 'Arka Bölüm',
      x: 0, y: 370,
      rotation: 0,
      curveRadius: 0, arcSpan: 0,
      defaultCategory: 'standard',
      rows: makeRows(5, 24, { aisleCenter: true, startLabel: 'H' }),
    },
    // Balkon
    {
      id: 'balcony',
      name: 'Balkon',
      x: 0, y: 540,
      rotation: 0,
      curveRadius: 0, arcSpan: 0,
      defaultCategory: 'economy',
      rows: makeRows(3, 26, { aisleCenter: true, startLabel: 'M' }),
    },
  ],
  standingZones: [],
});

const arenaTemplate = (): VenueConfig => ({
  type: 'arena',
  name: 'Arena (360°)',
  stage: { shape: 'circle', width: 120, height: 120, x: 0, y: 0, label: 'SAHNE' },
  sections: [
    // North
    {
      id: 'north',
      name: 'Kuzey',
      x: 0, y: -80,
      rotation: 0,
      curveRadius: 160, arcSpan: 80,
      defaultCategory: 'premium',
      rows: makeRows(5, 18, { seatSpacing: 24, rowGap: 26 }),
    },
    // South
    {
      id: 'south',
      name: 'Güney',
      x: 0, y: 80,
      rotation: 180,
      curveRadius: 160, arcSpan: 80,
      defaultCategory: 'standard',
      rows: makeRows(5, 18, { seatSpacing: 24, rowGap: 26 }),
    },
    // East
    {
      id: 'east',
      name: 'Doğu',
      x: 80, y: 0,
      rotation: 90,
      curveRadius: 160, arcSpan: 60,
      defaultCategory: 'vip',
      rows: makeRows(5, 12, { seatSpacing: 24, rowGap: 26 }),
    },
    // West
    {
      id: 'west',
      name: 'Batı',
      x: -80, y: 0,
      rotation: -90,
      curveRadius: 160, arcSpan: 60,
      defaultCategory: 'vip',
      rows: makeRows(5, 12, { seatSpacing: 24, rowGap: 26 }),
    },
  ],
  standingZones: [],
});

const amphitheaterTemplate = (): VenueConfig => ({
  type: 'amphitheater',
  name: 'Amfitiyatro',
  stage: { shape: 'semicircle', width: 200, height: 100, x: 0, y: 0, label: 'SAHNE' },
  sections: [
    // Single large curved section
    {
      id: 'main',
      name: 'Ana Salon',
      x: 0, y: 80,
      rotation: 0,
      curveRadius: 180, arcSpan: 160,
      defaultCategory: 'standard',
      rows: [
        ...makeRows(3, 22, { seatSpacing: 24, rowGap: 28 }).map((r, i) => ({
          ...r, label: String.fromCharCode(65 + i),
        })),
        ...makeRows(4, 26, { seatSpacing: 24, rowGap: 28, startLabel: 'D' }),
        ...makeRows(4, 30, { seatSpacing: 24, rowGap: 28, startLabel: 'H' }),
      ],
    },
  ],
  standingZones: [],
});

const thrustTemplate = (): VenueConfig => ({
  type: 'thrust',
  name: 'Thrust Sahne',
  stage: { shape: 'thrust', width: 160, height: 140, x: 0, y: 0, label: 'SAHNE' },
  sections: [
    // Front (facing stage front)
    {
      id: 'front',
      name: 'Ön',
      x: 0, y: 160,
      rotation: 0,
      curveRadius: 0, arcSpan: 0,
      defaultCategory: 'premium',
      rows: makeRows(6, 16, { aisleCenter: true, rowGap: 28 }),
    },
    // Left wing
    {
      id: 'left',
      name: 'Sol Kanat',
      x: -180, y: 20,
      rotation: -70,
      curveRadius: 0, arcSpan: 0,
      defaultCategory: 'vip',
      rows: makeRows(5, 10, { rowGap: 26, seatSpacing: 24 }),
    },
    // Right wing
    {
      id: 'right',
      name: 'Sağ Kanat',
      x: 180, y: 20,
      rotation: 70,
      curveRadius: 0, arcSpan: 0,
      defaultCategory: 'vip',
      rows: makeRows(5, 10, { rowGap: 26, seatSpacing: 24 }),
    },
  ],
  standingZones: [],
});

const stadiumTemplate = (): VenueConfig => ({
  type: 'stadium',
  name: 'Stadyum',
  stage: { shape: 'oval', width: 280, height: 160, x: 0, y: 0, label: 'ALAN' },
  sections: [
    // North tribune
    {
      id: 'north-trib',
      name: 'Kuzey Tribün',
      x: 0, y: -120,
      rotation: 0,
      curveRadius: 320, arcSpan: 90,
      defaultCategory: 'standard',
      rows: makeRows(6, 28, { seatSpacing: 22, rowGap: 24 }),
    },
    // South tribune
    {
      id: 'south-trib',
      name: 'Güney Tribün',
      x: 0, y: 120,
      rotation: 180,
      curveRadius: 320, arcSpan: 90,
      defaultCategory: 'standard',
      rows: makeRows(6, 28, { seatSpacing: 22, rowGap: 24 }),
    },
    // East tribune (VIP)
    {
      id: 'east-trib',
      name: 'Doğu Tribün (VIP)',
      x: 180, y: 0,
      rotation: 90,
      curveRadius: 320, arcSpan: 50,
      defaultCategory: 'vip',
      rows: makeRows(6, 16, { seatSpacing: 22, rowGap: 24 }),
    },
    // West tribune
    {
      id: 'west-trib',
      name: 'Batı Tribün',
      x: -180, y: 0,
      rotation: -90,
      curveRadius: 320, arcSpan: 50,
      defaultCategory: 'economy',
      rows: makeRows(6, 16, { seatSpacing: 22, rowGap: 24 }),
    },
  ],
  standingZones: [],
});

const openairTemplate = (): VenueConfig => ({
  type: 'openair',
  name: 'Açık Hava Konser',
  stage: { shape: 'rectangle', width: 360, height: 80, x: 0, y: 0, label: 'SAHNE' },
  sections: [
    // VIP seated near stage — slightly curved
    {
      id: 'vip-seated',
      name: 'VIP Oturma',
      x: 0, y: 120,
      rotation: 0,
      curveRadius: 400, arcSpan: 60,
      defaultCategory: 'premium',
      rows: makeRows(4, 24, { seatSpacing: 28, rowGap: 30 }),
    },
    // General seated behind VIP
    {
      id: 'general-seated',
      name: 'Oturma Alanı',
      x: 0, y: 280,
      rotation: 0,
      curveRadius: 500, arcSpan: 70,
      defaultCategory: 'standard',
      rows: makeRows(6, 30, { seatSpacing: 26, rowGap: 28, startLabel: 'E' }),
    },
  ],
  standingZones: [
    {
      id: 'standing-a',
      name: 'Ayakta A',
      x: -180,
      y: 520,
      width: 360,
      height: 100,
      capacity: 500,
      category: 'economy',
    },
    {
      id: 'standing-b',
      name: 'Ayakta B',
      x: -180,
      y: 640,
      width: 360,
      height: 100,
      capacity: 800,
      category: 'economy',
    },
  ],
});

export const VENUE_TEMPLATES: VenueTemplate[] = [
  { type: 'proscenium', label: 'Klasik Tiyatro', icon: '🎭', description: 'Dikdörtgen sahne, düz sıralar', generate: prosceniumTemplate },
  { type: 'amphitheater', label: 'Amfitiyatro', icon: '🏛️', description: 'Yarım daire, eğimli sıralar', generate: amphitheaterTemplate },
  { type: 'arena', label: 'Arena (360°)', icon: '🎪', description: 'Sahne ortada, 4 bölüm', generate: arenaTemplate },
  { type: 'thrust', label: 'Thrust Sahne', icon: '🎬', description: '3 taraflı seyirci', generate: thrustTemplate },
  { type: 'stadium', label: 'Stadyum', icon: '🏟️', description: 'Oval alan, tribünler', generate: stadiumTemplate },
  { type: 'openair', label: 'Açık Hava', icon: '🎵', description: 'Konser — oturma + ayakta', generate: openairTemplate },
];

// ─── CANVAS DRAWING HELPERS ────────────────────────────────────────────────

export function drawStage(ctx: CanvasRenderingContext2D, stage: StageConfig) {
  ctx.save();
  ctx.translate(stage.x, stage.y);

  const gradient = ctx.createLinearGradient(0, -stage.height / 2, 0, stage.height / 2);
  gradient.addColorStop(0, '#2a3a5c');
  gradient.addColorStop(1, '#1a2540');

  ctx.fillStyle = gradient;
  ctx.strokeStyle = '#3a4d70';
  ctx.lineWidth = 1.5;

  const hw = stage.width / 2;
  const hh = stage.height / 2;

  switch (stage.shape) {
    case 'rectangle':
      roundRect(ctx, -hw, -hh, stage.width, stage.height, 12);
      ctx.fill();
      ctx.stroke();
      break;
    case 'semicircle':
      ctx.beginPath();
      ctx.arc(0, 0, hw, Math.PI, 0, false);
      ctx.lineTo(hw, hh * 0.3);
      ctx.quadraticCurveTo(0, hh * 0.6, -hw, hh * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    case 'circle':
      ctx.beginPath();
      ctx.arc(0, 0, hw, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    case 'oval':
      ctx.beginPath();
      ctx.ellipse(0, 0, hw, hh, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    case 'thrust':
      // T-shape: wide top + narrow extension down
      ctx.beginPath();
      ctx.moveTo(-hw, -hh);
      ctx.lineTo(hw, -hh);
      ctx.lineTo(hw, -hh + 40);
      ctx.lineTo(hw * 0.4, -hh + 40);
      ctx.lineTo(hw * 0.4, hh);
      ctx.quadraticCurveTo(0, hh + 20, -hw * 0.4, hh);
      ctx.lineTo(-hw * 0.4, -hh + 40);
      ctx.lineTo(-hw, -hh + 40);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
  }

  // Label
  ctx.fillStyle = '#8ba0cc';
  ctx.font = 'bold 13px "Inter", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.letterSpacing = '2px';
  ctx.fillText(stage.label, 0, stage.shape === 'thrust' ? -hh + 20 : 0);

  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function getCategoryColor(categoryId: string, categories: SeatCategory[]): string {
  return categories.find(c => c.id === categoryId)?.color ?? '#6b7280';
}

export const SEAT_SIZE = 18;
export const SEAT_RADIUS = 4;

export function drawSeat(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  color: string,
  state: 'normal' | 'hover' | 'selected' | 'disabled' | 'sold',
) {
  const s = SEAT_SIZE;
  const hs = s / 2;

  ctx.save();

  switch (state) {
    case 'disabled':
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#1e2436';
      break;
    case 'sold':
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = '#2a3350';
      break;
    case 'selected':
      ctx.fillStyle = '#10b981';
      ctx.shadowColor = 'rgba(16,185,129,0.5)';
      ctx.shadowBlur = 8;
      break;
    case 'hover':
      ctx.fillStyle = color;
      ctx.shadowColor = `${color}66`;
      ctx.shadowBlur = 10;
      break;
    default:
      ctx.fillStyle = color;
      ctx.shadowColor = `${color}33`;
      ctx.shadowBlur = 3;
      break;
  }

  // Draw seat (rounded top, flat bottom)
  roundRect(ctx, x - hs, y - hs, s, s, SEAT_RADIUS);
  ctx.fill();

  ctx.restore();
}

export function drawStandingZone(
  ctx: CanvasRenderingContext2D,
  zone: StandingZone,
  color: string,
) {
  ctx.save();
  ctx.fillStyle = color + '18'; // very transparent fill
  ctx.strokeStyle = color + '44';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);

  roundRect(ctx, zone.x, zone.y, zone.width, zone.height, 12);
  ctx.fill();
  ctx.stroke();

  ctx.setLineDash([]);
  ctx.fillStyle = color + '99';
  ctx.font = 'bold 12px "Inter", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(zone.name, zone.x + zone.width / 2, zone.y + zone.height / 2 - 8);

  ctx.font = '11px "Inter", sans-serif';
  ctx.fillStyle = color + '77';
  ctx.fillText(`${zone.capacity} kişi kapasiteli`, zone.x + zone.width / 2, zone.y + zone.height / 2 + 10);

  ctx.restore();
}

export function drawSectionLabel(
  ctx: CanvasRenderingContext2D,
  section: SectionConfig,
  seats: Seat[],
) {
  if (seats.length === 0) return;

  // Find bounding box center of section seats
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const s of seats) {
    if (s.x < minX) minX = s.x;
    if (s.x > maxX) maxX = s.x;
    if (s.y < minY) minY = s.y;
    if (s.y > maxY) maxY = s.y;
  }

  const cx = (minX + maxX) / 2;
  const labelY = minY - 16;

  ctx.save();
  ctx.fillStyle = '#4a5270';
  ctx.font = 'bold 10px "Inter", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(section.name.toUpperCase(), cx, labelY);
  ctx.restore();
}

// ─── HIT TESTING ───────────────────────────────────────────────────────────

export function findSeatAtPoint(seats: Seat[], wx: number, wy: number): Seat | null {
  const hs = SEAT_SIZE / 2 + 2; // slight padding
  for (let i = seats.length - 1; i >= 0; i--) {
    const s = seats[i];
    if (Math.abs(s.x - wx) <= hs && Math.abs(s.y - wy) <= hs) {
      return s;
    }
  }
  return null;
}

export function findStandingZoneAtPoint(zones: StandingZone[], wx: number, wy: number): StandingZone | null {
  for (const z of zones) {
    if (wx >= z.x && wx <= z.x + z.width && wy >= z.y && wy <= z.y + z.height) {
      return z;
    }
  }
  return null;
}

// ─── SECTION / ROW MUTATION HELPERS ─────────────────────────────────────────

/** Update a section's config and regenerate seats */
export function updateSection(venue: VenueConfig, sectionId: string, updates: Partial<SectionConfig>): VenueConfig {
  return {
    ...venue,
    sections: venue.sections.map(s => s.id === sectionId ? { ...s, ...updates } : s),
  };
}

/** Add a row to a section */
export function addRowToSection(venue: VenueConfig, sectionId: string): VenueConfig {
  return {
    ...venue,
    sections: venue.sections.map(s => {
      if (s.id !== sectionId) return s;
      const lastRow = s.rows[s.rows.length - 1];
      const nextLabel = String.fromCharCode((lastRow?.label || '@').charCodeAt(0) + 1);
      return {
        ...s,
        rows: [...s.rows, {
          label: nextLabel,
          seatCount: lastRow?.seatCount ?? 16,
          seatSpacing: lastRow?.seatSpacing ?? 26,
          rowGap: lastRow?.rowGap ?? 28,
          aisleAfter: lastRow?.aisleAfter ?? [],
          aisleWidth: lastRow?.aisleWidth ?? 20,
        }],
      };
    }),
  };
}

/** Remove last row from a section */
export function removeRowFromSection(venue: VenueConfig, sectionId: string): VenueConfig {
  return {
    ...venue,
    sections: venue.sections.map(s => {
      if (s.id !== sectionId || s.rows.length <= 1) return s;
      return { ...s, rows: s.rows.slice(0, -1) };
    }),
  };
}

/** Update a specific row in a section */
export function updateRow(venue: VenueConfig, sectionId: string, rowIndex: number, updates: Partial<RowConfig>): VenueConfig {
  return {
    ...venue,
    sections: venue.sections.map(s => {
      if (s.id !== sectionId) return s;
      return {
        ...s,
        rows: s.rows.map((r, i) => i === rowIndex ? { ...r, ...updates } : r),
      };
    }),
  };
}

/** Update all rows' seatCount in a section at once */
export function updateSectionSeatCount(venue: VenueConfig, sectionId: string, seatCount: number): VenueConfig {
  return {
    ...venue,
    sections: venue.sections.map(s => {
      if (s.id !== sectionId) return s;
      return {
        ...s,
        rows: s.rows.map(r => ({
          ...r,
          seatCount,
          aisleAfter: r.aisleAfter.filter(a => a < seatCount),
        })),
      };
    }),
  };
}

/** Add a new section to the venue */
export function addSection(venue: VenueConfig): VenueConfig {
  const id = `section-${Date.now()}`;
  const lastSection = venue.sections[venue.sections.length - 1];
  const newSection: SectionConfig = {
    id,
    name: `Bölüm ${venue.sections.length + 1}`,
    x: 0,
    y: (lastSection?.y ?? 0) + 200,
    rotation: 0,
    curveRadius: 0,
    arcSpan: 0,
    defaultCategory: 'standard',
    rows: makeRows(4, 16, { aisleCenter: true }),
  };
  return { ...venue, sections: [...venue.sections, newSection] };
}

/** Remove a section from the venue */
export function removeSection(venue: VenueConfig, sectionId: string): VenueConfig {
  if (venue.sections.length <= 1) return venue;
  return { ...venue, sections: venue.sections.filter(s => s.id !== sectionId) };
}

// ─── THEME-AWARE DRAWING CONFIG ────────────────────────────────────────────

export interface DrawTheme {
  bg: string;
  gridDot: string;
  stageGradientStart: string;
  stageGradientEnd: string;
  stageStroke: string;
  stageText: string;
  seatDisabled: string;
  seatSold: string;
  seatSelected: string;
  seatSelectedGlow: string;
  sectionLabel: string;
}

export const DARK_THEME: DrawTheme = {
  bg: '#0e1117',
  gridDot: '#1a2035',
  stageGradientStart: '#2a3a5c',
  stageGradientEnd: '#1a2540',
  stageStroke: '#3a4d70',
  stageText: '#8ba0cc',
  seatDisabled: '#1e2436',
  seatSold: '#2a3350',
  seatSelected: '#10b981',
  seatSelectedGlow: 'rgba(16,185,129,0.5)',
  sectionLabel: '#4a5270',
};

export const LIGHT_THEME: DrawTheme = {
  bg: '#f8fafc',
  gridDot: '#e2e8f0',
  stageGradientStart: '#e2e8f0',
  stageGradientEnd: '#cbd5e1',
  stageStroke: '#94a3b8',
  stageText: '#475569',
  seatDisabled: '#e2e8f0',
  seatSold: '#cbd5e1',
  seatSelected: '#10b981',
  seatSelectedGlow: 'rgba(16,185,129,0.4)',
  sectionLabel: '#94a3b8',
};

export function drawStageThemed(ctx: CanvasRenderingContext2D, stage: StageConfig, t: DrawTheme) {
  ctx.save();
  ctx.translate(stage.x, stage.y);

  const gradient = ctx.createLinearGradient(0, -stage.height / 2, 0, stage.height / 2);
  gradient.addColorStop(0, t.stageGradientStart);
  gradient.addColorStop(1, t.stageGradientEnd);
  ctx.fillStyle = gradient;
  ctx.strokeStyle = t.stageStroke;
  ctx.lineWidth = 1.5;

  const hw = stage.width / 2;
  const hh = stage.height / 2;

  switch (stage.shape) {
    case 'rectangle': roundRect(ctx, -hw, -hh, stage.width, stage.height, 12); ctx.fill(); ctx.stroke(); break;
    case 'semicircle':
      ctx.beginPath(); ctx.arc(0, 0, hw, Math.PI, 0, false);
      ctx.lineTo(hw, hh * 0.3); ctx.quadraticCurveTo(0, hh * 0.6, -hw, hh * 0.3);
      ctx.closePath(); ctx.fill(); ctx.stroke(); break;
    case 'circle': ctx.beginPath(); ctx.arc(0, 0, hw, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); break;
    case 'oval': ctx.beginPath(); ctx.ellipse(0, 0, hw, hh, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); break;
    case 'thrust':
      ctx.beginPath(); ctx.moveTo(-hw, -hh); ctx.lineTo(hw, -hh);
      ctx.lineTo(hw, -hh + 40); ctx.lineTo(hw * 0.4, -hh + 40);
      ctx.lineTo(hw * 0.4, hh); ctx.quadraticCurveTo(0, hh + 20, -hw * 0.4, hh);
      ctx.lineTo(-hw * 0.4, -hh + 40); ctx.lineTo(-hw, -hh + 40);
      ctx.closePath(); ctx.fill(); ctx.stroke(); break;
  }

  ctx.fillStyle = t.stageText;
  ctx.font = 'bold 13px "Inter", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(stage.label, 0, stage.shape === 'thrust' ? -hh + 20 : 0);
  ctx.restore();
}

export function drawSeatThemed(
  ctx: CanvasRenderingContext2D, x: number, y: number,
  color: string, state: 'normal' | 'hover' | 'selected' | 'disabled' | 'sold',
  t: DrawTheme,
) {
  const s = SEAT_SIZE;
  const hs = s / 2;
  ctx.save();
  switch (state) {
    case 'disabled': ctx.globalAlpha = 0.3; ctx.fillStyle = t.seatDisabled; break;
    case 'sold': ctx.globalAlpha = 0.4; ctx.fillStyle = t.seatSold; break;
    case 'selected': ctx.fillStyle = t.seatSelected; ctx.shadowColor = t.seatSelectedGlow; ctx.shadowBlur = 8; break;
    case 'hover': ctx.fillStyle = color; ctx.shadowColor = `${color}66`; ctx.shadowBlur = 10; break;
    default: ctx.fillStyle = color; ctx.shadowColor = `${color}33`; ctx.shadowBlur = 3; break;
  }
  roundRect(ctx, x - hs, y - hs, s, s, SEAT_RADIUS);
  ctx.fill();
  ctx.restore();
}

export function drawSectionLabelThemed(ctx: CanvasRenderingContext2D, section: SectionConfig, seats: Seat[], t: DrawTheme) {
  if (seats.length === 0) return;
  let minX = Infinity, maxX = -Infinity, minY = Infinity;
  for (const s of seats) { if (s.x < minX) minX = s.x; if (s.x > maxX) maxX = s.x; if (s.y < minY) minY = s.y; }
  ctx.save();
  ctx.fillStyle = t.sectionLabel;
  ctx.font = 'bold 10px "Inter", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(section.name.toUpperCase(), (minX + maxX) / 2, minY - 16);
  ctx.restore();
}

// ─── STATS ─────────────────────────────────────────────────────────────────

export function computeStats(seats: Seat[], categories: SeatCategory[]) {
  const counts: Record<string, number> = {};
  for (const c of categories) counts[c.id] = 0;
  for (const s of seats) {
    if (s.status !== 'disabled' && s.status !== 'blocked') {
      counts[s.category] = (counts[s.category] || 0) + 1;
    }
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const maxRevenue = categories.reduce((acc, c) => acc + (counts[c.id] || 0) * c.price, 0);
  return { counts, total, maxRevenue };
}

// ─── SERIALIZATION (for backend persistence) ──────────────────────────────

/** Convert venue config + seats to a JSON-safe payload for API */
export function serializeVenueDesign(venue: VenueConfig, seats: Seat[], categories: SeatCategory[]) {
  const sectionSummaries = venue.sections.map(s => {
    const sectionSeats = seats.filter(seat => seat.sectionId === s.id);
    const totalSeats = sectionSeats.length;
    const availableSeats = sectionSeats.filter(seat => seat.status === 'available').length;
    const blockedSeats = sectionSeats.filter(seat => seat.status === 'blocked' || seat.status === 'disabled').length;
    return {
      id: s.id,
      name: s.name,
      blockLabel: s.blockLabel || s.name,
      seatRangeDesc: s.seatRangeDesc || `${totalSeats} koltuk`,
      totalSeats,
      availableSeats,
      blockedSeats,
      defaultCategory: s.defaultCategory,
      rows: s.rows.length,
    };
  });

  const stats = computeStats(seats, categories);

  return {
    venueType: venue.type,
    venueName: venue.name,
    stage: venue.stage,
    sections: venue.sections,
    standingZones: venue.standingZones,
    categories,
    sectionSummaries,
    totalSeats: stats.total,
    maxRevenue: stats.maxRevenue,
    // Per-seat data: only changed seats (category overrides and status)
    seatOverrides: seats
      .filter(s => s.status !== 'available' || s.category !== venue.sections.find(sec => sec.id === s.sectionId)?.defaultCategory)
      .map(s => ({
        id: s.id,
        category: s.category,
        status: s.status,
      })),
  };
}

/** Validate venue config before save */
export function validateVenueDesign(venue: VenueConfig, seats: Seat[]): string[] {
  const errors: string[] = [];

  if (!venue.name?.trim()) errors.push('Mekan adı zorunludur');
  if (venue.sections.length === 0) errors.push('En az bir bölüm tanımlanmalıdır');
  if (seats.length === 0) errors.push('En az bir koltuk olmalıdır');

  for (const section of venue.sections) {
    if (!section.name?.trim()) errors.push(`Bölüm "${section.id}" adı boş`);
    if (section.rows.length === 0) errors.push(`"${section.name}" bölümünde sıra yok`);
    for (const row of section.rows) {
      if (row.seatCount <= 0) errors.push(`"${section.name}" ${row.label}. sırada koltuk yok`);
    }
  }

  const availableCount = seats.filter(s => s.status === 'available').length;
  if (availableCount === 0) errors.push('Satışa açık koltuk yok — en az bir koltuk "available" olmalı');

  return errors;
}

/** Generate block label from section (e.g. "A Blok · 1-150 arası") */
export function generateBlockLabel(section: SectionConfig, seats: Seat[]): string {
  const sectionSeats = seats.filter(s => s.sectionId === section.id);
  if (sectionSeats.length === 0) return section.name;
  const minSeat = Math.min(...sectionSeats.map(s => s.seatNumber));
  const maxSeat = Math.max(...sectionSeats.map(s => s.seatNumber));
  return `${section.blockLabel || section.name} · ${minSeat}-${maxSeat} arası koltuklar`;
}

/**
 * Deserialize a saved venue design back into VenueConfig + seat overrides.
 * This is the inverse of serializeVenueDesign.
 * @param saved - The object that was saved to backend via saveSeatMapDesign
 * @returns { venue, seatOverrides } or null if data is invalid
 */
export function deserializeVenueDesign(saved: Record<string, any>): {
  venue: VenueConfig;
  seatOverrides: { id: string; category: string; status: SeatStatus }[];
} | null {
  if (!saved || !saved.sections || !Array.isArray(saved.sections)) return null;

  const venueType = (saved.venueType as VenueType) || 'theater';
  const venueName = saved.venueName || 'Yüklenen Düzen';

  // Reconstruct stage
  const stage: StageConfig = saved.stage || {
    x: 0, y: -200, width: 400, height: 80,
    shape: 'rectangle', label: 'SAHNE',
  };

  // Reconstruct sections
  const sections: SectionConfig[] = (saved.sections as any[]).map((s: any) => ({
    id: s.id || `sec-${Math.random().toString(36).slice(2)}`,
    name: s.name || 'Bölüm',
    x: s.x ?? 0,
    y: s.y ?? 0,
    rotation: s.rotation ?? 0,
    curveRadius: s.curveRadius ?? 0,
    arcSpan: s.arcSpan ?? 180,
    defaultCategory: s.defaultCategory || 'standard',
    blockLabel: s.blockLabel || s.name || '',
    seatRangeDesc: s.seatRangeDesc || '',
    rows: Array.isArray(s.rows) ? s.rows.map((r: any, ri: number) => ({
      label: r.label || String.fromCharCode(65 + ri),
      seatCount: r.seatCount ?? 16,
      seatSpacing: r.seatSpacing ?? 26,
      rowGap: r.rowGap ?? 28,
      aisleAfter: r.aisleAfter || [],
      aisleWidth: r.aisleWidth || 20,
    })) : [{ label: 'A', seatCount: 16, seatSpacing: 26, rowGap: 28, aisleAfter: [], aisleWidth: 20 }],
  }));

  const standingZones = Array.isArray(saved.standingZones) ? saved.standingZones : [];

  const venue: VenueConfig = {
    type: venueType,
    name: venueName,
    stage,
    sections,
    standingZones,
  };

  // Seat overrides (category/status changes)
  const seatOverrides = Array.isArray(saved.seatOverrides)
    ? saved.seatOverrides.map((o: any) => ({
        id: o.id,
        category: o.category || 'standard',
        status: (o.status || 'available') as SeatStatus,
      }))
    : [];

  return { venue, seatOverrides };
}
