import './AIChat.css';

export function AIChat() {
  return (
    <div className="gemi-chat-container">
      <div className="gemi-chat-history">
        <div className="gemi-chat-timestamp">Today, 2:45 PM</div>

        {/* AI Message */}
        <div className="gemi-chat-bubble-row">
          <div className="gemi-chat-avatar">
            <span className="material-symbols-outlined" style={{ color: 'var(--primary-container)', fontSize: '16px', fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
          </div>
          <div className="gemi-chat-bubble ai">
            Your strength was down slightly today during your compound lifts. Let’s look at your carb intake over the last 24 hours to see if we can optimize your energy for tomorrow's session.
          </div>
        </div>

        {/* User Message */}
        <div className="gemi-chat-bubble-row user">
          <div className="gemi-chat-bubble user">
            I think I missed logging my pre-workout snack. It was just a large banana and some black coffee.
          </div>
        </div>

        {/* AI Analysis Message */}
        <div className="gemi-chat-bubble-row">
          <div className="gemi-chat-avatar">
            <span className="material-symbols-outlined" style={{ color: 'var(--primary-container)', fontSize: '16px', fontVariationSettings: "'FILL' 1" }}>bolt</span>
          </div>
          <div className="gemi-chat-bubble ai" style={{ position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-16px', right: '-16px', width: '96px', height: '96px', background: 'rgba(14, 165, 233, 0.1)', filter: 'blur(20px)', borderRadius: '50%' }}></div>
            <p style={{ position: 'relative', zIndex: 10 }}>Got it. A large banana adds about 31g of fast-digesting carbs. I've updated your daily total.</p>
            
            <div style={{ marginTop: '12px', background: 'rgba(255,255,255,0.6)', padding: '8px', borderRadius: '8px', border: '1px solid var(--surface-container)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary-container)' }}></span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--on-surface-variant)' }}>Carbs Today</span>
              </div>
              <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '20px' }}>142g <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--outline)' }}>/ 250g</span></span>
            </div>
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="gemi-chat-input-area">
        <div className="gemi-chat-input-wrapper">
          <div className="gemi-chat-input-box">
            <textarea 
              className="gemi-chat-textarea" 
              placeholder="Ask your coach anything..." 
              rows={1}
            />
            <button className="gemi-chat-send-btn">
              <span className="material-symbols-outlined" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>send</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}