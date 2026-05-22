import StitchScreen from '../components/StitchScreen'
import loginHtml from '../stitch-assets/login.html?raw'

function LoginPage() {
  return <StitchScreen html={loginHtml} showNav={false} />
}

export default LoginPage
