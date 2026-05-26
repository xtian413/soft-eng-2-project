import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import './Dashboard.css';

// Import newly refactored modular sub-pages
import { Home } from './Home/Home';
import { Food } from './Food/Food';
import { AIChat } from './AIChat/AIChat';
import { Lift } from './Lift/Lift';
import { Profile } from './Profile/Profile';
import type { FoodLogEntry, TabType } from './types';

export function Dashboard() {
  const location = useLocation();
  
  const passedData = location.state || {};
  const [email] = useState(passedData.email || 'athlete@gemi.ai');
  const [fullName] = useState(
    passedData.fullName || 
    (passedData.email ? passedData.email.split('@')[0].charAt(0).toUpperCase() + passedData.email.split('@')[0].slice(1) : 'Athlete')
  );
  const [gender] = useState(passedData.gender || 'male');
  const [height] = useState(passedData.height || '178 cm');
  const [weight] = useState(passedData.weight || '75 kg');
  const [goal] = useState(passedData.goal || 'build_muscle');

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  // --- Shared Diet Logs State ---
  const [foodLogs, setFoodLogs] = useState<FoodLogEntry[]>([
    {
      id: 'init_breakfast_1',
      name: 'Oatmeal, commercial, prepared',
      mealId: 'breakfast',
      calories: 320,
      protein: 12,
      carbs: 50,
      fat: 8,
      fiber: 6,
      sodium: 110,
      potassium: 280,
      calcium: 120,
      iron: 2.2,
      vitaminC: 0,
      folate: 25,
      servingSize: 1,
      servingUnit: 'cup'
    },
    {
      id: 'init_lunch_1',
      name: 'Grilled Chicken Breast & Quinoa',
      mealId: 'lunch',
      calories: 450,
      protein: 42,
      carbs: 45,
      fat: 11,
      fiber: 4,
      sodium: 350,
      potassium: 420,
      calcium: 20,
      iron: 1.2,
      vitaminC: 0,
      folate: 10,
      servingSize: 1,
      servingUnit: 'portion'
    },
    {
      id: 'init_snack_1',
      name: 'Mixed Almonds Pack & Whey Shake',
      mealId: 'snack',
      calories: 435,
      protein: 26,
      carbs: 25,
      fat: 26,
      fiber: 5,
      sodium: 120,
      potassium: 290,
      calcium: 150,
      iron: 1.8,
      vitaminC: 2,
      folate: 18,
      servingSize: 1,
      servingUnit: 'pack'
    }
  ]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Pure derived state from the source of truth (foodLogs)
  const proteinTotal = Number(foodLogs.reduce((acc, f) => acc + f.protein, 0).toFixed(1));
  const carbsTotal = Number(foodLogs.reduce((acc, f) => acc + f.carbs, 0).toFixed(1));
  const fatsTotal = Number(foodLogs.reduce((acc, f) => acc + f.fat, 0).toFixed(1));

  // Targets based on goals (Christian is build_muscle, which targets 2300 calories matching Stitch)
  const targetCalories = goal === 'build_muscle' ? 2300 : goal === 'lose_weight' ? 2000 : 2400;
  const targetProtein = goal === 'build_muscle' ? 150 : goal === 'lose_weight' ? 130 : 140;
  const targetCarbs = goal === 'build_muscle' ? 200 : goal === 'lose_weight' ? 180 : 190;
  const targetFats = goal === 'build_muscle' ? 65 : goal === 'lose_weight' ? 50 : 60;

  // Derived current calories
  const currentCalories = Math.round(foodLogs.reduce((acc, x) => acc + x.calories, 0));
  const caloriesRemaining = Math.max(0, targetCalories - currentCalories);

  // Calculate Indicator Dot positions for bottom mobile navigation
  const getDotLeft = () => {
    switch (activeTab) {
      case 'dashboard': return '10%';
      case 'food': return '30%';
      case 'chat': return '50%';
      case 'lift': return '70%';
      case 'profile': return '90%';
      default: return '10%';
    }
  };

  return (
    <div className="lumina-dashboard-page">
      {/* Top Header Appbar */}
      <header className="lumina-dashboard-header">
        <div className="lumina-header-user">
          <div className="lumina-user-avatar">
            <img 
              alt="User Profile Photo" 
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
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>notifications</span>
        </button>
      </header>

      {/* Desktop Sidenav Rail */}
      <nav className="lumina-desktop-nav">
        <button 
          className={`lumina-desktop-nav-btn ${activeTab === 'dashboard' ? 'lumina-desktop-nav-btn-active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: activeTab === 'dashboard' ? "'FILL' 1" : "'FILL' 0" }}>dashboard</span>
          <span>Dashboard</span>
        </button>
        <button 
          className={`lumina-desktop-nav-btn ${activeTab === 'lift' ? 'lumina-desktop-nav-btn-active' : ''}`}
          onClick={() => setActiveTab('lift')}
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: activeTab === 'lift' ? "'FILL' 1" : "'FILL' 0" }}>fitness_center</span>
          <span>Lift</span>
        </button>
        <button 
          className={`lumina-desktop-nav-btn ${activeTab === 'food' ? 'lumina-desktop-nav-btn-active' : ''}`}
          onClick={() => setActiveTab('food')}
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: activeTab === 'food' ? "'FILL' 1" : "'FILL' 0" }}>restaurant</span>
          <span>Food</span>
        </button>
        <button 
          className={`lumina-desktop-nav-btn ${activeTab === 'chat' ? 'lumina-desktop-nav-btn-active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: activeTab === 'chat' ? "'FILL' 1" : "'FILL' 0" }}>auto_awesome</span>
          <span>Coach</span>
        </button>
        <button 
          className={`lumina-desktop-nav-btn ${activeTab === 'profile' ? 'lumina-desktop-nav-btn-active' : ''}`}
          onClick={() => setActiveTab('profile')}
          style={{ marginTop: 'auto' }}
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: activeTab === 'profile' ? "'FILL' 1" : "'FILL' 0" }}>person</span>
          <span>Profile</span>
        </button>
      </nav>

      {/* Main Container Layout */}
      <main className="lumina-dashboard-main">
        {activeTab === 'dashboard' && (
          <Home
            fullName={fullName}
            goal={goal}
            targetCalories={targetCalories}
            targetProtein={targetProtein}
            targetCarbs={targetCarbs}
            targetFats={targetFats}
            currentCalories={currentCalories}
            caloriesRemaining={caloriesRemaining}
            proteinTotal={proteinTotal}
            carbsTotal={carbsTotal}
            fatsTotal={fatsTotal}
            foodLogs={foodLogs}
            setFoodLogs={setFoodLogs}
            setToastMessage={setToastMessage}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'food' && (
          <Food
            foodLogs={foodLogs}
            setFoodLogs={setFoodLogs}
            targetCalories={targetCalories}
            targetProtein={targetProtein}
            targetCarbs={targetCarbs}
            targetFats={targetFats}
            proteinTotal={proteinTotal}
            carbsTotal={carbsTotal}
            fatsTotal={fatsTotal}
            toastMessage={toastMessage}
            setToastMessage={setToastMessage}
          />
        )}

        {activeTab === 'chat' && <AIChat />}

        {activeTab === 'lift' && <Lift />}

        {activeTab === 'profile' && (
          <Profile
            fullName={fullName}
            email={email}
            gender={gender}
            height={height}
            weight={weight}
            goal={goal}
          />
        )}
      </main>

      {/* Floating Bottom Nav (Mobile Only) */}
      <nav className="lumina-bottom-nav">
        {/* Dynamic active indicator dot */}
        <div className="lumina-nav-indicator" style={{ left: getDotLeft() }} />

        <button 
          className={`lumina-nav-btn ${activeTab === 'dashboard' ? 'lumina-nav-btn-active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: activeTab === 'dashboard' ? "'FILL' 1" : "'FILL' 0" }}>dashboard</span>
          <span>Home</span>
        </button>
        <button 
          className={`lumina-nav-btn ${activeTab === 'food' ? 'lumina-nav-btn-active' : ''}`}
          onClick={() => setActiveTab('food')}
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: activeTab === 'food' ? "'FILL' 1" : "'FILL' 0" }}>restaurant</span>
          <span>Food</span>
        </button>
        
        {/* Glowing AI Center Action Button */}
        <button 
          className="lumina-ai-coach-nav-btn"
          onClick={() => setActiveTab('chat')}
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
        </button>

        <button 
          className={`lumina-nav-btn ${activeTab === 'lift' ? 'lumina-nav-btn-active' : ''}`}
          onClick={() => setActiveTab('lift')}
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: activeTab === 'lift' ? "'FILL' 1" : "'FILL' 0" }}>fitness_center</span>
          <span>Lift</span>
        </button>
        <button 
          className={`lumina-nav-btn ${activeTab === 'profile' ? 'lumina-nav-btn-active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: activeTab === 'profile' ? "'FILL' 1" : "'FILL' 0" }}>person</span>
          <span>Profile</span>
        </button>
      </nav>
    </div>
  );
}
