import { DayOfWeek } from '../enums/dayOfWeek';

export interface WorkingHoursDto {
  id: string;
  dayOfWeek: DayOfWeek;
  openTime: string; // Format: "HH:mm"
  closeTime: string; // Format: "HH:mm"
  closed: boolean;
}
