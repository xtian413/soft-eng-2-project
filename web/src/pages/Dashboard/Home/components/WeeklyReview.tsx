import React from 'react';

export const WeeklyReview: React.FC = () => {
  return (
    <section className="lumina-weekly-card">
      <div className="lumina-weekly-header">
        <h2 className="lumina-weekly-title">Weekly Review</h2>
        <div className="lumina-streak-badge">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
          14 Day Streak
        </div>
      </div>
      
      <div className="lumina-streak-visualizer">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => (
          <div key={day + idx} className="lumina-streak-day-col">
            <span className={`lumina-streak-day-label ${idx === 4 ? 'lumina-streak-day-label-active' : ''}`}>{day}</span>
            <div className={`lumina-streak-day-circle ${
              idx < 4 ? 'lumina-streak-circle-checked' : 
              idx === 4 ? 'lumina-streak-circle-workout' : 'lumina-streak-circle-empty'
            }`}>
              {idx < 4 ? (
                <span className="material-symbols-outlined" style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}>check</span>
              ) : idx === 4 ? (
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>fitness_center</span>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <div className="lumina-streak-desc-box">
        <p className="lumina-streak-desc-text">
          Great job this week! You hit your protein goals 6 out of 7 days, maintaining a solid anabolic state. Your average caloric intake is tracking perfectly with your slight surplus target.
        </p>
      </div>
    </section>
  );
};
