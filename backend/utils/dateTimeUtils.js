/**
 * Timezone and Date/Time Utilities for Personal AI Assistant.
 * Initial configured timezone: Asia/Colombo (UTC+05:30).
 */

const DEFAULT_TIMEZONE = 'Asia/Colombo';

/**
 * Returns the current date and time in the specified timezone.
 *
 * @param {string} [timeZone=DEFAULT_TIMEZONE]
 * @returns {Date}
 */
function getCurrentTimeInZone(timeZone = DEFAULT_TIMEZONE) {
  const now = new Date();
  return now;
}

/**
 * Validates whether a provided date object or string is in the future.
 *
 * @param {Date|string} dateInput
 * @param {number} [bufferMinutes=0]
 * @returns {boolean}
 */
function isFutureDate(dateInput, bufferMinutes = 0) {
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return false;

  const now = new Date();
  const threshold = new Date(now.getTime() - bufferMinutes * 60 * 1000);
  return date > threshold;
}

/**
 * Parses and validates an ISO or date-time string into a verified Date object.
 *
 * @param {string} dateString
 * @param {string} [timeZone=DEFAULT_TIMEZONE]
 * @returns {{isValid: boolean, date: Date|null, error: string|null}}
 */
function parseAndValidateDateTime(dateString, timeZone = DEFAULT_TIMEZONE) {
  if (!dateString || typeof dateString !== 'string' || dateString.trim() === '') {
    return {
      isValid: false,
      date: null,
      error: 'Date and time value is missing or empty.',
    };
  }

  const date = new Date(dateString.trim());
  if (isNaN(date.getTime())) {
    return {
      isValid: false,
      date: null,
      error: `"${dateString}" is not a valid date or time format.`,
    };
  }

  return {
    isValid: true,
    date,
    error: null,
  };
}

/**
 * Formats a Date object into human-friendly text relative to current date (e.g., "Today, 3:30 PM").
 *
 * @param {Date|string} dateInput
 * @param {string} [timeZone=DEFAULT_TIMEZONE]
 * @returns {string}
 */
function formatHumanTime(dateInput, timeZone = DEFAULT_TIMEZONE) {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';

  try {
    const timeFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const dateFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      month: 'short',
      day: 'numeric',
    });

    const now = new Date();
    const todayStr = dateFormatter.format(now);
    const dateStr = dateFormatter.format(date);

    const timeStr = timeFormatter.format(date);

    // Check if tomorrow
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowStr = dateFormatter.format(tomorrow);

    if (dateStr === todayStr) {
      return `Today, ${timeStr}`;
    } else if (dateStr === tomorrowStr) {
      return `Tomorrow, ${timeStr}`;
    } else {
      return `${dateStr}, ${timeStr}`;
    }
  } catch (err) {
    return date.toLocaleString();
  }
}

module.exports = {
  DEFAULT_TIMEZONE,
  getCurrentTimeInZone,
  isFutureDate,
  parseAndValidateDateTime,
  formatHumanTime,
};
