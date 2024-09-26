import { MarketIndex } from '@prisma/client';
import classnames from 'classnames';
import LineChart from 'components/LineChart';
import Loading from 'components/Loading';
import { ModalButton } from 'components/Modal';
import { modalContent, modalContentIdVar } from 'lib/cache';
import { FetchMore } from 'lib/types';
import { Ticker as TickerType } from 'lib/types/interfaces';
import chartOptions from 'lib/utils/chartOptions';
import { getLineColor } from 'lib/utils/charts';
import chunk from 'lib/utils/chunk';
import getTimeSeriesHighLow from 'lib/utils/getTimeSeriesHighLow';
import { formatUSD } from 'lib/utils/numbers';
import { getHeaderHeight } from 'lib/utils/pages';
import reverseTimeSeries from 'lib/utils/reverseTimeSeries';
import React from 'react';
import { FaExclamationTriangle } from 'react-icons/fa';
import { FixedSizeGrid as Grid } from 'react-window';

import styles from './tickers.module.css';
import TickersUnavailable from './TickersUnavailable';

const Ticker = props => {
  const { className = '', style = {} } = props
  const {
    marketIndex,
    ticker: {
      id,
      symbol,
      name,
      founded,
      headQuarter,
      sector,
      subSector,
      timeSeries,
    },
  } = props.data

  const symbolTip = `${name}\n${sector}`

  if (timeSeries.length === 0)
    return (
      <div
        className={classnames(
          className,
          'flex flex-col items-center justify-content text-crayolaRed-500 text-center'
        )}
        style={style}
      >
        <div className="tooltip tooltip-info !pr-0 mt-2" data-tip={symbolTip}>
          {symbol}
        </div>
        <div className="mt-2 !pr-0">
          <FaExclamationTriangle />
        </div>
        <div className="mt-2 text-xxs !pr-0">Data Unavailable</div>
      </div>
    )

  const close = formatUSD(timeSeries[0].close)

  return (
    <div style={style} className={className}>
      <ModalButton
        className="flex flex-col"
        onClick={() => {
          const { high, low } = getTimeSeriesHighLow(timeSeries)

          modalContent({
            id,
            symbol,
            name,
            founded,
            headQuarter,
            sector,
            subSector,
            close,
            high,
            low,
            timeSeries,
            marketIndex,
          })
          modalContentIdVar(`${symbol}TickerInfo`)
        }}
      >
        <div className={'flex items-center z-10'}>
          <h2 className="whitespace-pre-line text-left">{symbol}</h2>
          {/* <h2
              className="tooltip tooltip-info whitespace-pre-line text-left z-100"
              data-tip={symbolTip}
            >
              {symbol}
            </h2> */}
          <div className="ml-2 text-wash-50 cursor-default">{close}</div>
        </div>
        <LineChart
          options={chartOptions.simple}
          data={{
            labels: timeSeries.map(series => series.date),
            datasets: [
              {
                label: symbol,
                data: reverseTimeSeries(timeSeries),
                borderColor: getLineColor(timeSeries),
              },
            ],
          }}
        />
      </ModalButton>
    </div>
  )
}

const MemoTicker: any = React.memo(Ticker, (prevProps, nextProps) => {
  /*
    avoid rendering ticker unless we change timeSeries or screen width
  */
  return (
    prevProps.data.ticker?.timeSeries[0]?.date ===
      nextProps.data.ticker?.timeSeries[0]?.date &&
    prevProps.data.containerWidth === nextProps.data.containerWidth
  )
})

const loadMoreItems = ({
  startIndex,
  stopIndex,
  fetchMore,
  data,
}: {
  startIndex: number
  stopIndex: number
  fetchMore: FetchMore
  data: TickerType[]
}) => {
  console.log('startIndex', startIndex)
  fetchMore({
    variables: { offset: startIndex, limit: stopIndex - startIndex },
  })
}

const CellLoading = ({ style }) => {
  return (
    <div
      className={classnames(
        'flex flex-col items-center justify-content text-crayolaRed-500 text-center'
      )}
      style={style}
    >
      <Loading />
    </div>
  )
}

const Cell = ({ index, style, rowIndex, columnIndex, data }) => {
  const row = data[rowIndex]
  const tickerData = row && row[columnIndex]

  if (!tickerData) return null

  return <MemoTicker key={index} style={style} data={tickerData} />
}

const TickerList = ({
  count = 100,
  containerWidth,
  height,
  width,
  data,
  marketIndex,
}) => {
  const columnCount = 5
  const gridData = chunk(data, columnCount, {
    props: { containerWidth, marketIndex },
    chunkPropName: 'ticker',
  })
  const cellWidth = width / columnCount
  const cellHeight = (width / columnCount) * 0.75
  const rowCount = Math.ceil(count / columnCount)

  return (
    <Grid
      className={classnames(styles.tickerGrid, [
        styles[`tickerGrid-col-${columnCount}`],
      ])}
      columnCount={columnCount}
      columnWidth={cellWidth}
      height={height}
      rowCount={rowCount}
      rowHeight={cellHeight}
      width={width}
      itemData={gridData}
    >
      {Cell}
    </Grid>
  )
}

const Tickers = ({
  count,
  containerWidth,
  height,
  width,
  data,
  marketIndex,
  fetchMore,
}: {
  count: number
  containerWidth: number
  width: number
  height: number
  data: TickerType[]
  marketIndex: MarketIndex
  fetchMore: FetchMore
}) => {
  height = height - getHeaderHeight(width)
  return (
    <div
      className={classnames({ hidden: height <= 0 }, `mt-2 lg:mt-8`)}
      style={{ height: `${height}px` }}
    >
      <div>
        {data.length > 0 ? (
          <TickerList
            count={count}
            containerWidth={containerWidth}
            height={height}
            width={width}
            data={data}
            marketIndex={marketIndex}
          />
        ) : (
          <TickersUnavailable />
        )}
      </div>
    </div>
  )
}

export default Tickers
