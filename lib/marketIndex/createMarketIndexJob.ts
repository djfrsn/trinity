import { Job, MarketIndex } from '@prisma/client';
import { CreateMarketIndexJob } from 'lib/types';
import { IndexJob, MarketIndexJobOptions } from 'lib/types/interfaces';

import createSP500RefreshJob from './createSP500RefreshJob';

// addSP500UpdateJobs()
type MarketIndexMethod = (options: MarketIndexJobOptions) => Promise<Job>

const createJob: { [name: string]: MarketIndexMethod } = {
  async sp500(options: MarketIndexJobOptions) {
    const results = await createSP500RefreshJob(options)

    return results
  },
}

async function createMarketIndexJob(
  marketIndex: MarketIndex
): CreateMarketIndexJob {
  let result: IndexJob = { error: null, job: null }
  const create = createJob[marketIndex.name]

  if (create) {
    result.job = await create({ marketIndex })
  } else {
    result.error = { message: `Job flow not found for ${marketIndex.name}` }
  }

  return result
}

export default createMarketIndexJob
