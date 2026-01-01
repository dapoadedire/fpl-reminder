import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_TO = process.env.EMAIL_TO;
const EMAIL_FROM = process.env.EMAIL_FROM || 'onboarding@resend.dev';

// Reminder windows in hours
const REMINDER_WINDOWS = [48, 24, 2];

// File to track sent reminders (prevents duplicates)
const SENT_REMINDERS_FILE = 'sent-reminders.json';

const isDryRun = process.argv.includes('--dry-run');

async function fetchFPLData() {
  try {
    const response = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/');
    if (!response.ok) {
      throw new Error(`Failed to fetch FPL data: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching FPL data:', error);
    throw error;
  }
}

function getNextDeadline(events) {
  const now = new Date();

  // Find the next upcoming deadline
  const upcomingEvents = events
    .filter(event => new Date(event.deadline_time) > now)
    .sort((a, b) => new Date(a.deadline_time) - new Date(b.deadline_time));

  return upcomingEvents[0] || null;
}

function loadSentReminders() {
  try {
    if (fs.existsSync(SENT_REMINDERS_FILE)) {
      const data = fs.readFileSync(SENT_REMINDERS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading sent reminders:', error);
  }
  return {};
}

function saveSentReminder(gameweek, hoursWindow) {
  const reminders = loadSentReminders();
  const key = `gw${gameweek}_${hoursWindow}h`;
  reminders[key] = new Date().toISOString();

  try {
    fs.writeFileSync(SENT_REMINDERS_FILE, JSON.stringify(reminders, null, 2));
  } catch (error) {
    console.error('Error saving reminder:', error);
  }
}

function hasReminderBeenSent(gameweek, hoursWindow) {
  const reminders = loadSentReminders();
  const key = `gw${gameweek}_${hoursWindow}h`;
  return !!reminders[key];
}

function checkReminderNeeded(deadline) {
  const now = new Date();
  const deadlineTime = new Date(deadline.deadline_time);
  const hoursUntilDeadline = (deadlineTime - now) / (1000 * 60 * 60);

  // Check each reminder window
  for (const window of REMINDER_WINDOWS) {
    // Allow 30 minute buffer (e.g., 48h window = 47.5h to 48.5h)
    const lowerBound = window - 0.5;
    const upperBound = window + 0.5;

    if (hoursUntilDeadline >= lowerBound && hoursUntilDeadline <= upperBound) {
      if (!hasReminderBeenSent(deadline.id, window)) {
        return { shouldSend: true, window };
      }
    }
  }

  return { shouldSend: false };
}

async function sendReminder(deadline, hoursWindow) {
  if (!RESEND_API_KEY || !EMAIL_TO) {
    throw new Error('Missing required environment variables: RESEND_API_KEY and EMAIL_TO');
  }

  const resend = new Resend(RESEND_API_KEY);
  const deadlineTime = new Date(deadline.deadline_time);

  const subject = `⚽ FPL Reminder: Gameweek ${deadline.id} deadline in ${hoursWindow} hours!`;

  const html = `
    <h2>Fantasy Premier League Reminder</h2>
    <p><strong>Gameweek ${deadline.id}</strong></p>
    <p><strong>Deadline:</strong> ${deadlineTime.toLocaleString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/London'
    })} (UK Time)</p>
    <p>Don't forget to set up your team!</p>
    <p><a href="https://fantasy.premierleague.com/">Go to FPL →</a></p>
  `;

  if (isDryRun) {
    console.log('\n🧪 DRY RUN - Would send email:');
    console.log('To:', EMAIL_TO);
    console.log('From:', EMAIL_FROM);
    console.log('Subject:', subject);
    console.log('Body:', html);
    return;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: EMAIL_TO,
      subject: subject,
      html: html,
    });

    if (error) {
      throw error;
    }

    console.log(`✅ Email sent successfully (ID: ${data.id})`);
    saveSentReminder(deadline.id, hoursWindow);
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

async function main() {
  console.log('🏃 FPL Reminder Check Running...');
  console.log('Time:', new Date().toISOString());

  if (isDryRun) {
    console.log('🧪 Running in DRY RUN mode - no emails will be sent');
  }

  try {
    // Fetch FPL data
    console.log('📡 Fetching FPL data...');
    const data = await fetchFPLData();

    // Get next deadline
    const nextDeadline = getNextDeadline(data.events);

    if (!nextDeadline) {
      console.log('ℹ️ No upcoming gameweeks found');
      return;
    }

    const deadlineTime = new Date(nextDeadline.deadline_time);
    const hoursUntil = ((deadlineTime - new Date()) / (1000 * 60 * 60)).toFixed(1);

    console.log(`\n📅 Next Deadline: Gameweek ${nextDeadline.id}`);
    console.log(`⏰ Time: ${deadlineTime.toISOString()}`);
    console.log(`⏳ Hours until deadline: ${hoursUntil}h`);

    // Check if reminder is needed
    const { shouldSend, window } = checkReminderNeeded(nextDeadline);

    if (shouldSend) {
      console.log(`\n📧 Sending ${window}h reminder...`);
      await sendReminder(nextDeadline, window);
    } else {
      console.log('\n✅ No reminder needed at this time');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
