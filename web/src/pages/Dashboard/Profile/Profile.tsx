import './Profile.css';

export function Profile({ fullName, goal }: any) {
  return (
    <div className="gemi-profile-container">
      {/* Profile Header */}
      <section className="gemi-profile-header-section">
        <div className="gemi-profile-avatar">
          <img alt="User Profile Photo" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCsdX6YOtjRLiOpo0ulf0YC6uO7WNcvCrtfdbYjn6OZkwvfvQfZHMFfUTLvv8YetueH7IxGCxjfYG-lvxjVNVNq7PpuuP1xWEzb6fufVwBSiUlNjS0DkAfRxip8pNEM0cs1Xvh9qhAE-b9CrIXKGau-DN_smTwJRPyZL0Pqgf8eXSW3_ZX-4Ppz5sl4eXwm1KIkRjnfTnMMsPjMb77FewqNDdlATqw3f5tGYfpW6HriTXt5JTdifTdZwEtyQZoRmpZIvAiNZpr-8QqA" />
        </div>
        <div className="gemi-profile-info">
          <div className="gemi-profile-name-row">
            <h2 className="gemi-profile-name">{fullName.split(' ')[0]} R.</h2>
            <span className="gemi-profile-pro-badge">Pro</span>
          </div>
          <p className="gemi-profile-phase">
            <span className="gemi-profile-phase-dot"></span>
            {goal.replace('_', ' ')} Phase
          </p>
        </div>
        <button className="gemi-profile-settings-btn">
          <span className="material-symbols-outlined">settings</span>
        </button>
      </section>

      {/* Stats Bento Grid */}
      <section className="gemi-profile-stats-grid">
        <div className="gemi-profile-stat-card">
          <div className="gemi-profile-stat-icon-wrapper" style={{ backgroundColor: 'rgba(14, 165, 233, 0.1)' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: '20px' }}>fitness_center</span>
          </div>
          <div>
            <p className="gemi-profile-stat-value">84<span style={{ fontSize: '24px', color: 'var(--outline-variant)' }}>k</span></p>
            <p className="gemi-profile-stat-label">Total Volume</p>
          </div>
        </div>

        <div className="gemi-profile-stat-card">
          <div className="gemi-profile-stat-icon-wrapper" style={{ backgroundColor: 'rgba(157, 67, 0, 0.1)' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--secondary)', fontSize: '20px' }}>local_fire_department</span>
          </div>
          <div>
            <p className="gemi-profile-stat-value">12</p>
            <p className="gemi-profile-stat-label">Week Streak</p>
          </div>
        </div>
      </section>

      {/* Training Calendar Section */}
      <section className="gemi-profile-calendar">
        <div className="gemi-profile-calendar-header">
          <h3 className="gemi-profile-calendar-title">Training Calendar</h3>
          <button style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '14px' }}>View All</button>
        </div>
        
        <div className="gemi-profile-calendar-scroll">
          <div className="gemi-profile-day-card">
            <span style={{ fontSize: '12px', color: 'var(--outline)' }}>Mon</span>
            <span style={{ fontSize: '24px', fontWeight: 'bold', margin: '4px 0 8px 0' }}>26</span>
            <span style={{ fontSize: '10px', background: 'rgba(255, 219, 202, 0.5)', color: 'var(--secondary)', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>Push</span>
          </div>
          
          <div className="gemi-profile-day-card today">
            <span style={{ fontSize: '12px', color: 'var(--primary)' }}>Tue</span>
            <span style={{ fontSize: '24px', fontWeight: 'bold', margin: '4px 0 8px 0', color: 'var(--primary)' }}>27</span>
            <span style={{ fontSize: '10px', background: 'rgba(201, 230, 255, 0.5)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>Legs</span>
          </div>
          
          <div className="gemi-profile-day-card" style={{ opacity: 0.8 }}>
            <span style={{ fontSize: '12px', color: 'var(--outline)' }}>Wed</span>
            <span style={{ fontSize: '24px', fontWeight: 'bold', margin: '4px 0 8px 0' }}>28</span>
            <span style={{ fontSize: '10px', background: 'rgba(255, 223, 154, 0.5)', color: 'var(--tertiary)', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>Pull</span>
          </div>
        </div>
      </section>
    </div>
  );
}