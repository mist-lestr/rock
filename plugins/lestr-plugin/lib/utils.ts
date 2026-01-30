import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import humanizeDuration from 'humanize-duration';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const humanize = humanizeDuration.humanizer();
humanize.languages['en-mini'] = {
  y: () => 'y',
  mo: () => 'mo',
  w: () => 'w',
  d: () => 'd',
  h: () => 'h',
  m: () => 'm',
  s: () => 's',
  ms: () => 'ms',
};

export type DateParam = string | number | Date;

export type DateFormatOptions = 'brief' | 'mini';

export interface TimeAgoOptions {
  format?: DateFormatOptions;
}

/**
 * Show the time passed since the given date, in the desired format.
 *
 * @param date - The date since which to calculate the duration.
 * @param options - `format` takes "brief" or "mini". "brief" rounds the date and uses the largest suitable unit (e.g. "4 weeks"). "mini" uses something like "4w" (for 4 weeks).
 * @returns The formatted date.
 */
export function timeAgo(date: DateParam, options: TimeAgoOptions = {}) {
  const fromDate = new Date(date);
  let now = new Date();

  if (import.meta.env.UNDER_TEST === 'true') {
    // For testing, we consider the current moment to be 3 months from the dates we are testing.
    const days = 24 * 3600 * 1000; // in ms
    now = new Date(fromDate.getTime() + 90 * days);
  }

  return formatDuration(now.getTime() - fromDate.getTime(), options);
}


/** Format a duration in milliseconds to a human-readable string.
 *
 * @param duration - The duration in milliseconds.
 * @param options - `format` takes "brief" or "mini". "brief" rounds the date and uses the largest suitable unit (e.g. "4 weeks"). "mini" uses something like "4w" (for 4 weeks).
 * @returns The formatted duration.
 * */
export function formatDuration(duration: number, options: TimeAgoOptions = {}) {
  const { format = 'brief' } = options;

  if (format === 'brief') {
    return humanize(duration, {
      fallbacks: ['en'],
      round: true,
      largest: 1,
    });
  }

  return humanize(duration, {
    language: 'en-mini',
    spacer: '',
    fallbacks: ['en'],
    round: true,
    largest: 1,
  });
}