import { 
  addMinutes, 
  format, 
  isAfter, 
  isBefore, 
  parse, 
  startOfDay, 
  setHours, 
  setMinutes,
  isWithinInterval,
  areIntervalsOverlapping,
  parseISO
} from 'date-fns';
import { Appointment, BlockedTime, AvailableSlot } from '../types';

export function generateAvailableSlots(
  openTime: string, // "09:00"
  closeTime: string, // "18:00"
  duration: number, // 30
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

  while (isBefore(currentSlotStart, dayEnd)) {
    const currentSlotEnd = addMinutes(currentSlotStart, duration);
    
    // Don't go past closing time
    if (isAfter(currentSlotEnd, dayEnd)) break;

    // Check if slot is in the past
    if (isAfter(currentSlotStart, now)) {
      const interval = { start: currentSlotStart, end: currentSlotEnd };
      
      // Check for overlap with appointments
      const hasAppointmentOverlap = existingAppointments.some(app => {
        const appInterval = { 
          start: parseISO(app.start_time), 
          end: parseISO(app.end_time) 
        };
        return areIntervalsOverlapping(interval, appInterval);
      });

      // Check for overlap with blocked times
      const hasBlockedOverlap = blockedTimes.some(block => {
        const blockInterval = { 
          start: parseISO(block.start_time), 
          end: parseISO(block.end_time) 
        };
        return areIntervalsOverlapping(interval, blockInterval);
      });

      if (!hasAppointmentOverlap && !hasBlockedOverlap) {
        slots.push({ start: new Date(currentSlotStart), end: new Date(currentSlotEnd) });
      }
    }
    
    currentSlotStart = addMinutes(currentSlotStart, duration);
  }

  return slots;
}
