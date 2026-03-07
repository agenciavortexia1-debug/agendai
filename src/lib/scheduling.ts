import {
  addMinutes,
  isAfter,
  isBefore,
  startOfDay,
  setHours,
  setMinutes,
  areIntervalsOverlapping,
  parseISO
} from 'date-fns';
import { Appointment, BlockedTime, AvailableSlot } from '../types';

export function generateAvailableSlots(
  openTime: string, // "09:00"
  closeTime: string, // "18:00"
  duration: number, // 30, 60, etc.
  existingAppointments: Appointment[],
  blockedTimes: BlockedTime[],
  selectedDate: Date
): AvailableSlot[] {
  const slots: AvailableSlot[] = [];

  // Parse open and close times for the selected date
  const [openH, openM] = openTime.split(':').map(Number);
  const [closeH, closeM] = closeTime.split(':').map(Number);

  let currentSlotStart = setMinutes(setHours(startOfDay(selectedDate), openH), openM);
  const dayEnd = setMinutes(setHours(startOfDay(selectedDate), closeH), closeM);

  const now = new Date();

  // We advance the possible starts by a base step of 30 minutes for flexibility, 
  // or by duration if duration < 30.
  const stepMinutes = 30;

  while (isBefore(currentSlotStart, dayEnd)) {
    const currentSlotEnd = addMinutes(currentSlotStart, duration);

    // Don't go past closing time
    if (isAfter(currentSlotEnd, dayEnd)) break;

    // Check if slot is in the past
    if (isAfter(currentSlotStart, now)) {
      const interval = { start: currentSlotStart, end: currentSlotEnd };

      // Check for overlap with appointments
      const hasAppointmentOverlap = existingAppointments.some(app => {
        // Only consider appointments that are not cancelled
        if (app.status === 'cancelled') return false;

        const appInterval = {
          start: parseISO(app.start_time),
          end: parseISO(app.end_time)
        };
        // Date-fns areIntervalsOverlapping is strictly overlapping. If one ends EXACTLY when another starts, it's not overlapping if inclusive=false (by default since v3, but we can do a manual check or just pass inclusive: false to be sure, depending on date-fns version. Let's do a strict check:
        // A overlaps B if A.start < B.end AND A.end > B.start
        return currentSlotStart < appInterval.end && currentSlotEnd > appInterval.start;
      });

      // Check for overlap with blocked times
      const hasBlockedOverlap = blockedTimes.some(block => {
        const blockInterval = {
          start: parseISO(block.start_time),
          end: parseISO(block.end_time)
        };
        return currentSlotStart < blockInterval.end && currentSlotEnd > blockInterval.start;
      });

      if (!hasAppointmentOverlap && !hasBlockedOverlap) {
        slots.push({ start: new Date(currentSlotStart), end: new Date(currentSlotEnd) });
      }
    }

    currentSlotStart = addMinutes(currentSlotStart, stepMinutes);
  }

  return slots;
}
