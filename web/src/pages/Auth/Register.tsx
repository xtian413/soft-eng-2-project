import React, { useState } from 'react';
import { Card } from '../../components/ui/Card/Card';
import { Input } from '../../components/ui/Input/Input';
import { Button } from '../../components/ui/Button/Button';
import { Checkbox } from '../../components/ui/Checkbox/Checkbox';
import './Auth.css';

interface RegisterProps {
  onNavigateToLogin: () => void;
  onRegisterSuccess?: (formData: any) => void;
}

export const Register: React.FC<RegisterProps> = ({
  onNavigateToLogin,
  onRegisterSuccess
}) => {
  // Account Details
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Physical Stats & Goal
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('cm');
  const [height, setHeight] = useState('');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [weight, setWeight] = useState('');
  const [goal, setGoal] = useState<'lose_weight' | 'build_muscle' | 'maintain'>('lose_weight');

  // Validation errors
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    let isValid = true;

    // Stats
    if (!height) {
      newErrors.height = 'Height is required';
      isValid = false;
    } else if (isNaN(Number(height)) || Number(height) <= 0) {
      newErrors.height = 'Enter a valid height';
      isValid = false;
    }

    if (!weight) {
      newErrors.weight = 'Weight is required';
      isValid = false;
    } else if (isNaN(Number(weight)) || Number(weight) <= 0) {
      newErrors.weight = 'Enter a valid weight';
      isValid = false;
    }

    // Account Details
    if (!fullName) {
      newErrors.fullName = 'Full Name is required';
      isValid = false;
    }

    if (!email) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
      isValid = false;
    }

    if (!password) {
      newErrors.password = 'Password is required';
      isValid = false;
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
      isValid = false;
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
      isValid = false;
    } else if (confirmPassword !== password) {
      newErrors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }

    if (!termsAccepted) {
      newErrors.terms = 'You must accept the Terms & Conditions';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    // Simulate API callback
    setTimeout(() => {
      setIsLoading(false);
      const data = {
        fullName,
        email,
        password,
        gender,
        height: `${height} ${heightUnit}`,
        weight: `${weight} ${weightUnit}`,
        goal
      };
      
      if (onRegisterSuccess) {
        onRegisterSuccess(data);
      } else {
        alert(`Account successfully created for: ${email}\nStats: Height ${height}${heightUnit}, Weight ${weight}${weightUnit}\nGoal: ${goal}`);
      }
    }, 1200);
  };

  return (
    <div className="lumina-auth-page" style={{ paddingTop: '96px' }}>
      {/* Top Navigation Appbar */}
      <header className="lumina-auth-appbar">
        <button
          type="button"
          aria-label="Go back to Login"
          className="lumina-auth-back-btn"
          onClick={onNavigateToLogin}
          disabled={isLoading}
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
      </header>

      {/* Decorative Blur Backgrounds */}
      <div className="lumina-auth-glow">
        <div className="lumina-auth-glow-register-1" />
        <div className="lumina-auth-glow-register-2" />
      </div>

      <div className="lumina-auth-container lumina-auth-container-wide">
        {/* Header */}
        <section className="lumina-auth-header lumina-auth-header-left">
          <h1 className="lumina-auth-title">Let's Personalize Your Coach</h1>
          <p className="lumina-auth-subtitle">
            We use your stats to customize your AI plan. All data stays local.
          </p>
        </section>

        <form onSubmit={handleSubmit} className="lumina-auth-form">
          {/* Account Details First */}
          <div className="lumina-auth-form" style={{ gap: '16px' }}>
            <Input
              type="text"
              placeholder="Full Name"
              leftIcon="person"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              error={errors.fullName}
              disabled={isLoading}
            />

            <Input
              type="email"
              placeholder="Email Address"
              leftIcon="mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              disabled={isLoading}
            />

            <Input
              type="password"
              placeholder="Create Password"
              leftIcon="lock"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              disabled={isLoading}
            />

            <Input
              type="password"
              placeholder="Confirm Password"
              leftIcon="lock"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={errors.confirmPassword}
              disabled={isLoading}
            />
          </div>

          {/* Floating Glassmorphism Physical Stats & Goal Card (moved below confirm password) */}
          <Card className="lumina-register-card" style={{ marginTop: '16px' }}>
            {/* Gender Toggle Row */}
            <div className="lumina-register-card-header">
              <span className="lumina-register-card-title">Your Physical Stats</span>
              <div className="lumina-gender-toggle">
                <button
                  type="button"
                  className={`lumina-gender-btn ${gender === 'male' ? 'lumina-gender-btn-active' : ''}`}
                  onClick={() => setGender('male')}
                  disabled={isLoading}
                >
                  Male
                </button>
                <button
                  type="button"
                  className={`lumina-gender-btn ${gender === 'female' ? 'lumina-gender-btn-active' : ''}`}
                  onClick={() => setGender('female')}
                  disabled={isLoading}
                >
                  Female
                </button>
              </div>
            </div>

            {/* Height Input */}
            <div className="lumina-stat-input-row">
              <div className="lumina-stat-input-header">
                <label className="lumina-input-label" style={{ margin: 0 }}>Height</label>
                <div className="lumina-stat-unit-toggle">
                  <span
                    className={`lumina-stat-unit-btn ${heightUnit === 'cm' ? 'lumina-stat-unit-btn-active' : ''}`}
                    onClick={() => setHeightUnit('cm')}
                  >
                    CM
                  </span>
                  <span className="lumina-stat-unit-divider">|</span>
                  <span
                    className={`lumina-stat-unit-btn ${heightUnit === 'ft' ? 'lumina-stat-unit-btn-active' : ''}`}
                    onClick={() => setHeightUnit('ft')}
                  >
                    FT
                  </span>
                </div>
              </div>
              <Input
                type="number"
                placeholder={heightUnit === 'cm' ? '180' : '5.9'}
                leftIcon="straighten"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                error={errors.height}
                disabled={isLoading}
                className="font-mono-stats"
                style={{ fontStyle: 'normal' }}
              />
            </div>

            {/* Weight Input */}
            <div className="lumina-stat-input-row">
              <div className="lumina-stat-input-header">
                <label className="lumina-input-label" style={{ margin: 0 }}>Weight</label>
                <div className="lumina-stat-unit-toggle">
                  <span
                    className={`lumina-stat-unit-btn ${weightUnit === 'kg' ? 'lumina-stat-unit-btn-active' : ''}`}
                    onClick={() => setWeightUnit('kg')}
                  >
                    KG
                  </span>
                  <span className="lumina-stat-unit-divider">|</span>
                  <span
                    className={`lumina-stat-unit-btn ${weightUnit === 'lbs' ? 'lumina-stat-unit-btn-active' : ''}`}
                    onClick={() => setWeightUnit('lbs')}
                  >
                    LBS
                  </span>
                </div>
              </div>
              <Input
                type="number"
                step="0.1"
                placeholder={weightUnit === 'kg' ? '75.0' : '165.3'}
                leftIcon="scale"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                error={errors.weight}
                disabled={isLoading}
                className="font-mono-stats"
                style={{ fontStyle: 'normal' }}
              />
            </div>

            {/* Goal Selector Component (corresponds to goal text column) */}
            <div className="lumina-stat-input-row" style={{ marginTop: '8px' }}>
              <label className="lumina-input-label">Fitness Goal</label>
              <div className="lumina-goal-selector">
                <button
                  type="button"
                  className={`lumina-goal-btn ${goal === 'lose_weight' ? 'lumina-goal-btn-active' : ''}`}
                  onClick={() => setGoal('lose_weight')}
                  disabled={isLoading}
                >
                  <span className="material-symbols-outlined">trending_down</span>
                  <span>Lose Weight</span>
                </button>
                <button
                  type="button"
                  className={`lumina-goal-btn ${goal === 'build_muscle' ? 'lumina-goal-btn-active' : ''}`}
                  onClick={() => setGoal('build_muscle')}
                  disabled={isLoading}
                >
                  <span className="material-symbols-outlined">fitness_center</span>
                  <span>Build Muscle</span>
                </button>
                <button
                  type="button"
                  className={`lumina-goal-btn ${goal === 'maintain' ? 'lumina-goal-btn-active' : ''}`}
                  onClick={() => setGoal('maintain')}
                  disabled={isLoading}
                >
                  <span className="material-symbols-outlined">change_history</span>
                  <span>Maintain</span>
                </button>
              </div>
            </div>
          </Card>

          {/* Terms & Conditions Checkbox */}
          <div style={{ marginTop: '16px' }}>
            <Checkbox
              label={
                <>
                  I agree to the <span style={{ color: '#0ea5e9', fontWeight: 700 }}>Terms & Conditions</span> and acknowledge the Privacy Policy regarding my local data.
                </>
              }
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              error={errors.terms}
              disabled={isLoading}
            />
          </div>

          {/* Action Action Buttons */}
          <div className="lumina-auth-footer" style={{ marginTop: '24px', width: '100%' }}>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={isLoading}
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Button>

            <p className="lumina-auth-footer-text" style={{ marginTop: '24px' }}>
              Already have an account?
              <span
                className="lumina-auth-footer-link"
                onClick={onNavigateToLogin}
              >
                Log In
              </span>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
