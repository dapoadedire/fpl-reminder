# FPL Deadline Reminder

Automated email reminders for Fantasy Premier League gameweek deadlines. Never miss a deadline again!

## Features

- Fetches live FPL deadlines from official API
- Sends email reminders at 48h, 24h, and 2h before each deadline
- Runs automatically via GitHub Actions
- Tracks sent reminders to avoid duplicates
- Uses Resend for reliable email delivery

## Setup Instructions

### 1. Get a Resend API Key

1. Go to [resend.com](https://resend.com)
2. Sign up for a free account
3. Navigate to API Keys section
4. Create a new API key and copy it

### 2. Fork/Clone This Repository

```bash
git clone <your-repo-url>
cd 2026-01-01-fpl-reminder
```

### 3. Configure GitHub Secrets

Go to your repository Settings > Secrets and variables > Actions, and add these secrets:

- `RESEND_API_KEY`: Your Resend API key
- `EMAIL_TO`: Your email address to receive reminders
- `EMAIL_FROM`: Sender email (use `onboarding@resend.dev` for testing, or your verified domain)

### 4. Enable GitHub Actions

1. Go to the "Actions" tab in your repository
2. Enable workflows if prompted
3. The workflow will run automatically every hour

### 5. Manual Testing (Optional)

Test locally before deploying:

```bash
# Install dependencies
npm install

# Create .env file from example
cp .env.example .env

# Edit .env with your actual values
# Then run in dry-run mode
npm test

# Or run for real
npm start
```

## How It Works

1. **GitHub Actions** runs the script every hour
2. The script fetches the next FPL deadline from the official API
3. If the deadline is within 48h, 24h, or 2h window, it sends an email
4. Sent reminders are tracked in `sent-reminders.json` to prevent duplicates
5. The tracking file is automatically committed back to the repo

## Customization

### Change Reminder Times

Edit the `REMINDER_WINDOWS` array in `index.js`:

```javascript
const REMINDER_WINDOWS = [48, 24, 2]; // hours before deadline
```

### Change Check Frequency

Edit the cron schedule in `.github/workflows/fpl-reminder.yml`:

```yaml
schedule:
  - cron: '0 * * * *'  # Every hour
  # Examples:
  # - cron: '0 */2 * * *'  # Every 2 hours
  # - cron: '*/30 * * * *'  # Every 30 minutes
```

### Customize Email Template

Edit the `sendReminder()` function in `index.js` to modify the email content.

## Troubleshooting

### Emails not sending?

- Check that GitHub Actions workflow is enabled
- Verify your secrets are set correctly in repository settings
- Check the Actions logs for error messages
- Ensure your Resend API key is valid

### Want to test immediately?

1. Go to Actions tab
2. Select "FPL Reminder" workflow
3. Click "Run workflow" button
4. Use `--dry-run` flag to test without sending emails

### Manual trigger with dry-run

You can temporarily modify the workflow to use dry-run mode by changing:

```yaml
run: npm start
```

to:

```yaml
run: npm test
```

## License

MIT
