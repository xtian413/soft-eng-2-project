import React from 'react';
import type { HomeProps } from './types';
import { CalorieRing } from './components/CalorieRing';
import { MacroTracker } from './components/MacroTracker';
import { WeeklyReview } from './components/WeeklyReview';
import './Home.css';

export const Home: React.FC<HomeProps> = ({
  targetCalories,
  targetProtein,
  targetCarbs,
  targetFats,
  currentCalories,
  caloriesRemaining,
  proteinTotal,
  carbsTotal,
  fatsTotal,
  setFoodLogs,
  setToastMessage,
  setActiveTab,
}) => {
  // Handle Quick Log Snack Macro Shortcut
  const handleQuickLog = () => {
    const randomFoods = [
      { name: 'Peanut Butter Toast', protein: 8, carbs: 24, fats: 12, calories: 240 },
      { name: 'Greek Yogurt Bowl', protein: 18, carbs: 12, fats: 0, calories: 120 },
      { name: 'Mixed Almonds Pack', protein: 6, carbs: 5, fats: 14, calories: 160 },
      { name: 'Oven Baked Salmon', protein: 28, carbs: 0, fats: 14, calories: 240 },
    ];
    const food = randomFoods[Math.floor(Math.random() * randomFoods.length)];
    
    const newLog = {
      id: 'log_' + Date.now(),
      name: food.name,
      mealId: 'snack' as const,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fats,
      fiber: 2,
      sodium: 150,
      potassium: 200,
      calcium: 50,
      iron: 1,
      vitaminC: 2,
      folate: 10,
      servingSize: 1,
      servingUnit: 'portion'
    };

    setFoodLogs(prev => [...prev, newLog]);

    // Show a beautiful toast
    setToastMessage(`Quick Logged: ${food.name} (+${food.calories} kcal, P: ${food.protein}g)`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <>
      <section className="lumina-bento-grid">
        <div className="lumina-calories-card">
          <div>
            <h2 className="lumina-card-label">Calories Remaining</h2>
            <div className="lumina-calories-value">
              <span className="lumina-cals-num">{caloriesRemaining.toLocaleString()}</span>
              <span className="lumina-cals-total">/ {targetCalories.toLocaleString()} kcal</span>
            </div>
          </div>

          <CalorieRing 
            currentCalories={currentCalories}
            targetCalories={targetCalories}
          />
        </div>

        <MacroTracker 
          proteinTotal={proteinTotal}
          targetProtein={targetProtein}
          carbsTotal={carbsTotal}
          targetCarbs={targetCarbs}
          fatsTotal={fatsTotal}
          targetFats={targetFats}
        />

        <div className="lumina-quick-log-card" onClick={handleQuickLog}>
          <div className="lumina-quick-log-content">
            <div className="lumina-quick-log-icon-box">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>add</span>
            </div>
            <span className="lumina-quick-log-text">Quick Log</span>
          </div>
        </div>
      </section>

      <section className="lumina-ai-insight-card">
        <div className="lumina-ai-badge-row">
          <div className="lumina-ai-badge">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
            Whisper
          </div>
          <span className="lumina-ai-label">AI Recovery Insight</span>
        </div>
        <p className="lumina-ai-text">
          "You've been hitting high RPEs all week; consider a deload day to optimize CNS recovery."
        </p>
        <button className="lumina-ai-btn" onClick={() => setActiveTab('chat')}>
          Adjust Plan
        </button>
        <div className="lumina-ai-deco" />
      </section>

      <WeeklyReview />
    </>
  );
};
