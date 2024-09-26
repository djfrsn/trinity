import { Job, MarketIndex, MarketInterval, Ticker as _Ticker, TickerInfo } from '@prisma/client';

export interface Ticker extends _Ticker {
  timeSeries: TickerInfo[]
}

export interface IndexJob {
  error?: { message: string }
  job?: Job
}

export interface MarketIndexCronJob {
  timeframe: string
  marketIndex: MarketIndex
}

export interface TickerData {
  symbol: string
  tickerId: number
}

export interface RefreshMarketJob {
  marketIndex: MarketIndex
  marketInterval: MarketInterval
}
export interface RefreshMarketJobOptions {
  query?: string
  job: any
}

export interface RefreshMarketTickerJob {
  tickers: TickerData[]
  symbolDict: { [name: string]: { tickerId: string } }
  marketInterval: MarketInterval
}

export interface CreateSp500TickerOptions {
  query?: string
  job: any
}

export interface MarketIndexJobOptions {
  marketIndex: MarketIndex
}

export interface FMPTicker {
  symbol: string
  name: string
  sector: string
  subSector: string
  headQuarter: string
  dateFirstAdded: string
  lastRefreshed: string
  cik: string
  founded: string
}

export interface FMPPrice {
  date: string
  close: string
  open?: string
  change?: number
  changePercent?: number
}
