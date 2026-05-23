import React, { useState } from 'react';
import type { WorkoutItem } from './types';
import './Lift.css';

export const Lift: React.FC = () => {
  const [workouts] = useState<WorkoutItem[]>([
    { id: 1, name: 'Incline Dumbbell Press', sets: '3 sets x 8-10 reps', rpe: '8.5', icon: 'fitness_center' },
    { id: 2, name: 'Chest-Supported Row', sets: '3 sets x 10-12 reps', rpe: '8.0', icon: 'fitness_center' },
    { id: 3, name: 'Standing Overhead Press', sets: '2 sets x 8 reps', rpe: '9.0', icon: 'fitness_center' },
    { id: 4, name: 'Dual Cable Lat Pulldown', sets: '3 sets x 12 reps', rpe: '8.0', icon: 'fitness_center' },
    { id: 5, name: 'Triceps Overhead Extension', sets: '2 sets x 12-15 reps', rpe: '8.5', icon: 'fitness_center' },
    { id: 6, name: 'Incline Dumbbell Curl', sets: '2 sets x 10-12 reps', rpe: '9.0', icon: 'fitness_center' }
  ]);

  return (
    <div className="lumina-weekly-card">
      <h2 className="lumina-weekly-title" style={{ marginBottom: '16px' }}>Today's Hypertrophy Workout</h2>
      <div className="lumina-workout-grid">
        {workouts.map((workout) => (
          <div key={workout.id} className="lumina-workout-card">
            <div className="lumina-workout-info">
              <div className="lumina-workout-icon-box">
                <span className="material-symbols-outlined">{workout.icon}</span>
              </div>
              <div className="lumina-workout-details">
                <span className="lumina-workout-name">{workout.name}</span>
                <span className="lumina-workout-sets">{workout.sets}</span>
              </div>
            </div>
            <span className="lumina-workout-rpe-badge">RPE {workout.rpe}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
