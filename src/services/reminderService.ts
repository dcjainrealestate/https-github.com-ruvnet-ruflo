const MS_PER_DAY = 24 * 60 * 60 * 1000;
const REMINDER_INTERVAL_DAYS = 7;

export function computeDaysRemaining(targetSaleDate: Date, now: Date = new Date()): number {
  return Math.ceil((targetSaleDate.getTime() - now.getTime()) / MS_PER_DAY);
}

// Nudges the submitter roughly once a week while the listing is still
// active, so they "keep in mind" the timeframe they committed to, per
// requirement. Always reminds on the very first check (lastReminderSentAt
// null) so a newly created listing isn't silently forgotten.
export function shouldSendReminder(lastReminderSentAt: Date | null, now: Date = new Date()): boolean {
  if (!lastReminderSentAt) {
    return true;
  }
  const daysSinceLastReminder = (now.getTime() - lastReminderSentAt.getTime()) / MS_PER_DAY;
  return daysSinceLastReminder >= REMINDER_INTERVAL_DAYS;
}

export function buildReminderEmail(params: {
  customerName: string;
  projectName: string;
  flatNo: string;
  daysRemaining: number;
}): { subject: string; html: string } {
  const { customerName, projectName, flatNo, daysRemaining } = params;
  const status =
    daysRemaining >= 0
      ? `${daysRemaining} day(s) remaining`
      : `${Math.abs(daysRemaining)} day(s) past your target sale date`;

  return {
    subject: `Reminder: ${projectName} (${flatNo}) - ${status}`,
    html: `
      <p>This is a reminder about the resale inventory you listed for <strong>${customerName}</strong>
      at <strong>${projectName}, ${flatNo}</strong>.</p>
      <p>Status: <strong>${status}</strong> against the timeframe you set when entering this listing.</p>
      <p>Please follow up and keep the listing status up to date.</p>
    `,
  };
}
