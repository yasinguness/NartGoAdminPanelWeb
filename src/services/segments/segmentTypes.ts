export interface SegmentItem {
  key: string;
  label: string;
  description?: string;
  category?: string;
  count: number;
  percentOfTotal?: number;
  filterUrl?: string;
}

export interface SegmentOverview {
  generatedAt: string;
  segments: SegmentItem[];
}
