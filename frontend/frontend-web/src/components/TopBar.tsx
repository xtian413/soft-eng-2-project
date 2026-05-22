import './TopBar.css'

type TopBarProps = {
  title: string
  subtitle?: string
}

function TopBar({ title, subtitle }: TopBarProps) {
  return (
    <header className="top-bar">
      <div>
        <p className="top-bar__eyebrow">Aura Performance</p>
        <h1>{title}</h1>
        {subtitle ? <p className="top-bar__subtitle">{subtitle}</p> : null}
      </div>
      <button className="button button--primary" type="button">
        Start session
      </button>
    </header>
  )
}

export default TopBar
