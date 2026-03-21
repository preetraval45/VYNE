/**
 * Push notification channel — sends via AWS SNS in production, logs in development.
 */

import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { config, isDev } from '../config.js';
import { logger } from '../logger.js';

let _snsClient: SNSClient | null = null;

function getSnsClient(): SNSClient {
  if (!_snsClient) {
    _snsClient = new SNSClient({ region: config.awsRegion });
  }
  return _snsClient;
}

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export async function sendPushNotification(
  deviceToken: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  if (isDev) {
    logger.info('[DEV] sendPushNotification — not sending via SNS', {
      deviceToken: deviceToken.slice(0, 16) + '...',
      title,
      body,
      data,
    });
    return;
  }

  const client = getSnsClient();

  // SNS Mobile Push message format (APNs / FCM via SNS platform application)
  const payload: PushPayload = { title, body, ...(data ? { data } : {}) };
  const message = JSON.stringify({
    default: `${title}: ${body}`,
    GCM: JSON.stringify({
      notification: { title, body },
      data: payload.data ?? {},
    }),
    APNS: JSON.stringify({
      aps: { alert: { title, body } },
      ...(payload.data ?? {}),
    }),
  });

  const command = new PublishCommand({
    TargetArn: deviceToken, // In SNS, device token is registered as an endpoint ARN
    Message: message,
    MessageStructure: 'json',
  });

  try {
    const result = await client.send(command);
    logger.info('push_sent', { deviceToken: deviceToken.slice(0, 16), title, messageId: result.MessageId });
  } catch (err) {
    logger.error('push_send_error', { deviceToken: deviceToken.slice(0, 16), title, error: String(err) });
    throw err;
  }
}
