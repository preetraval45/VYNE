import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { logger } from './logger.js';

const client = new EventBridgeClient({
  region: process.env.AWS_REGION ?? 'us-east-1',
});

const EVENT_BUS = process.env.EVENTBRIDGE_BUS_NAME ?? 'vyne-events';

export async function publishEvent(
  detailType: string,
  detail: Record<string, unknown>,
  source = 'vyne.code-service'
): Promise<void> {
  try {
    await client.send(
      new PutEventsCommand({
        Entries: [
          {
            EventBusName: EVENT_BUS,
            Source: source,
            DetailType: detailType,
            Detail: JSON.stringify(detail),
            Time: new Date(),
          },
        ],
      })
    );
    logger.info('EventBridge event published', { detailType });
  } catch (err) {
    logger.error('Failed to publish EventBridge event', {
      detailType,
      error: (err as Error).message,
    });
  }
}
