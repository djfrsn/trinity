import fs from 'fs'
import prisma from 'lib/db/prisma'
import { timeAgo } from 'lib/utils/time'
import { NextApiRequest, NextApiResponse } from 'next'
import sparkline from 'node-sparkline'
import path from 'path'
import { promisify } from 'util'

const writeFile = promisify(fs.writeFile)

// curl -H "Content-Type: application/json" -d "{\"access_key\": \"secret\"}" http://localhost:3000/api/market/jobs
// curl -H "Content-Type: application/json" -d "{\"access_key\": \"secret\"}" https://dennisjefferson.xyz/api/market/jobs
/**
 * Description: Schedule a repeatable job to update market indexes and related ticker info data
 * @constructor
 */
export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse
) {
  if (request.method === 'GET') {
    const { id, days } = request.query

    const idIsString = typeof id === 'string'

    if (!idIsString)
      return response
        .status(405)
        .send({ message: 'Query param with id as string required' })

    let svg = null
    // TODO: fetch data
    // TODO: convert to post route
    // TODO: add inline to refresh flow
    try {
      const idAsInt = Number(id)
      const timeSeries = await prisma.tickerInfo.findMany({
        orderBy: { date: 'desc' },
        where: {
          tickerId: idAsInt,
          date: {
            gte: timeAgo(Number(days)).toDate(),
          },
        },
      })
      console.log('days', days)
      console.log('timeSeries', timeSeries)
      if (timeSeries.length) {
        svg = sparkline({
          values: timeSeries.map(tick => Number(tick.close)),
          width: 135,
          height: 50,
          stroke: '#57bd0f',
          strokeWidth: 1.25,
          strokeOpacity: 1,
        })
      }
    } catch (e) {
      return response
        .status(405)
        .send({ message: e.toString ? e.toString() : e.message })
    }

    const dir = 'public/img/stocks/sparklines'

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    if (svg) await writeFile(path.join(dir, `/${id}-${days}.svg`), svg)

    return response.status(200).send(svg ? true : false)
  } else {
    return response.status(405).send({ message: 'Method not allowed' })
  }
}
