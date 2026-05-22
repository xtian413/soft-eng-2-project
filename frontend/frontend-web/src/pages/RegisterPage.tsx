import StitchScreen from '../components/StitchScreen'
import registerHtml from '../stitch-assets/register.html?raw'

function RegisterPage() {
  return <StitchScreen html={registerHtml} showNav={false} />
}

export default RegisterPage
