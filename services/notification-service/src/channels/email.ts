/**
 * Email channel — sends via AWS SES in production, logs in development.
 */

import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { config, isDev } from '../config.js';
import { logger } from '../logger.js';

let _sesClient: SESClient | null = null;

function getSesClient(): SESClient {
  if (!_sesClient) {
    _sesClient = new SESClient({ region: config.awsRegion });
  }
  return _sesClient;
}

export async function sendEmail(
  to: string,
  subject: string,
  body: string,
  htmlBody?: string,
): Promise<void> {
  if (isDev) {
    logger.info('[DEV] sendEmail — not sending via SES', {
      to,
      subject,
      bodyPreview: body.slice(0, 120),
    });
    return;
  }

  const client = getSesClient();

  const command = new SendEmailCommand({
    Source: config.sesFromAddress,
    Destination: { ToAddresses: [to] },
    Message: {
      Subject: { Data: subject, Charset: 'UTF-8' },
      Body: {
        Text: { Data: body, Charset: 'UTF-8' },
        ...(htmlBody ? { Html: { Data: htmlBody, Charset: 'UTF-8' } } : {}),
      },
    },
  });

  try {
    const result = await client.send(command);
    logger.info('email_sent', { to, subject, messageId: result.MessageId });
  } catch (err) {
    logger.error('email_send_error', { to, subject, error: String(err) });
    throw err;
  }
}
