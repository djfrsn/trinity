import { FMPPrice, FMPTicker, TickerData } from 'lib/types/interfaces';

import chunk from '../utils/chunk';
import fetch from '../utils/fetch';

/**
 * Description: Connect to Financial Modeling Prep API for market data
 * @constructor
 * @see {@link https://site.financialmodelingprep.com/developer/docs}
 */
class FMPApi {
  apiKey: string
  apiUrl: string
  constructor() {
    this.apiUrl = process.env.NEXT_PUBLIC_FMP_API_URL
    this.apiKey = process.env.NEXT_PUBLIC_FMP_API_KEY
    this.getApiUrl = this.getApiUrl.bind(this)
  }

  getApiUrl(apiStr: string, version = 'v3') {
    const apiKeySeperator = apiStr.includes('?') ? '&' : '?'
    return encodeURI(
      `${this.apiUrl}/${version}/${apiStr}${apiKeySeperator}apikey=${this.apiKey}`
    )
  }

  get marketIndex() {
    const getApiUrl = this.getApiUrl

    return {
      async sp500(): Promise<FMPTicker[]> {
        return await fetch(getApiUrl('sp500_constituent'))
      },
    }
  }

  get core() {
    const getApiUrl = this.getApiUrl

    return {
      async dailyHistoricalPrice(
        tickers: string | string[] | TickerData[],
        query?: string
      ): Promise<{ symbol: string; historical: FMPPrice[] }[]> {
        let res: any = []
        const batchLimit = 3
        const tickersList = Array.isArray(tickers)
          ? chunk(tickers, batchLimit)
          : tickers

        if (Array.isArray(tickersList)) {
          for (const ticker of tickersList) {
            const arg = Array.isArray(ticker)
              ? ticker.map(item => item.symbol).join(',')
              : ticker

            const apiUrl = `historical-price-full/${arg}${
              query ? `?${query}` : ''
            }`

            let data: any = await fetch(getApiUrl(apiUrl))

            if (data?.historicalStockList) {
              res.push(...data.historicalStockList)
            } else if (data?.historical) {
              res.push(data)
            } else {
              throw new Error(`FMPApi Error: data not found fetching ${apiUrl}`)
            }
          }
        } else {
          res = await await fetch(
            getApiUrl(
              `historical-price-full/${tickers}${query ? `?${query}` : ''}`
            )
          )
          if (res.historical) res = [res]
        }

        return res
      },
    }
  }
}

export default FMPApi
