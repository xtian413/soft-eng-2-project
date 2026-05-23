import React from 'react';

interface CalorieRingProps {
  currentCalories: number;
  targetCalories: number;
}

export const CalorieRing: React.FC<CalorieRingProps> = ({
  currentCalories,
  targetCalories,
}) => {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const percentComplete = Math.min(100, (currentCalories / targetCalories) * 100);
  const strokeDashoffset = circumference - (circumference * percentComplete) / 100;

  return (
    <div className="lumina-progress-container">
      <svg className="lumina-circular-progress" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none" className="lumina-progress-bg" />
        <circle 
          cx="50" 
          cy="50" 
          r={radius}
          fill="none"
          className="lumina-progress-bar"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
        />
      </svg>
      <div className="lumina-progress-center-text">
        <span className="material-symbols-outlined lumina-progress-icon" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
        <span className="lumina-progress-desc">{currentCalories.toLocaleString()} eaten</span>
      </div>
    </div>
  );
};
