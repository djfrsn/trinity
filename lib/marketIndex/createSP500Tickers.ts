import { Ticker } from '@prisma/client';
import FMPApi from 'lib/data/FMPApi';
import prisma from 'lib/db/prisma';
import { MarketIndexJobOptions } from 'lib/types/interfaces';
import arrayHasItems from 'lib/utils/arrayHasItems';
import { beforeMarketCloseTime, withinMarketRefreshWindow } from 'lib/utils/time';

const fmpApi = new FMPApi()

/**
 * Description: Fetch and store list of S&P 500 tickers
 * @constructor
 */
export default async function createSP500Tickers(
  options: MarketIndexJobOptions
): Promise<Ticker[]> {
  const { marketIndex } = options
  const marketIndexId = marketIndex.id
  const tickerUpdateData = { marketIndexId: marketIndex.id }
  const shouldRefresh =
    beforeMarketCloseTime(marketIndex.lastRefreshed) &&
    withinMarketRefreshWindow()

  console.log(
    'createSP500Tickers => beforeMarketCloseTime',
    beforeMarketCloseTime(marketIndex.lastRefreshed)
  )
  console.log(
    'createSP500Tickers => withinMarketRefreshWindow',
    withinMarketRefreshWindow()
  )
  console.log('createSP500Tickers => shouldRefresh', shouldRefresh)

  if (shouldRefresh || process.env.FORCE_MARKET_TICKERS_REFRESH) {
    const tickerList = await fmpApi.marketIndex.sp500()

    if (arrayHasItems(tickerList)) {
      const symbolList = tickerList.map(ticker => ticker.symbol)
      const existingTickers = await prisma.ticker.findMany({
        where: { symbol: { in: symbolList } },
      })
      const existingTickersDict = existingTickers.reduce(
        (a, existingTicker) => ({
          ...a,
          [existingTicker.symbol]: { ...existingTicker },
        }),
        {}
      )
      const updateTickerList = []
      const createTickerList = tickerList.filter(ticker => {
        const existingTicker = existingTickersDict[ticker.symbol]
        const shouldUpdate = existingTicker?.marketIndexId !== marketIndexId

        if (existingTicker && shouldUpdate) {
          updateTickerList.push(ticker)
        }

        return !existingTicker
      })

      console.log('symbolList %s count', symbolList.length)
      console.log('Existing %s tickers', existingTickers.length)
      console.log('Creating %s tickers', createTickerList.length)
      console.log('Updating %s tickers', updateTickerList.length)

      // Remove existing tickers marked as SP500
      if (createTickerList.length + updateTickerList.length === 504) {
        await prisma.ticker.updateMany({
          where: { marketIndexId: marketIndexId },
          data: { marketIndexId: null },
        })
      }

      if (createTickerList.length) {
        await prisma.ticker.createMany({
          data: createTickerList.map(ticker => ({
            name: ticker.name,
            symbol: ticker.symbol,
            sector: ticker.sector,
            subSector: ticker.subSector,
            headQuarter: ticker.headQuarter,
            dateFirstAdded: ticker.dateFirstAdded,
            cik: ticker.cik,
            founded: ticker.founded,
            marketIndexId: tickerUpdateData.marketIndexId,
          })),
        })
      }

      if (updateTickerList.length) {
        await prisma.ticker.updateMany({
          where: {
            symbol: { in: updateTickerList.map(ticker => ticker.symbol) },
          },
          data: { marketIndexId: tickerUpdateData.marketIndexId },
        })
      }
    }
  }

  const sp500tickerList = await prisma.ticker.findMany({
    where: { marketIndexId: tickerUpdateData.marketIndexId },
  })

  return sp500tickerList
}
