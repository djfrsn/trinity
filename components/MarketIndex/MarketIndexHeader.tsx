import classnames from 'classnames';
import LineChart from 'components/LineChart';
import { ModalButton } from 'components/Modal';
import { modalContent, modalContentId } from 'lib/cache';
import { Pages } from 'lib/types/enums';
import chartOptions from 'lib/utils/chartOptions';
import { getLineColor } from 'lib/utils/charts';
import { format, moment, momentBusiness } from 'lib/utils/time';
import { FaInfoCircle } from 'react-icons/fa';

export const showMarketIndexInfo = (name, props = {}) => {
  modalContent({
    modalSize: 'large',
    marketName: name,
    ...props,
  })
  modalContentId(Pages.markets)
}

const MarketIndexHeader = ({ days, data }) => {
  const InfoButton = ({ className = '' }) => (
    <ModalButton
      className={className}
      onClick={() => showMarketIndexInfo(data.name)}
    >
      <FaInfoCircle className="text-xl text-accent hover:text-accent-focus transition-all" />
    </ModalButton>
  )
  const currentDate = momentBusiness()
  const timeAgo = currentDate.subtract(days, 'days')
  const latestTimeSeriesItem = data.timeSeries[0]
  const oldestTimeSeriesDate = timeAgo.format(format.standard)
  const latestTimeSeriesDate = momentBusiness(latestTimeSeriesItem.date).format(
    format.standard
  )

  return (
    <div className="flex md:flex-row flex-wrap">
      <div className="flex flex-max flex-wrap flex-row md:basis-1/2 cursor-default">
        <h1
          className="z-10 text-iced-300 tooltip tooltip-right tooltip-info"
          data-tip={`Last refreshed: ${moment(data.lastRefreshed).fromNow()}`}
        >
          {data.displayName}
        </h1>
        {latestTimeSeriesItem && (
          <>
            <span
              className={classnames(
                'z-0 ml-1 tooltip tooltip-info text-wash-50',
                {
                  hidden: !days,
                  ['animate-fadeIn']: days > 0,
                }
              )}
              data-tip={`${oldestTimeSeriesDate} - ${latestTimeSeriesDate}`}
            >
              {days}D
            </span>

            <div className="ml-2 text-xl">
              - {Number(latestTimeSeriesItem.close).toFixed(2)}
            </div>
          </>
        )}
        <div className="ml-4 w-16 xs:w-20 md:w-22 lg:w-24 mx-2">
          <LineChart
            options={chartOptions.simple}
            data={{
              labels: data.timeSeries.map(series => series.date),
              datasets: [
                {
                  label: data.symbol,
                  data: data.timeSeries.map(set => Number(set.close)).reverse(),
                  borderColor: getLineColor(data.timeSeries),
                },
              ],
            }}
          />
        </div>
        <InfoButton className="flex" />
      </div>
    </div>
  )
}

export default MarketIndexHeader
