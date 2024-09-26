import getJob from 'lib/db/getJob';
import prisma from 'lib/db/prisma';
import createMarketIndexJob from 'lib/marketIndex/createMarketIndexJob';
import { IndexJob } from 'lib/types/interfaces';

interface handleMarketIndexJobRequestOptions {
  marketIndexId: number | string
}

async function handleMarketIndexJobRequest(
  options: handleMarketIndexJobRequestOptions
): Promise<IndexJob> {
  let marketIndexId = options.marketIndexId
  let result: IndexJob = {}

  if (marketIndexId) {
    const prevJobWhereArgs = { modelId: Number(marketIndexId) }
    const previousJob = await prisma.job.findFirst({ where: prevJobWhereArgs })
    // remove the previous job before we create the next
    if (previousJob)
      await prisma.job.update({
        where: prevJobWhereArgs,
        data: { jobId: null },
      })

    const marketIndex = await prisma.marketIndex.findFirst({
      where: { id: Number(marketIndexId) },
    })

    if (marketIndex) {
      result = await getJob({ modelId: marketIndex.id })

      if (!result.job?.jobId) {
        result = await createMarketIndexJob(marketIndex)
      }
    } else {
      result.error = {
        message: `MarketIndex with id of ${marketIndexId} not found`,
      }
    }
  } else {
    result.error = { message: 'marketIndexId required in body.' }
  }

  return result
}

export default handleMarketIndexJobRequest
