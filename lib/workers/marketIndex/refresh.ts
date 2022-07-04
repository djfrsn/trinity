import { Job } from 'bullmq';
import { QUEUE } from 'lib/const';
import prisma from 'lib/db/prisma';
import { RefreshMarketIndexJob } from 'lib/interfaces';
import { getPreviousBusinessDay } from 'lib/utils/dates';

/**
 * Description: Runs after all tickers for a given index have been updated(see: refreshTicker.ts)
 * @constructor
 */
export default async function refreshMarketIndexProcessor(
  job: Job<RefreshMarketIndexJob>
) {
  console.log('start refresh market index job', job.name)

  switch (true) {
    case QUEUE.refresh.sp500 === job.name:
      console.log('job.data', job.data)
      const marketIndex = await prisma.marketIndex.findFirst({
        where: { id: job.data.id },
      })
      if (marketIndex) {
        await Promise.all([
          prisma.marketIndex.update({
            where: { id: job.data.id },
            data: { lastRefreshed: getPreviousBusinessDay().toISOString() },
          }),
        ])
      }
      await job.updateProgress(100)
      break
    default:
      console.log(
        `refreshMarketIndex method not found to process job: ${job.name}`
      )
  }
}
