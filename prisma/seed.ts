import { Prisma, PrismaClient } from '@prisma/client';
import { MarketIndex, MarketInterval } from 'lib/types/enums';

const prisma = new PrismaClient()

const userData: Prisma.UserCreateInput[] = [
  {
    name: 'Dennis',
    email: `dennis@${process.env.NEXT_PUBLIC_SITE_URL}`,
  },
]

const marketIndexData = [
  {
    name: MarketIndex.sp500,
    displayName: 'S&P 500',
    symbol: '^GSPC',
  },
]

const marketIntervalData = [
  {
    name: MarketInterval.oneday,
  },
]

export async function main() {
  try {
    console.log(`Start seeding ...`)
    for (const u of userData) {
      const user = await prisma.user.create({
        data: u,
      })
      console.log(`Created user with id: ${user.id}`)
    }
    for (const u of marketIntervalData) {
      const marketInterval = await prisma.marketInterval.create({
        data: u,
      })
      console.log(`Created market interval with id: ${marketInterval.id}`)
    }
    for (const u of marketIndexData) {
      const marketIndex = await prisma.marketIndex.create({
        data: u,
      })
      console.log(`Created market index with id: ${marketIndex.id}`)
    }
    console.log(`Seeding finished.`)
  } catch (err) {
    console.error(err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
