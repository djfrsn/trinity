import * as Sentry from '@sentry/node';
import { Job } from 'bullmq';
import { QUEUE } from 'lib/const';
import handleMarketIndexJobRequest from 'lib/marketIndex/handleMarketIndexJobRequest';
import { MarketIndexCronJob } from 'lib/types/interfaces';

/**
 * Description: Runs after all tickers for a given index have been updated(see: refreshTicker.ts)
 * @constructor
 */
export default async function refreshMarketIndexCronProcessor(
  job: Job<MarketIndexCronJob>
) {
  console.log('start refresh market index cron', job.name)

  switch (true) {
    case QUEUE.refresh.marketIndexes === job.queueName:
      const transaction = Sentry.startTransaction({
        op: 'refresh-market-index-cron',
        name: `${job.name}-${job.data.marketIndex.name}`,
      })
      console.log('data', job.data)
      const { error, job: dbJob } = await handleMarketIndexJobRequest({
        marketIndexId: job.data.marketIndex.id,
      })
      console.log('init market index', dbJob)
      console.log('err', error)
      await job.updateProgress(100)
      transaction.finish()
      break
    default:
      console.log(
        `refreshMarketIndexCron method not found to process job: ${job.queueName}`
      )
  }
}
