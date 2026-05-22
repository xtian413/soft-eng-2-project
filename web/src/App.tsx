import { useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Login } from './pages/Auth/Login';
import { Register } from './pages/Auth/Register';
import { Dashboard } from './pages/Dashboard/Dashboard';
import { Card } from './components/ui/Card/Card';
import { Button } from './components/ui/Button/Button';
import './App.css';

function App() {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState('');
  const [registeredData, setRegisteredData] = useState<any>(null);

  const handleLoginSuccess = (email: string) => {
    setUserEmail(email);
    // Dynamic welcome based on email prefix
    const namePrefix = email.split('@')[0];
    const friendlyName = namePrefix.charAt(0).toUpperCase() + namePrefix.slice(1);
    
    navigate('/dashboard', { 
      state: { 
        email, 
        fullName: friendlyName,
        goal: 'build_muscle' // default goal for login routing
      } 
    });
  };

  const handleRegisterSuccess = (data: any) => {
    setUserEmail(data.email);
    setRegisteredData(data);
    navigate('/success');
  };

  return (
    <Routes>
      {/* Auth Routing */}
      <Route 
        path="/login" 
        element={
          <Login
            onNavigateToRegister={() => navigate('/register')}
            onLoginSuccess={handleLoginSuccess}
          />
        } 
      />
      <Route 
        path="/register" 
        element={
          <Register
            onNavigateToLogin={() => navigate('/login')}
            onRegisterSuccess={handleRegisterSuccess}
          />
        } 
      />

      {/* Onboarding Success Page */}
      <Route 
        path="/success" 
        element={
          <div className="lumina-auth-page">
            <div className="lumina-auth-glow">
              <div className="lumina-auth-glow-register-1" />
              <div className="lumina-auth-glow-register-2" />
            </div>

            <div className="lumina-auth-container" style={{ maxWidth: '480px' }}>
              <Card style={{ width: '100%', textAlign: 'center', padding: '40px 32px' }}>
                <div className="lumina-auth-logo-box" style={{ margin: '0 auto 24px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#0ea5e9' }}>
                    celebration
                  </span>
                </div>
                
                <h1 className="lumina-auth-title" style={{ marginBottom: '16px' }}>
                  Account Ready!
                </h1>
                
                <p className="lumina-auth-subtitle" style={{ marginBottom: '32px' }}>
                  Welcome to <strong>Lumina AI Fitness</strong>, <span style={{ color: '#0ea5e9' }}>{registeredData?.fullName || userEmail}</span>. Your on-device personal training coach is initialized and ready to customize your local fitness plan.
                </p>

                {registeredData && (
                  <div style={{
                    textAlign: 'left',
                    backgroundColor: '#f8fafc',
                    padding: '20px',
                    borderRadius: '12px',
                    marginBottom: '32px',
                    border: '1px solid rgba(190, 200, 210, 0.2)'
                  }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 700, color: '#3e4850', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Your Initial Profile
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px', fontSize: '14px' }}>
                      {registeredData.fullName && (
                        <div style={{ gridColumn: 'span 2' }}>
                          <strong>Name:</strong> {registeredData.fullName}
                        </div>
                      )}
                      <div><strong>Gender:</strong> <span style={{ textTransform: 'capitalize' }}>{registeredData.gender}</span></div>
                      <div><strong>Height:</strong> {registeredData.height}</div>
                      <div><strong>Weight:</strong> {registeredData.weight}</div>
                      <div><strong>Privacy:</strong> On-Device Local</div>
                      {registeredData.goal && (
                        <div style={{ gridColumn: 'span 2', marginTop: '4px', borderTop: '1px dashed rgba(190, 200, 210, 0.4)', paddingTop: '8px' }}>
                          <strong>Goal:</strong> {
                            registeredData.goal === 'lose_weight' ? 'Lose Weight 📉' :
                            registeredData.goal === 'build_muscle' ? 'Build Muscle 💪' :
                            registeredData.goal === 'maintain' ? 'Maintain Balance ⚖️' : registeredData.goal
                          }
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    onClick={() => navigate('/dashboard', { state: registeredData })}
                  >
                    Launch Dashboard
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="md"
                    fullWidth
                    onClick={() => {
                      setUserEmail('');
                      setRegisteredData(null);
                      navigate('/login');
                    }}
                  >
                    Sign Out
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        } 
      />

      {/* Main App Dashboard */}
      <Route path="/dashboard" element={<Dashboard />} />

      {/* Default Catch-all Redirect */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
