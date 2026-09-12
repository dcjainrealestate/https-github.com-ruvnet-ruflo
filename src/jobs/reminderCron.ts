import cron from 'node-cron';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { sendEmail } from '../services/emailService';
import { buildReminderEmail, computeDaysRemaining, shouldSendReminder } from '../services/reminderService';

export async function runReminderSweep(now: Date = new Date()): Promise<number> {
  const activeListings = await prisma.resaleInventory.findMany({
    where: { status: 'ACTIVE' },
    include: { submittedBy: true },
  });

  let sentCount = 0;
  for (const listing of activeListings) {
    if (!shouldSendReminder(listing.lastReminderSentAt, now)) {
      continue;
    }

    const daysRemaining = computeDaysRemaining(listing.targetSaleDate, now);
    const { subject, html } = buildReminderEmail({
      customerName: listing.customerName,
      projectName: listing.projectName,
      flatNo: listing.flatNo,
      daysRemaining,
    });

    await sendEmail({ to: listing.submittedBy.email, subject, html });

    await prisma.$transaction([
      prisma.resaleInventory.update({ where: { id: listing.id }, data: { lastReminderSentAt: now } }),
      prisma.reminderLog.create({
        data: { inventoryId: listing.id, userId: listing.submittedById, sentAt: now, daysRemaining },
      }),
    ]);

    sentCount += 1;
  }

  return sentCount;
}

export function scheduleReminderCron(): void {
  cron.schedule(env.reminderCronSchedule, () => {
    runReminderSweep().catch((err) => {
      // eslint-disable-next-line no-console
      console.error('Reminder sweep failed', err);
    });
  });
}
