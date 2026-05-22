import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './Dashboard.css';

type TabType = 'dashboard' | 'food' | 'lift' | 'chat' | 'profile';

interface Message {
  id: string;
  sender: 'assistant' | 'user';
  text: string;
}

interface FoodLog {
  id: string;
  name: string;
  protein: number;
  carbs: number;
  fats: number;
  calories: number;
}

interface Workout {
  id: string;
  name: string;
  sets: string;
  rpe: number;
  icon: string;
}

export function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Retrieve passed state from registration/login or use premium defaults
  const passedData = location.state || {};
  const [fullName] = useState(passedData.fullName || 'Christian Gamos');
  const [email] = useState(passedData.email || 'christian.gamos@lumina.ai');
  const [gender] = useState(passedData.gender || 'male');
  const [height] = useState(passedData.height || '178 cm');
  const [weight] = useState(passedData.weight || '75 kg');
  const [goal] = useState(passedData.goal || 'build_muscle');

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  // Macro progress totals
  const [proteinTotal, setProteinTotal] = useState(120);
  const [carbsTotal, setCarbsTotal] = useState(210);
  const [fatsTotal, setFatsTotal] = useState(45);

  // Targets based on goals
  const targetCalories = goal === 'build_muscle' ? 2800 : goal === 'lose_weight' ? 2000 : 2400;
  const targetProtein = goal === 'build_muscle' ? 180 : goal === 'lose_weight' ? 160 : 140;
  const targetCarbs = goal === 'build_muscle' ? 320 : goal === 'lose_weight' ? 180 : 260;
  const targetFats = goal === 'build_muscle' ? 80 : goal === 'lose_weight' ? 60 : 70;

  // Derived current calories
  const currentCalories = (proteinTotal * 4) + (carbsTotal * 4) + (fatsTotal * 9);
  const caloriesRemaining = Math.max(0, targetCalories - currentCalories);

  // SVG Progress Ring calculations
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const percentComplete = Math.min(100, (currentCalories / targetCalories) * 100);
  const strokeDashoffset = circumference - (percentComplete / 100) * circumference;

  // Food Tracker logs
  const [foodLogs, setFoodLogs] = useState<FoodLog[]>([
    { id: '1', name: 'Grilled Chicken Breast', protein: 35, carbs: 0, fats: 4, calories: 180 },
    { id: '2', name: 'Brown Rice & Broccoli', protein: 6, carbs: 45, fats: 2, calories: 220 },
    { id: '3', name: 'Whey Protein Shake', protein: 25, carbs: 3, fats: 1.5, calories: 130 },
  ]);

  // Workout routines (Lift tab)
  const [workouts] = useState<Workout[]>([
    { id: '1', name: 'Barbell Back Squats', sets: '4 sets x 8 reps (225 lbs)', rpe: 8, icon: 'fitness_center' },
    { id: '2', name: 'Incline Dumbbell Chest Press', sets: '3 sets x 10 reps (75 lbs)', rpe: 9, icon: 'fitness_center' },
    { id: '3', name: 'Weighted Pull-Ups', sets: '3 sets x 8 reps (Bodyweight + 20 lbs)', rpe: 8.5, icon: 'fitness_center' },
    { id: '4', name: 'Romanian Deadlifts', sets: '3 sets x 12 reps (185 lbs)', rpe: 7.5, icon: 'fitness_center' },
  ]);

  // Coach AI messages
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'assistant',
      text: `Hello ${fullName.split(' ')[0]}! I noticed your target goal is set to ${
        goal === 'build_muscle' ? 'Build Muscle 💪' :
        goal === 'lose_weight' ? 'Lose Weight 📉' : 'Maintain Balance ⚖️'
      }. I've compiled your customizable, offline plan. Let's make sure we hit your target of ${targetProtein}g of protein and keep your training intensity high. How can I help you today?`
    }
  ]);
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Auto scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Handle Quick Log Macro Shortcut
  const handleQuickLog = () => {
    const randomFoods = [
      { name: 'Peanut Butter Toast', protein: 8, carbs: 24, fats: 12, calories: 240 },
      { name: 'Greek Yogurt Bowl', protein: 18, carbs: 12, fats: 0, calories: 120 },
      { name: 'Mixed Almonds Pack', protein: 6, carbs: 5, fats: 14, calories: 160 },
      { name: 'Oven Baked Salmon', protein: 28, carbs: 0, fats: 14, calories: 240 },
    ];
    const food = randomFoods[Math.floor(Math.random() * randomFoods.length)];
    
    setProteinTotal((p) => Math.min(targetProtein, p + food.protein));
    setCarbsTotal((c) => Math.min(targetCarbs, c + food.carbs));
    setFatsTotal((f) => Math.min(targetFats, f + food.fats));

    const newLog: FoodLog = {
      id: Date.now().toString(),
      ...food
    };
    setFoodLogs((prev) => [newLog, ...prev]);
  };

  // Handle Chat Submit
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: userInput
    };

    setMessages((prev) => [...prev, userMsg]);
    setUserInput('');
    setIsTyping(true);

    // Simulate Gemma Offline model inference lag
    setTimeout(() => {
      let coachResponse = "I've analyzed your daily metrics. Keep pushing hard to hit your macro targets, and remember to rest and recover properly!";
      
      const textLower = userMsg.text.toLowerCase();
      if (textLower.includes('protein') || textLower.includes('eat') || textLower.includes('macro')) {
        coachResponse = `To optimize your active goal (${goal.replace('_', ' ')}), prioritize hitting your daily protein target of ${targetProtein}g. High-quality sources like egg whites, lean chicken, and Greek yogurt are exceptional options to sustain anabolic recovery.`;
      } else if (textLower.includes('workout') || textLower.includes('lift') || textLower.includes('squat') || textLower.includes('rpe')) {
        coachResponse = "Your training volume is tracking nicely. Be sure to hit high RPEs (8-9) on compound lifts like squats and incline presses to stimulate myofibrillar hypertrophy, but don't skip rest days if your CNS is feeling fatigued!";
      } else if (textLower.includes('fatigue') || textLower.includes('tired') || textLower.includes('recovery')) {
        coachResponse = "Recovery is when progress happens! I recommend introducing a planned deload day. Drop your working weights by 20% or shift to active recovery like walking and mobility work to re-sensitize your muscle receptors.";
      } else if (textLower.includes('hello') || textLower.includes('hey') || textLower.includes('hi')) {
        coachResponse = `Hey there ${fullName.split(' ')[0]}! Ready to hit today's targets? Let me know if you want to modify your active lift session or check food macros.`;
      }

      setIsTyping(false);
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: coachResponse
      }]);
    }, 1200);
  };

  return (
    <div className="lumina-dashboard-page">
      {/* Top Header Appbar */}
      <header className="lumina-dashboard-header">
        <div className="lumina-header-user">
          <div className="lumina-user-avatar">
            <img 
              alt="User profile" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuD3vRdcAG9t6iFC5DAgdJAW_2xrU33Y5jWF3VTnvuT6g1_txVlo9IKcYRWZLDe7MgGQ4oDQoa78iHbt7RNXwIIUtmdbkDEcD-JTsxkq64qt13q97fhxO8p8ZzBn_Ri15-QgWhsW3f0QAjI-nrChR0yjI4vx5cRkmb0rrzVL6_yHAG9p1-9IaKUzooqUs3icFjuaw9qGLIw6vyp2WQ-MyxyQFwBxT7Cm9LLm1oLZR-pvMeHoR0IkOXnyWvrVn2O1W-3JerDeNtItYgrg" 
            />
          </div>
          <h1 className="lumina-header-title">
            {activeTab === 'dashboard' ? 'Today' : 
             activeTab === 'chat' ? 'Coach' : 
             activeTab === 'food' ? 'Food' : 
             activeTab === 'lift' ? 'Lift' : 'Profile'}
          </h1>
        </div>
        <button 
          className="lumina-notification-btn" 
          onClick={() => alert('All on-device notifications are fully synchronized and quiet.')}
        >
          <span className="material-symbols-outlined">notifications</span>
        </button>
      </header>

      {/* Desktop Sidenav Rail */}
      <nav className="lumina-desktop-nav">
        <button 
          className={`lumina-desktop-nav-btn ${activeTab === 'dashboard' ? 'lumina-desktop-nav-btn-active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <span className="material-symbols-outlined">dashboard</span>
          <span>Today</span>
        </button>
        <button 
          className={`lumina-desktop-nav-btn ${activeTab === 'food' ? 'lumina-desktop-nav-btn-active' : ''}`}
          onClick={() => setActiveTab('food')}
        >
          <span className="material-symbols-outlined">restaurant</span>
          <span>Food</span>
        </button>
        <button 
          className={`lumina-desktop-nav-btn ${activeTab === 'lift' ? 'lumina-desktop-nav-btn-active' : ''}`}
          onClick={() => setActiveTab('lift')}
        >
          <span className="material-symbols-outlined">fitness_center</span>
          <span>Lift</span>
        </button>
        <button 
          className={`lumina-desktop-nav-btn ${activeTab === 'chat' ? 'lumina-desktop-nav-btn-active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          <span className="material-symbols-outlined">auto_awesome</span>
          <span>Coach</span>
        </button>
        <button 
          className={`lumina-desktop-nav-btn ${activeTab === 'profile' ? 'lumina-desktop-nav-btn-active' : ''}`}
          onClick={() => setActiveTab('profile')}
          style={{ marginTop: 'auto' }}
        >
          <span className="material-symbols-outlined">person</span>
          <span>Profile</span>
        </button>
      </nav>

      {/* Main Responsive Body Container */}
      <main className="lumina-dashboard-main">
        {activeTab === 'dashboard' && (
          <>
            {/* Bento Grid */}
            <section className="lumina-bento-grid">
              {/* Calories progress ring */}
              <div className="lumina-calories-card lumina-macro-card" style={{ borderLeft: 'none' }}>
                <div>
                  <h2 className="lumina-card-label">Calories Remaining</h2>
                  <div className="lumina-calories-value">
                    <span className="lumina-cals-num">{caloriesRemaining.toLocaleString()}</span>
                    <span className="lumina-cals-total">/ {targetCalories} kcal</span>
                  </div>
                </div>
                
                <div className="lumina-progress-container">
                  <svg className="lumina-circular-progress" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" className="lumina-progress-bg" />
                    <circle 
                      cx="50" 
                      cy="50" 
                      className="lumina-progress-bar"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                    />
                  </svg>
                  <div className="lumina-progress-center-text">
                    <span className="material-symbols-outlined lumina-progress-icon">local_fire_department</span>
                    <span className="lumina-progress-desc">{currentCalories} eaten</span>
                  </div>
                </div>
              </div>

              {/* Protein stats */}
              <div className="lumina-macro-card lumina-macro-card-protein">
                <h3 className="lumina-macro-title">Protein</h3>
                <div className="lumina-macro-val-row">
                  <span className="lumina-macro-current">{proteinTotal}g</span>
                  <span className="lumina-macro-goal">/ {targetProtein}g</span>
                </div>
                <div className="lumina-macro-bar-container">
                  <div 
                    className="lumina-macro-bar-fill lumina-macro-fill-protein" 
                    style={{ width: `${Math.min(100, (proteinTotal / targetProtein) * 100)}%` }} 
                  />
                </div>
              </div>

              {/* Carbs stats */}
              <div className="lumina-macro-card lumina-macro-card-carbs">
                <h3 className="lumina-macro-title">Carbs</h3>
                <div className="lumina-macro-val-row">
                  <span className="lumina-macro-current">{carbsTotal}g</span>
                  <span className="lumina-macro-goal">/ {targetCarbs}g</span>
                </div>
                <div className="lumina-macro-bar-container">
                  <div 
                    className="lumina-macro-bar-fill lumina-macro-fill-carbs" 
                    style={{ width: `${Math.min(100, (carbsTotal / targetCarbs) * 100)}%` }} 
                  />
                </div>
              </div>

              {/* Fats stats */}
              <div className="lumina-macro-card lumina-macro-card-fats">
                <h3 className="lumina-macro-title">Fats</h3>
                <div className="lumina-macro-val-row">
                  <span className="lumina-macro-current">{fatsTotal}g</span>
                  <span className="lumina-macro-goal">/ {targetFats}g</span>
                </div>
                <div className="lumina-macro-bar-container">
                  <div 
                    className="lumina-macro-bar-fill lumina-macro-fill-fats" 
                    style={{ width: `${Math.min(100, (fatsTotal / targetFats) * 100)}%` }} 
                  />
                </div>
              </div>

              {/* Add Macro shortcut button */}
              <div className="lumina-quick-log-card" onClick={handleQuickLog}>
                <div className="lumina-quick-log-content">
                  <div className="lumina-quick-log-icon-box">
                    <span className="material-symbols-outlined">add</span>
                  </div>
                  <span className="lumina-quick-log-text">Quick Log</span>
                </div>
              </div>
            </section>

            {/* AI Recovery Insight Card */}
            <section className="lumina-ai-insight-card">
              <div className="lumina-ai-badge-row">
                <div className="lumina-ai-badge">
                  <span className="material-symbols-outlined">auto_awesome</span>
                  Gemma
                </div>
                <span className="lumina-ai-label">AI Coach Recovery Insight</span>
              </div>
              <p className="lumina-ai-text">
                "You've been hitting high RPEs all week; consider a deload day to optimize CNS recovery."
              </p>
              <button className="lumina-quick-log-icon-box" style={{ width: 'auto', padding: '0 16px', height: '36px', color: '#ffffff', backgroundColor: '#0ea5e9', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }} onClick={() => setActiveTab('chat')}>
                Ask Coach
              </button>
            </section>

            {/* Weekly Streak Review */}
            <section className="lumina-weekly-card">
              <div className="lumina-weekly-header">
                <h2 className="lumina-weekly-title">Weekly Review</h2>
                <div className="lumina-streak-badge">
                  <span className="material-symbols-outlined">local_fire_department</span>
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
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check</span>
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
          </>
        )}

        {/* AI Chat Tab */}
        {activeTab === 'chat' && (
          <div className="lumina-chat-container">
            <div className="lumina-chat-header">
              <div className="lumina-chat-coach-avatar">
                <span className="material-symbols-outlined">auto_awesome</span>
              </div>
              <div className="lumina-chat-header-info">
                <span className="lumina-chat-coach-name">Gemma AI Trainer</span>
                <span className="lumina-chat-coach-status">Active Local Model</span>
              </div>
            </div>
            
            <div className="lumina-chat-messages">
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`lumina-chat-bubble ${
                    msg.sender === 'user' ? 'lumina-chat-bubble-user' : 'lumina-chat-bubble-assistant'
                  }`}
                >
                  {msg.text}
                </div>
              ))}
              {isTyping && (
                <div className="lumina-chat-coach-typing">
                  <div className="lumina-typing-dot" />
                  <div className="lumina-typing-dot" />
                  <div className="lumina-typing-dot" />
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form className="lumina-chat-input-row" onSubmit={handleSendMessage}>
              <input 
                type="text" 
                className="lumina-chat-input"
                placeholder="Ask Gemma about nutrition, routines, or fatigue..."
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
              />
              <button type="submit" className="lumina-chat-send-btn">
                <span className="material-symbols-outlined">send</span>
              </button>
            </form>
          </div>
        )}

        {/* Food Tracker Tab */}
        {activeTab === 'food' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="lumina-weekly-card">
              <h2 className="lumina-weekly-title" style={{ marginBottom: '16px' }}>Nutritional Diary</h2>
              <div className="lumina-nutrition-progress">
                <div className="lumina-profile-stat-box" style={{ borderLeft: '4px solid #0ea5e9' }}>
                  <div className="lumina-profile-stat-val">{proteinTotal}g / {targetProtein}g</div>
                  <div className="lumina-profile-stat-lbl">Protein</div>
                </div>
                <div className="lumina-profile-stat-box" style={{ borderLeft: '4px solid #f7be1d' }}>
                  <div className="lumina-profile-stat-val">{carbsTotal}g / {targetCarbs}g</div>
                  <div className="lumina-profile-stat-lbl">Carbs</div>
                </div>
                <div className="lumina-profile-stat-box" style={{ borderLeft: '4px solid #fd761a' }}>
                  <div className="lumina-profile-stat-val">{fatsTotal}g / {targetFats}g</div>
                  <div className="lumina-profile-stat-lbl">Fats</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button 
                  className="lumina-quick-log-icon-box" 
                  style={{ flex: 1, padding: '16px', height: 'auto', display: 'flex', flexDirection: 'row', gap: '8px', color: '#ffffff', backgroundColor: '#0ea5e9', border: 'none', borderRadius: '12px', cursor: 'pointer', justifyContent: 'center', fontWeight: 600 }}
                  onClick={handleQuickLog}
                >
                  <span className="material-symbols-outlined">add</span>
                  Log Quick Snack
                </button>
              </div>
            </div>

            <div className="lumina-weekly-card">
              <h3 className="lumina-weekly-title" style={{ fontSize: '16px', marginBottom: '16px' }}>Logged Meals Today</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {foodLogs.map((log) => (
                  <div key={log.id} className="lumina-food-item">
                    <div className="lumina-food-details">
                      <span className="lumina-food-name">{log.name}</span>
                      <span className="lumina-food-macros">P: {log.protein}g • C: {log.carbs}g • F: {log.fats}g</span>
                    </div>
                    <span className="lumina-food-calories">+{log.calories} kcal</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Lift Routines Tab */}
        {activeTab === 'lift' && (
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
        )}

        {/* Profile Stats Tab */}
        {activeTab === 'profile' && (
          <div className="lumina-profile-layout">
            <div className="lumina-profile-card">
              <div className="lumina-profile-avatar-large">
                <img 
                  alt="User large profile" 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuD3vRdcAG9t6iFC5DAgdJAW_2xrU33Y5jWF3VTnvuT6g1_txVlo9IKcYRWZLDe7MgGQ4oDQoa78iHbt7RNXwIIUtmdbkDEcD-JTsxkq64qt13q97fhxO8p8ZzBn_Ri15-QgWhsW3f0QAjI-nrChR0yjI4vx5cRkmb0rrzVL6_yHAG9p1-9IaKUzooqUs3icFjuaw9qGLIw6vyp2WQ-MyxyQFwBxT7Cm9LLm1oLZR-pvMeHoR0IkOXnyWvrVn2O1W-3JerDeNtItYgrg" 
                />
              </div>
              <h2 className="lumina-profile-name">{fullName}</h2>
              <span className="lumina-profile-email">{email}</span>
              
              <div className="lumina-profile-stats-grid">
                <div className="lumina-profile-stat-box">
                  <div className="lumina-profile-stat-val" style={{ textTransform: 'capitalize' }}>{gender}</div>
                  <div className="lumina-profile-stat-lbl">Gender</div>
                </div>
                <div className="lumina-profile-stat-box">
                  <div className="lumina-profile-stat-val">{height}</div>
                  <div className="lumina-profile-stat-lbl">Height</div>
                </div>
                <div className="lumina-profile-stat-box">
                  <div className="lumina-profile-stat-val">{weight}</div>
                  <div className="lumina-profile-stat-lbl">Weight</div>
                </div>
                <div className="lumina-profile-stat-box" style={{ gridColumn: 'span 3' }}>
                  <div className="lumina-profile-stat-val" style={{ textTransform: 'capitalize' }}>
                    {goal.replace('_', ' ')}
                  </div>
                  <div className="lumina-profile-stat-lbl">Active Strategy</div>
                </div>
              </div>

              <button 
                className="lumina-quick-log-icon-box" 
                style={{ width: '100%', padding: '12px', height: 'auto', border: '1px solid #ba1a1a', color: '#ba1a1a', background: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 600 }}
                onClick={() => navigate('/login')}
              >
                Sign Out
              </button>
            </div>

            <div className="lumina-weekly-card">
              <h3 className="lumina-weekly-title" style={{ fontSize: '16px', marginBottom: '16px' }}>On-Device Privacy Profile</h3>
              <p style={{ fontSize: '14px', lineHeight: '22px', color: '#3e4850', margin: '0 0 16px 0' }}>
                Your Lumina profile resides strictly in your offline browser sandboxed storage. Your personal information, fitness logs, and AI conversations never touch the cloud, honoring strict data dignity policies.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#3e4850' }}>Gemma AI Weights</span>
                  <span style={{ fontSize: '12px', color: '#059669', fontWeight: 700 }}>Active Local (2.2B)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#3e4850' }}>Data Encryption</span>
                  <span style={{ fontSize: '12px', color: '#059669', fontWeight: 700 }}>AES-GCM Local</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Floating Bottom Nav Menu (Mobile Only) */}
      <nav className="lumina-bottom-nav">
        <button 
          className={`lumina-nav-btn ${activeTab === 'dashboard' ? 'lumina-nav-btn-active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <span className="material-symbols-outlined">dashboard</span>
          <span>Home</span>
        </button>
        <button 
          className={`lumina-nav-btn ${activeTab === 'food' ? 'lumina-nav-btn-active' : ''}`}
          onClick={() => setActiveTab('food')}
        >
          <span className="material-symbols-outlined">restaurant</span>
          <span>Food</span>
        </button>
        
        {/* Centered Premium auto-awesome AI coach shortcut */}
        <button 
          className="lumina-ai-coach-nav-btn pulse-shadow-glow"
          onClick={() => setActiveTab('chat')}
        >
          <span className="material-symbols-outlined">auto_awesome</span>
        </button>

        <button 
          className={`lumina-nav-btn ${activeTab === 'lift' ? 'lumina-nav-btn-active' : ''}`}
          onClick={() => setActiveTab('lift')}
        >
          <span className="material-symbols-outlined">fitness_center</span>
          <span>Lift</span>
        </button>
        <button 
          className={`lumina-nav-btn ${activeTab === 'profile' ? 'lumina-nav-btn-active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <span className="material-symbols-outlined">person</span>
          <span>Profile</span>
        </button>
      </nav>
    </div>
  );
}
