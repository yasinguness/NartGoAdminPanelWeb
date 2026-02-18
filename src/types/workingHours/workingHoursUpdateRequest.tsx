import { DayOfWeek } from '../enums/dayOfWeek';

export interface WorkingHoursUpdateRequest {
  dayOfWeek?: DayOfWeek;
  openTime?: string; // Format: "HH:mm"
  closeTime?: string; // Format: "HH:mm"
  closed?: boolean;
}
