import NavBar from './NavBar'
import { extractStitchHtml } from '../utils/stitchHtml'

type StitchScreenProps = {
  html: string
  showNav?: boolean
}

function StitchScreen({ html, showNav = true }: StitchScreenProps) {
  const { bodyHtml, bodyClass, headStyles } = extractStitchHtml(html)

  return (
    <div className="stitch-screen">
      <div
        className={`stitch-screen__body ${bodyClass}`.trim()}
        dangerouslySetInnerHTML={{ __html: bodyHtml }}
      />
      <div
        className="stitch-screen__styles"
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: headStyles }}
      />
      {showNav ? <NavBar /> : null}
    </div>
  )
}

export default StitchScreen
