import { useQuery } from '@apollo/client';
import { MarketIndex as MarketIndexType } from '@prisma/client';
import Container from 'components/Container';
import Layout from 'components/Layout';
import MarketIndex from 'components/MarketIndex';
import { MarketIndexQuery } from 'lib/graphql';
import { Pages } from 'lib/types/enums';
import { getMarketPageOptions } from 'lib/utils/pages';
import { useRouter } from 'next/router';

import { createClient } from '../../prismicio';

export async function getStaticProps({ previewData }) {
  const client = createClient({ previewData })

  const [page, global] = await Promise.all([
    client.getSingle(Pages.markets),
    client.getSingle('global'),
  ])

  return {
    props: { page, global },
  }
}

const MarketPageLayout = ({
  appwidth = null,
  mainheight = null,
  mainwidth = null,
  data,
  marketName,
  limit,
  timeSeriesLimit,
}) => {
  return data?.marketIndex ? (
    <MarketIndex
      marketIndex={data.marketIndex}
      tickerCount={data.marketIndex.tickerCount}
      mainWidth={mainwidth}
      appWidth={appwidth}
      height={mainheight}
      width={mainwidth}
      marketIndexId={data.marketIndex.id}
      limit={limit}
      timeSeriesLimit={timeSeriesLimit}
    />
  ) : (
    <div className="text-crayolaRed-500">Market "{marketName}" not found.</div>
  )
}

const MarketPage = ({ page, global }) => {
  const routerQuery = useRouter().query
  const { marketName, limit, timeSeriesLimit } =
    getMarketPageOptions(routerQuery)
  const {
    loading,
    error,
    data,
  }: {
    loading?: boolean
    error?: { message: string }
    data: { marketIndex: MarketIndexType }
  } = useQuery(MarketIndexQuery, {
    fetchPolicy: 'cache-and-network',
    variables: { name: marketName, timeSeriesLimit },
  })

  return (
    <Container loading={loading} error={error}>
      <Layout
        mainOverflow="overflow-visible"
        data={{ page: page.data, global: global.data }}
      >
        <MarketPageLayout
          data={data}
          marketName={marketName}
          limit={limit}
          timeSeriesLimit={timeSeriesLimit}
        />
      </Layout>
    </Container>
  )
}

export default MarketPage
