import Layout from 'components/Layout';
import Loading from 'components/Loading';
import ProgressBar from 'components/ProgressBar';
import { request } from 'graphql-request';
import gql from 'graphql-tag';
import { QUEUE } from 'lib/const';
import { RefreshMarketTickerJob } from 'lib/types/interfaces';
import fetcher from 'lib/utils/fetcher';
import moment from 'moment';
import useSWR from 'swr';

import { createClient } from '../../prismicio';

const gqlFetcher = query => request('/api', query)

const JobQuery = gql`
  query JobQuery {
    jobs {
      id
      name
      queueName
      jobId
    }
  }
`

export async function getStaticProps({ previewData }) {
  const client = createClient({ previewData })

  const [page, global] = await Promise.all([
    client.getSingle('jobs'),
    client.getSingle('global'),
  ])

  return {
    props: { page, global },
  }
}

const formatJobData = {
  [QUEUE.refresh.sp500TickerInfo]: (data: RefreshMarketTickerJob) => {
    return (
      <div>
        <p className="text-iced-500">Tickers</p>
        <p className="break-words text-xxs lg:text-xs">
          {data.tickers.map(d => d.symbol).join(',')}
        </p>
      </div>
    )
  },
}

function JobInfoTime({ date }: { date: string }) {
  const mDate = moment(date)
  return (
    <p className="text-xs">
      <span className="text-iced-500">Created</span> {mDate.fromNow()} -{' '}
      {mDate.format('M-D h:mma')}
    </p>
  )
}

function JobInfo({ data }) {
  const children = data.job?.children
  const hasChildren = children?.length > 0
  const messageParts = data.message.includes('/')
    ? data.message.split('/')
    : null

  return (
    <div>
      <p>
        <span className="text-iced-500">State</span> {data.state}
      </p>
      <JobInfoTime date={data.job.createdAt} key={data.timestamp} />
      <p>
        <span className="text-maxYellow-500">
          {messageParts ? messageParts[0] : data.message}
        </span>
        {messageParts && (
          <>
            <span className="text-iced-500">/</span>
            {messageParts[1]}
          </>
        )}
      </p>
      <div className="text-xs">
        {data.job.progress > 0 && (
          <div className="flex text-iced-500">
            Progress:{' '}
            <ProgressBar
              className="ml-2 w-1/4 mb-1"
              value={data.job.progress}
            />
          </div>
        )}
        <p className="text-iced-500">
          Attempts:{' '}
          <span className="text-wash-300">{data.job.attemptsMade}</span>
        </p>
      </div>
      <div className="mt-6">
        {hasChildren && (
          <>
            <span className="text-iced-500 mb-1 block">
              Children
              <span className="text-ash-500 text-xxs">
                ({data.job.children.length})
              </span>
            </span>
            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {children.map(childJob => (
                <div key={childJob.id} className="mb-2 text-xs">
                  <p className="text-icedNeon-500">{childJob.name}</p>
                  <ProgressBar className="mb-1" value={childJob.progress} />
                  <p>
                    <span className="text-iced-500">Attempts</span>{' '}
                    <span className="text-wash-300">
                      {childJob.attemptsMade}
                    </span>
                  </p>
                  {formatJobData[childJob.name] && (
                    <div className="text-wash-300">
                      {formatJobData[childJob.name](childJob.data)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const Job = ({ job }) => {
  const { data, error } = useSWR(
    `/api/market/status?jobId=${job.jobId}&queueName=${job.queueName}`,
    fetcher,
    { refreshInterval: 1000 }
  )

  if (error) return <div className="mt-10">Job failed to load</div>
  if (!data)
    return (
      <div className="mt-10">
        <Loading />
      </div>
    )

  return (
    <article className="mt-10 ml-2">
      <h2>
        <span className="text-iced-500">Queue</span>{' '}
        <span>{job.queueName}</span>
      </h2>
      <h3>
        <span className="text-iced-500">Job</span> <span>{job.name}</span>
      </h3>
      {data ? (
        <div>
          {data.state ? (
            <JobInfo data={data} />
          ) : (
            <span className="text-crayolaRed-500">{data.message}</span>
          )}
        </div>
      ) : (
        <Loading />
      )}
    </article>
  )
}

const Jobs = ({ page, global }) => {
  const { error, data } = useSWR(JobQuery, gqlFetcher, {
    refreshInterval: 100,
  })

  if (!data) {
    return <Loading />
  }
  if (error) {
    return <div className="errorText">Error: {error.message}</div>
  }

  const jobs = data.jobs
  const jobsCount = jobs.length

  return (
    <Layout
      data={{
        page: { ...page.data, title: `${page.data.title}(${jobsCount})` },
        global: global.data,
      }}
    >
      <div className="mb-16 cursor-default">
        <h1 className="text-maxYellow-100">
          Jobs
          <span className="text-xs text-iced-500">
            ({jobsCount}
            {jobsCount === 0 && ' queued'})
          </span>
        </h1>
        {jobsCount > 0 &&
          jobs.map(job => {
            return <Job key={job.id} job={job} />
          })}
      </div>
    </Layout>
  )
}

export default Jobs
