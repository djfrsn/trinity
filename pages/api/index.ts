import { gql } from '@apollo/client';
import { Prisma } from '@prisma/client';
import { ApolloServerPluginCacheControl } from 'apollo-server-core';
import { ApolloServer } from 'apollo-server-micro';
import responseCachePlugin from 'apollo-server-plugin-response-cache';
import { DateTimeResolver } from 'graphql-scalars';
import cors from 'micro-cors';
import { NextApiHandler } from 'next';
import { asNexusMethod, intArg, makeSchema, nonNull, objectType, stringArg } from 'nexus';
import path from 'path';

import { serverCache } from '../../lib/cache';
import sentryPlugin from '../../lib/utils/sentry-plugin';
import { minutesToMilliseconds, timeAgo } from '../../lib/utils/time';
import context from './context';

global.__basedir = `${__dirname}/../..`

export const GQLDate = asNexusMethod(DateTimeResolver, 'date')

const largeDatasetCacheHint = { maxAge: 3600 }

function parseTimeSeriesOptions(args) {
  const options: { take?: Prisma.UserFindManyArgs['take'] } = {}
  const takeLimit = Number(process.env.NEXT_PUBLIC_FEED_TIME_SERIES_LIMIT)

  if (args.limit) options.take = args.limit
  else
    options.take = Number(
      process.env.NEXT_PUBLIC_FEED_TIME_SERIES_LIMIT_DEFAULT
    )

  if (options.take > takeLimit) options.take = takeLimit

  return options
}

const User = objectType({
  name: 'User',
  definition(t) {
    t.int('id')
    t.string('name')
    t.string('email')
  },
})

const Contract = objectType({
  name: 'Contract',
  definition(t) {
    t.string('id')
    t.string('label')
    t.string('name')
    t.boolean('isCall')
    t.boolean('active')
    t.int('strikePrice')
    t.field('dateLive', { type: 'DateTime' })
    t.field('dateExpires', { type: 'DateTime' })
    t.string('underlyingAsset')
    t.string('derivativeType')
    t.string('openInterest')
    t.string('min_increment')
    t.string('multiplier')
  },
})

const Job = objectType({
  name: 'Job',
  definition(t) {
    t.string('id')
    t.field('createdAt', { type: 'DateTime' })
    t.string('modelId')
    t.string('modelName')
    t.string('jobId')
    t.string('name')
    t.string('queueName')
  },
})

const MarketIndexCount = objectType({
  name: 'MarketIndexCount',
  definition(t) {
    t.int('count')
  },
})

const MarketIndex = objectType({
  name: 'MarketIndex',
  definition(t) {
    t.int('id')
    t.string('name')
    t.string('displayName')
    t.string('symbol')
    t.field('lastRefreshed', { type: 'DateTime' })
    t.field('tickerCount', {
      type: MarketIndexCount,
      resolve: async (parent, __, ctx, info) => {
        info.cacheControl.setCacheHint(largeDatasetCacheHint)
        return {
          count: ctx.prisma.ticker.count({
            where: { marketIndexId: Number(parent.id) },
          }),
        }
      },
    })
    t.list.field('tickers', {
      type: 'Ticker',
      resolve: async (parent, __, ctx, info) => {
        info.cacheControl.setCacheHint(largeDatasetCacheHint)
        return ctx.prisma.ticker.findMany({
          where: { marketIndexId: Number(parent.id) },
        })
      },
    })
    t.list.field('timeSeries', {
      type: 'TickerInfo',
      args: {
        limit: intArg(),
      },
      resolve: (parent, args: { limit: number }, ctx, info) => {
        info.cacheControl.setCacheHint(largeDatasetCacheHint)
        const opts = parseTimeSeriesOptions(args)

        return ctx.prisma.tickerInfo.findMany({
          orderBy: { date: 'desc' },
          where: {
            marketIndexId: parent.id,
            date: {
              gte: timeAgo(opts.take).toDate(),
            },
          },
        })
      },
    })
  },
})

const Ticker = objectType({
  name: 'Ticker',
  definition(t) {
    t.int('id')
    t.string('symbol')
    t.string('name')
    t.string('sector')
    t.string('subSector')
    t.string('headQuarter')
    t.string('founded')
    t.int('marketIndexId')
    t.list.field('timeSeries', {
      type: 'TickerInfo',
      args: {
        limit: intArg(),
      },
      resolve: (parent, args: { limit: number }, ctx, info) => {
        info.cacheControl.setCacheHint(largeDatasetCacheHint)
        const opts = parseTimeSeriesOptions(args)

        return ctx.prisma.tickerInfo.findMany({
          orderBy: { date: 'desc' },
          where: {
            tickerId: parent.id,
            date: {
              gte: timeAgo(opts.take).toDate(),
            },
          },
        })
      },
    })
  },
})

const TickerInfo = objectType({
  name: 'TickerInfo',
  definition(t) {
    t.int('id')
    t.field('date', { type: 'DateTime' })
    t.int('intervalId')
    t.string('interval')
    t.string('open')
    t.string('close')
    t.string('high')
    t.string('low')
    t.string('volume')
    t.nullable.string('tickerId')
  },
})

const Query = objectType({
  name: 'Query',
  definition(t) {
    t.list.field('contracts', {
      type: 'Contract',
      resolve: (_, args, ctx) => {
        return ctx.prisma.contract.findMany()
      },
    })

    t.list.field('jobs', {
      type: 'Job',
      resolve: (_, args, ctx, info) => {
        info.cacheControl.setCacheHint({ maxAge: 0 })
        return ctx.prisma.job.findMany()
      },
    })

    t.field('marketIndexTickerCount', {
      args: {
        name: stringArg(),
      },
      type: 'MarketIndex',
      resolve: async (_, args: { name: string }, ctx) => {
        return ctx.prisma.marketIndex.findFirst({
          where: { name: args.name },
          include: {
            _count: {
              select: { tickers: true },
            },
          },
        })
      },
    })

    t.field('marketIndex', {
      args: {
        name: stringArg(),
        id: intArg(),
      },
      type: 'MarketIndex',
      resolve: async (_, args: { name: string; id: number }, ctx, info) => {
        let where = {}

        if (args.name) {
          where = { name: args.name }
        } else if (args.id) {
          where = { id: args.id }
        }

        return ctx.prisma.marketIndex.findFirst({
          where,
        })
      },
    })

    t.field('ticker', {
      args: {
        symbol: stringArg(),
        offset: intArg(),
        limit: intArg(),
      },
      type: 'Ticker',
      resolve: async (
        _,
        args: {
          symbol: string
          offset: number
          limit: number
          cursor: number
        },
        ctx,
        info
      ) => {
        info.cacheControl.setCacheHint(largeDatasetCacheHint)
        const options: {
          take?: Prisma.UserFindManyArgs['take']
          where?: { symbol: string }
          skip?: number
          cursor?: { id: number }
          orderBy: { symbol: string }
        } = { orderBy: { symbol: 'asc' } }
        if (args.symbol) options.where = { symbol: args.symbol }
        if (args.limit) options.take = args.limit
        if (args.offset) options.skip = args.offset
        if (args.cursor) {
          options.skip = 1
          options.cursor = { id: args.cursor }
        }

        return ctx.prisma.ticker.findFirst(options)
      },
    })

    t.list.field('marketIndexTickers', {
      args: {
        marketIndexId: intArg(),
        offset: intArg(),
        limit: intArg(),
        cursor: intArg(),
      },
      type: 'Ticker',
      resolve: async (
        _,
        args: {
          marketIndexId: number
          offset: number
          limit: number
          cursor: number
        },
        ctx,
        info
      ) => {
        info.cacheControl.setCacheHint(largeDatasetCacheHint)
        const options: {
          take?: Prisma.UserFindManyArgs['take']
          where?: { marketIndexId: number }
          skip?: number
          cursor?: { id: number }
          orderBy: { symbol: string }
        } = { orderBy: { symbol: 'asc' } }
        if (args.marketIndexId)
          options.where = { marketIndexId: args.marketIndexId }
        if (args.limit) options.take = args.limit
        if (args.offset) options.skip = args.offset
        if (args.cursor) {
          options.skip = 1
          options.cursor = { id: args.cursor }
        }
        return ctx.prisma.ticker.findMany(options)
      },
    })
  },
})

const Mutation = objectType({
  name: 'Mutation',
  definition(t) {
    t.field('signupUser', {
      type: 'User',
      args: {
        name: stringArg(),
        email: nonNull(stringArg()),
      },
      resolve: (_, { name, email }, ctx) => {
        return ctx.prisma.user.create({
          data: {
            name,
            email,
          },
        })
      },
    })
  },
})

export const schema = makeSchema({
  types: [
    Query,
    Mutation,
    GQLDate,
    User,
    Job,
    Contract,
    MarketIndex,
    Ticker,
    TickerInfo,
  ],
  outputs: {
    typegen: path.join(process.cwd(), 'generated/nexus-typegen.ts'),
    schema: path.join(process.cwd(), 'generated/schema.graphql'),
  },
})

export const config = {
  api: {
    bodyParser: false,
    responseLimit: '8mb',
  },
}

const typeDefs = gql`
  extend type Query {
    isModalOpen: Boolean!
    modalContentId: String
  }
`

const apolloServer = new ApolloServer({
  schema,
  context,
  cache: serverCache,
  plugins: [
    sentryPlugin,
    responseCachePlugin(),
    ApolloServerPluginCacheControl({
      defaultMaxAge: minutesToMilliseconds(5),
    }),
  ],
  typeDefs,
})

const startServer = apolloServer.start()
let apolloServerHandler: NextApiHandler

async function getApolloServerHandler() {
  if (!apolloServerHandler) {
    await startServer
    apolloServerHandler = apolloServer.createHandler({
      path: '/api',
    })
  }

  return apolloServerHandler
}

const handler: NextApiHandler = async (req, res) => {
  const apolloServerHandler = await getApolloServerHandler()

  if (req.method === 'OPTIONS') {
    res.end()
    return
  }

  return apolloServerHandler(req, res)
}

export default cors()(handler)
