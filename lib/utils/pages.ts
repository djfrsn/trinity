import { SCREENS } from 'lib/const';
import { MarketIndex } from 'lib/types/enums';

export function getMarketPageOptions(routerQuery) {
  const indexLimit = Number(process.env.NEXT_PUBLIC_INDEX_LIMIT)
  let limitQuery = routerQuery.limit ? Number(routerQuery.limit) : null
  limitQuery = limitQuery > indexLimit ? indexLimit : limitQuery
  const marketName = routerQuery.name || MarketIndex.sp500
  const timeSeriesLimitQuery = routerQuery.days
  const limit = null
  let timeSeriesLimit = timeSeriesLimitQuery
    ? Number(timeSeriesLimitQuery)
    : Number(process.env.NEXT_PUBLIC_INDEX_TIME_SERIES_LIMIT_DEFAULT)
  timeSeriesLimit =
    timeSeriesLimit > Number(process.env.NEXT_PUBLIC_INDEX_TIME_SERIES_LIMIT)
      ? Number(process.env.NEXT_PUBLIC_INDEX_TIME_SERIES_LIMIT)
      : timeSeriesLimit

  return { marketName, limit, timeSeriesLimit }
}

export const screenToNum = val => Number(val.replace('px', ''))

export const getHeaderHeight = width => {
  switch (true) {
    case width < 370:
      return 115
    default:
      return 48
  }
}

export const getTickerColumnCount = (width, timeSeriesLength) => {
  const isLgScreen = width >= screenToNum(SCREENS.lg)
  const isMdScreen = width >= screenToNum(SCREENS.md)
  const isSmScreen = width >= screenToNum(SCREENS.sm)

  switch (true) {
    case timeSeriesLength <= 7 && isLgScreen:
      return 8
    case timeSeriesLength < 15 && isLgScreen:
      return 6
    case timeSeriesLength <= 15 && isMdScreen:
    case timeSeriesLength <= 7 && isMdScreen:
      return 5
    case isLgScreen:
      return 5
    case isMdScreen:
      return 4
    case isSmScreen:
      return 3
    default:
      return 2
  }
}
