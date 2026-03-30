const MINUTES_PER_DAY = 24 * 60;
const MINUTES_PER_WEEK = 7 * MINUTES_PER_DAY;

export interface HoursScheduleInput {
  dayOfWeek: number;
  opensAt: string;
  closesAt: string;
  overnight: boolean;
}

export interface WeeklyInterval {
  start: number;
  end: number;
}

export function parseTimeToMinutes(value: string): number {
  const [hoursValue, minutesValue] = value.split(":");
  const hours = Number(hoursValue);
  const minutes = Number(minutesValue);

  if (hoursValue === undefined || minutesValue === undefined || Number.isNaN(hours) || Number.isNaN(minutes)) {
    throw new Error(`Invalid time value: ${value}`);
  }

  return hours * 60 + minutes;
}

export function toWeeklyIntervals(schedule: HoursScheduleInput): WeeklyInterval[] {
  const startMinutes = schedule.dayOfWeek * MINUTES_PER_DAY + parseTimeToMinutes(schedule.opensAt);
  const closeOffset = schedule.overnight ? 1 : 0;
  let endMinutes = (schedule.dayOfWeek + closeOffset) * MINUTES_PER_DAY + parseTimeToMinutes(schedule.closesAt);

  if (!schedule.overnight && endMinutes <= startMinutes) {
    throw new Error("Closing time must be after opening time for same-day hours.");
  }

  if (schedule.overnight && endMinutes <= startMinutes) {
    throw new Error("Overnight hours must close after midnight on the next day.");
  }

  if (endMinutes <= MINUTES_PER_WEEK) {
    return [{ start: startMinutes, end: endMinutes }];
  }

  return [
    { start: startMinutes, end: MINUTES_PER_WEEK },
    { start: 0, end: endMinutes - MINUTES_PER_WEEK }
  ];
}

export function intervalsOverlap(left: WeeklyInterval, right: WeeklyInterval): boolean {
  return left.start < right.end && right.start < left.end;
}

export function schedulesOverlap(left: HoursScheduleInput, right: HoursScheduleInput): boolean {
  const leftIntervals = toWeeklyIntervals(left);
  const rightIntervals = toWeeklyIntervals(right);

  return leftIntervals.some((leftInterval) =>
    rightIntervals.some((rightInterval) => intervalsOverlap(leftInterval, rightInterval))
  );
}
