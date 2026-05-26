import './Lift.css';

export function Lift() {
  return (
    <div className="gemi-lift-container">
      {/* Session Timer Widget */}
      <section className="gemi-lift-timer-section">
        <span className="gemi-lift-timer-label">Session Time</span>
        <div className="gemi-lift-timer-value">00:42:15</div>
      </section>

      {/* Active Exercise Canvas */}
      <section className="gemi-lift-canvas">
        <div className="gemi-lift-header">
          <div>
            <span className="gemi-lift-tag">Lower Body</span>
            <h2 className="gemi-lift-exercise-title">Back Squat</h2>
          </div>
          <div className="gemi-lift-unit-toggle">
            <button className="gemi-lift-unit-btn gemi-lift-unit-btn-active">lbs</button>
            <button className="gemi-lift-unit-btn">kg</button>
          </div>
        </div>

        {/* Inputs */}
        <div className="gemi-lift-inputs">
          <div className="gemi-lift-input-group">
            <label>Weight</label>
            <input type="number" className="gemi-lift-stat-input" defaultValue="225" />
          </div>
          <div className="gemi-lift-input-group">
            <label>Reps</label>
            <input type="number" className="gemi-lift-stat-input" defaultValue="8" />
          </div>
          <div className="gemi-lift-input-group">
            <label>RIR</label>
            <input type="number" className="gemi-lift-stat-input" defaultValue="1" />
          </div>
        </div>

        <button className="gemi-lift-log-btn">Log Set</button>

        {/* AI Insight */}
        <div className="gemi-lift-ai-whisper">
          <span className="material-symbols-outlined" style={{ color: '#8B5CF6', fontVariationSettings: "'FILL' 1" }}>temp_preferences_custom</span>
          <div>
            <h4>Insight</h4>
            <p>Your RIR is hitting 0 earlier than last week. Consider dropping the weight by 5 lbs for the next set.</p>
          </div>
        </div>

        <hr className="gemi-lift-divider" />

        {/* Set History */}
        <div className="gemi-lift-history">
          <div className="gemi-lift-history-header">
            <div>Set</div>
            <div>Previous</div>
            <div>Lbs x Reps</div>
            <div><span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check</span></div>
          </div>
          
          <div className="gemi-lift-set-row completed">
            <div style={{ textAlign: 'center', fontWeight: 'bold' }}>1</div>
            <div style={{ textAlign: 'center', fontSize: '14px', color: 'var(--outline)' }}>225 x 10</div>
            <div style={{ textAlign: 'center', fontWeight: 'bold' }}>225 x 10</div>
            <div><input type="checkbox" className="gemi-lift-set-checkbox" defaultChecked disabled /></div>
          </div>

          <div className="gemi-lift-set-row active">
            <div style={{ textAlign: 'center', fontWeight: 'bold' }}>3</div>
            <div style={{ textAlign: 'center', fontSize: '14px', color: 'var(--outline)' }}>225 x 8</div>
            <div style={{ textAlign: 'center', fontWeight: 'bold' }}>225 x 8</div>
            <div><input type="checkbox" className="gemi-lift-set-checkbox" defaultChecked /></div>
          </div>
        </div>
      </section>
    </div>
  );
}