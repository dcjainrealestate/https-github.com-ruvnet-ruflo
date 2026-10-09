import { createApp } from './app';
import { env } from './config/env';
import { scheduleReminderCron } from './jobs/reminderCron';

const app = createApp();

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Ruflo resale inventory API listening on port ${env.port}`);
  scheduleReminderCron();
});
