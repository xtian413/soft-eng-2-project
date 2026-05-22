import React, { useState } from 'react';
import { Input } from '../../components/ui/Input/Input';
import { Button } from '../../components/ui/Button/Button';
import './Auth.css';

interface LoginProps {
  onNavigateToRegister: () => void;
  onLoginSuccess?: (email: string) => void;
}

export const Login: React.FC<LoginProps> = ({
  onNavigateToRegister,
  onLoginSuccess
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const validateForm = () => {
    let isValid = true;
    setEmailError('');
    setPasswordError('');

    if (!email) {
      setEmailError('Email address is required');
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Please enter a valid email address');
      isValid = false;
    }

    if (!password) {
      setPasswordError('Password is required');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    // Simulate API callback
    setTimeout(() => {
      setIsLoading(false);
      if (onLoginSuccess) {
        onLoginSuccess(email);
      } else {
        alert(`Successfully logged in as: ${email}`);
      }
    }, 1000);
  };

  return (
    <div className="lumina-auth-page">
      {/* Ambient background decoration */}
      <div className="lumina-auth-glow">
        <div className="lumina-auth-glow-1" />
        <div className="lumina-auth-glow-2" />
      </div>

      <div className="lumina-auth-container">
        {/* Logo Icon box */}
        <div className="lumina-auth-logo-box">
          <span className="lumina-auth-logo-text">A</span>
        </div>

        {/* Header */}
        <div className="lumina-auth-header">
          <h1 className="lumina-auth-title">Welcome Back</h1>
          <p className="lumina-auth-subtitle">Ready to hit today's targets?</p>
        </div>

        {/* Form Container */}
        <form className="lumina-auth-form" onSubmit={handleSubmit}>
          {/* Email Input */}
          <Input
            type="email"
            placeholder="Email Address"
            leftIcon="mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={emailError}
            shape="pill"
            disabled={isLoading}
            required
          />

          {/* Password Input */}
          <Input
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            leftIcon="lock"
            rightIcon={showPassword ? 'visibility_off' : 'visibility'}
            onRightIconClick={togglePasswordVisibility}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={passwordError}
            shape="pill"
            disabled={isLoading}
            required
          />

          {/* Forgot Password link */}
          <div className="lumina-auth-forgot-link">
            <button
              type="button"
              className="lumina-auth-forgot-btn"
              onClick={() => alert('Forgot password link clicked (stub)')}
              disabled={isLoading}
            >
              Forgot Password?
            </button>
          </div>

          {/* Login Action Button */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            shape="pill"
            fullWidth
            disabled={isLoading}
            style={{ marginTop: '8px' }}
          >
            {isLoading ? 'Logging In...' : 'Log In'}
          </Button>
        </form>

        {/* Divider */}
        <div className="lumina-auth-divider">
          <div className="lumina-auth-divider-line" />
          <span className="lumina-auth-divider-text">Or continue with</span>
          <div className="lumina-auth-divider-line" />
        </div>

        {/* Social Buttons */}
        <div className="lumina-auth-social-grid">
          {/* Google */}
          <button
            type="button"
            className="lumina-auth-social-btn"
            onClick={() => alert('Sign in with Google')}
            disabled={isLoading}
          >
            <svg className="lumina-auth-social-svg" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            <span>Google</span>
          </button>

          {/* Apple */}
          <button
            type="button"
            className="lumina-auth-social-btn"
            onClick={() => alert('Sign in with Apple')}
            disabled={isLoading}
          >
            <svg className="lumina-auth-social-svg" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.05 20.28c-.96.95-2.22 1.72-3.72 1.72-1.45 0-2.2-.84-3.55-.84-1.37 0-2.18.84-3.57.84-1.4 0-2.65-.77-3.66-1.77C.6 18.28-.9 14.1.85 10.8c.87-1.63 2.53-2.65 4.34-2.65 1.37 0 2.45.82 3.25.82s1.88-.82 3.25-.82c1.55 0 2.92.76 3.75 1.75-3.04 1.4-2.55 5.5.4 6.78-.6 1.45-1.18 2.62-1.79 3.6zM13.53 5.4c.05-1.28-.46-2.55-1.3-3.48-.84-.92-2.1-1.44-3.3-1.44-.05 1.3.5 2.54 1.34 3.44.82.93 2.12 1.48 3.26 1.48z" fill="#000000" />
            </svg>
            <span>Apple</span>
          </button>
        </div>

        {/* Footer */}
        <div className="lumina-auth-footer">
          <p className="lumina-auth-footer-text">
            New to Aura?
            <span
              className="lumina-auth-footer-link"
              onClick={onNavigateToRegister}
            >
              Register Now
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};
