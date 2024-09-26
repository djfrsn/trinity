import * as Sentry from '@sentry/node';
import { Job, JobNode } from 'bullmq';
import { QUEUE } from 'lib/const';
import prisma from 'lib/db/prisma';
import { getSp500RefreshFlow } from 'lib/db/queue';
import createSP500TickerInfo from 'lib/marketIndex/createSP500TickerInfo';
import { MarketIndex } from 'lib/types/enums';
import { RefreshMarketTickerJob } from 'lib/types/interfaces';
import { getDependenciesCount } from 'lib/utils/bullmq';
import { getMostRecentBusinessDay, momentBusiness, normalizeDate } from 'lib/utils/time';

let parent: JobNode | null

/**
 * Description: Run job to fetch and store data for a list of tickers like FCX,GOOG,MMM
 * @constructor
 */
export default async function refreshMarketTickerProcessor(
  job: Job<RefreshMarketTickerJob>
) {
  console.log('start refresh ticker job', job.name)

  switch (true) {
    case QUEUE.refresh.sp500TickerInfo === job.name:
      const transaction = Sentry.startTransaction({
        op: 'refresh-market-ticker',
        name: `${job.name}-${job.data.tickers.join(',')}`,
      })
      // Note that we set the transaction as the span on the scope.
      // This step makes sure that if an error happens during the lifetime of the transaction
      // the transaction context will be attached to the error event
      Sentry.configureScope(scope => {
        scope.setSpan(transaction)
      })

      if (parent?.job?.id !== job.parent.id) {
        parent = await getSp500RefreshFlow(job.parent.id, 1)
      }

      const marketIndex = await prisma.marketIndex.findFirst({
        where: { name: MarketIndex.sp500 },
      })
      const mostRecentBusinessDay = getMostRecentBusinessDay()
      const lastRefreshed =
        marketIndex.lastRefreshed && normalizeDate(marketIndex.lastRefreshed)
      // get num of days passed since lastRefreshed
      const dayDiff = lastRefreshed
        ? momentBusiness(mostRecentBusinessDay).businessDiff(lastRefreshed)
        : null
      const query =
        dayDiff > 0 && typeof marketIndex.lastRefreshed === 'string'
          ? `serietype=line&timeseries=${dayDiff}`
          : ``
      const onComplete = []

      await createSP500TickerInfo(job.data, { query, job })

      await job.updateProgress(100)

      const dependencies = await parent.job.getDependencies()
      const totalJobCount = getDependenciesCount(dependencies)
      const progressIncrement = Number((100 / totalJobCount).toFixed(2))
      let progress = progressIncrement + Number(parent.job.progress)

      await Promise.all([
        ...onComplete,
        parent.job.updateProgress(
          progressIncrement > 100 ? 100 : Number(progress.toFixed(2))
        ),
      ])
      transaction.finish()
      break
    default:
      console.log(
        `refreshMarketIndexTicker method not found to process job: ${job.name}`
      )
  }
}
