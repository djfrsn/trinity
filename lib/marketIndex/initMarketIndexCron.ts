import { Job } from '@prisma/client'
import { Job as QueueJob, JobsOptions } from 'bullmq'
import { QUEUE } from 'lib/const'
import prisma from 'lib/db/prisma'
import { defaultJobOptions, refreshMarketsQueue } from 'lib/db/queue'
import { MarketInterval } from 'lib/types/enums'
import validKey from 'lib/utils/validKey'

interface MarketIndexesRefresh {
  error?: { message: string; data?: Job }
  jobs?: Job[]
}

/**
 * Description: Create a repeatable job to refresh data for each market index on all timeframes
 * NOTE: Preference would be to add the repeat option to each individual marketIndex flow, but BullMQ flows don't support repeat
 * IMPORTANT: Bull is smart enough not to add the same repeatable job if the repeat options are the same.
 * @see {@link https://docs.bullmq.io/guide/jobs/repeatable}
 * @constructor
 */
async function initMarketIndexCron(options: {
  access_key: string
}): Promise<MarketIndexesRefresh> {
  let result: MarketIndexesRefresh = {}

  if (validKey(options.access_key)) {
    const marketIndexes = await prisma.marketIndex.findMany()

    const queueJobs: Promise<QueueJob>[] = []
    let options: JobsOptions = defaultJobOptions

    if (process.env.MARKET_INDEX_CRON_ENABLED === 'true')
      options.repeat = { cron: QUEUE.cron.marketIndexes }

    // create job for each timeframe available
    marketIndexes.forEach(marketIndex => {
      Object.keys(MarketInterval).forEach(timeframe => {
        queueJobs.push(
          refreshMarketsQueue.add(
            `refresh-${timeframe}-${marketIndex.name}`,
            { timeframe, marketIndex },
            options
          )
        )
      })
    })

    const queue = await Promise.all(queueJobs)

    const whereArgs = { queueName: QUEUE.refresh.marketIndexes }

    const [_, __, jobs] = await prisma.$transaction([
      prisma.job.deleteMany({
        where: whereArgs,
      }),
      prisma.job.createMany({
        data: queue.map(job => ({
          name: job.name,
          queueName: QUEUE.refresh.marketIndexes,
          jobId: job.id,
        })),
      }),
      prisma.job.findMany({
        where: whereArgs,
      }),
    ])

    result.jobs = jobs
  } else {
    result.error = {
      message: 'Invalid access_key',
    }
  }

  return result
}

export default initMarketIndexCron
