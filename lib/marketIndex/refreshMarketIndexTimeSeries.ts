import FMPApi from 'lib/data/FMPApi';
import prisma from 'lib/db/prisma';
import { RefreshMarketJob, RefreshMarketJobOptions } from 'lib/types/interfaces';
import arrayHasItems from 'lib/utils/arrayHasItems';
import { normalizeDate } from 'lib/utils/time';
import moment from 'moment';

const fmpApi = new FMPApi()

/**
 * Description: Fetch and store Timeseries from FMP daily historical API, compare new data with existing to prevent dupes
 * @constructor
 */
export default async function refreshMarketIndexTimeSeries(
  { marketIndex, marketInterval }: RefreshMarketJob,
  options: RefreshMarketJobOptions
): Promise<{ count: number }> {
  let res = { count: 0 }
  const marketIndexId = marketIndex.id
  const [tickerPrices, existingTickerInfo] = await Promise.all([
    fmpApi.core.dailyHistoricalPrice(marketIndex.symbol, options.query),
    prisma.tickerInfo.findMany({
      where: { marketIndexId },
    }),
  ])

  console.log('Refreshing market index', marketIndex.symbol)

  const existingTickerInfoDict = existingTickerInfo.reduce(
    (a, existingTickerInfo) => ({
      ...a,
      [normalizeDate(moment(existingTickerInfo.date)).toISOString()]: {
        ...existingTickerInfo,
      },
    }),
    {}
  )

  if (arrayHasItems(tickerPrices)) {
    const tickerPriceData = tickerPrices.reduce((allTickers, ticker) => {
      const historicalTickerPrices = ticker.historical.reduce(
        (historicalInfo, tick) => {
          const date = normalizeDate(moment(tick.date)).toISOString()
          const shouldUpdate = !existingTickerInfoDict[date]

          if (shouldUpdate) {
            historicalInfo.push({
              marketIndexId,
              intervalId: marketInterval.id,
              date,
              close: String(tick.close),
              change: tick.change,
              changePercent: tick.changePercent,
            })
          }

          return historicalInfo
        },
        []
      )

      if (historicalTickerPrices.length) {
        allTickers = allTickers.concat(historicalTickerPrices)
      }

      return allTickers
    }, [])

    console.log('ticker info update count', tickerPriceData.length)

    if (tickerPriceData.length) {
      res = await prisma.tickerInfo.createMany({
        data: tickerPriceData,
      })
    }
  }

  return res
}
