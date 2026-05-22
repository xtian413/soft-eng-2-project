import './MetricCard.css'

type MetricCardProps = {
  label: string
  value: string
  trend?: string
  tone?: 'primary' | 'secondary' | 'tertiary'
}

function MetricCard({ label, value, trend, tone = 'primary' }: MetricCardProps) {
  return (
    <div className={`metric-card metric-card--${tone}`}>
      <p className="metric-card__label">{label}</p>
      <div className="metric-card__value">{value}</div>
      {trend ? <p className="metric-card__trend">{trend}</p> : null}
    </div>
  )
}

export default MetricCard
