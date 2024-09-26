import { FetchMore } from 'lib/types'
import { Ticker as TickerType } from 'lib/types/interfaces'
import { formatUSD } from 'lib/utils/numbers'
import Link from 'next/link'

import TickersUnavailable from './TickersUnavailable'

const TickersTable = ({
  data,
  timeSeriesLength,
}: {
  count: number
  timeSeriesLength: number
  containerWidth: number
  width: number
  height: number
  data: TickerType[]
  fetchMore: FetchMore
}) => {
  if (!data?.length) return <TickersUnavailable className="my-2 lg:my-4" />
  console.log('data', data)
  return (
    <div className="my-2 lg:my-4 overflow-x-auto">
      <table className="table table-compact w-full">
        <thead>
          <tr>
            <th></th>
            <th>Company</th>
            <th>Price</th>
            <th>Sector</th>
            <th>Sub Sector</th>
            <th>Last {timeSeriesLength} days</th>
          </tr>
        </thead>
        <tbody>
          {data.map(
            ({ id, name, symbol, sector, subSector, timeSeries }, index) => (
              <tr key={index}>
                <td>{index + 1}</td>
                <td>
                  <Link href={`/stocks/${symbol}`}>
                    <a>
                      <strong className="text-xl">{symbol}</strong> - {name}
                    </a>
                  </Link>
                </td>
                <td className="font-bold text-lg bg-neutral">
                  {timeSeries[0] ? formatUSD(timeSeries[0].close) : 'N/A'}
                </td>
                <td>{sector}</td>
                <td>{subSector}</td>
                <td>
                  <img
                    src={`/api/sparkline?id=${id}&days=${timeSeriesLength}`}
                    // src={`/img/stocks/sparklines/${id}-${timeSeries.length}.svg`}
                    alt={`${symbol} sparkline`}
                  />
                </td>
              </tr>
            )
          )}
        </tbody>
        <tfoot>
          <tr>
            <th></th>
            <th>Symbol</th>
            <th>Name</th>
            <th>Price</th>
            <th>Sector</th>
            <th></th>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

export default TickersTable
