import { useQuery } from '@apollo/client';
import Container from 'components/Container';
import Layout from 'components/Layout';
import TickerDetails from 'components/stocks/TickerDetails';
import prisma from 'lib/db/prisma';
import { TickerQuery } from 'lib/graphql';
import { Ticker } from 'lib/types/interfaces';
import getRouterQueryParams from 'lib/utils/getRouterQueryParams';
import getTimeSeriesHighLow from 'lib/utils/getTimeSeriesHighLow';
import { formatUSD } from 'lib/utils/numbers';
import { GetStaticPaths } from 'next/types';
import { useState } from 'react';

import { createClient } from '../../prismicio';

export async function getStaticProps({ previewData, params: { symbol } }) {
  const client = createClient({ previewData })

  const global = await client.getSingle('global')

  return {
    props: { global, symbol },
  }
}

export default function StockPage(props) {
  let days = Number(process.env.NEXT_PUBLIC_INDEX_TIME_SERIES_LIMIT_DEFAULT)
  if (typeof window !== 'undefined') {
    const params = getRouterQueryParams()
    // @ts-ignore
    if (params.days) days = Number(params.days)
  }

  const [timeSeriesLimit, setTimeSeriesLimit] = useState(days)
  const {
    loading,
    error,
    data,
  }: {
    loading?: boolean
    error?: { message: string }
    data: { ticker: Ticker }
  } = useQuery(TickerQuery, {
    fetchPolicy: 'cache-and-network',
    variables: { symbol: props.symbol, timeSeriesLimit },
  })

  const ticker = data?.ticker

  const timeSeries = ticker?.timeSeries
  const { high, low } = timeSeries
    ? getTimeSeriesHighLow(timeSeries)
    : { high: null, low: null }
  const close =
    Array.isArray(timeSeries) && timeSeries.length
      ? formatUSD(timeSeries[0].close)
      : null

  return (
    <Container loading={loading} error={error}>
      <Layout
        data={{
          page: {
            title: `${data?.ticker.symbol} - Stock Info`,
            description: `${data?.ticker.symbol} - ${data?.ticker.name} company and stock price information`,
          },
          global: props.global?.data,
        }}
      >
        <TickerDetails
          data={{ ...data?.ticker, high, low, close }}
          timeSeriesLimit={timeSeriesLimit}
          setTimeSeriesLimit={setTimeSeriesLimit}
        />
      </Layout>
    </Container>
  )
}

export const getStaticPaths: GetStaticPaths = async () => {
  const tickers = await prisma.ticker.findMany({
    take: 10,
    orderBy: { symbol: 'asc' },
  })

  return {
    paths: tickers.map(ticker => ({
      params: {
        symbol: ticker.symbol,
      },
    })),
    fallback: true,
  }
}
