import React, { useCallback, useState } from 'react';
import type { FoodProps } from './types';
import type { GemiFoodItem, MealId } from '../types';
import { useFood } from './hooks/useFood';
import { FoodModal } from './subcomponents/FoodModal';
import { fetchLocalFoodDatabase } from '../../../data/foodAdapter';
import './Food.css';

interface QuickLogFood {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sodium: number;
}

export const Food: React.FC<FoodProps> = ({
  foodLogs,
  setFoodLogs,
  targetCalories,
  targetProtein,
  targetCarbs,
  targetFats,
  proteinTotal,
  carbsTotal,
  fatsTotal,
  toastMessage,
  setToastMessage,
}) => {
  const {
    nutrientSlide,
    setNutrientSlide,
    
    // Hydration
    waterGlassStates,
    setWaterGlassStates,
    hydrationGoalMl,
    setHydrationGoalMl,
    isEditingHydrationGoal,
    setIsEditingHydrationGoal,
    hydrationGoalInput,
    setHydrationGoalInput,
    waterConsumedMl,
    waterGlassCount,
    handleWaterGlassToggle,

    // Sleep
    bedtime,
    setBedtime,
    waketime,
    setWaketime,
    sleepHours,
    sleepQuality,
    sleepQualityColor,

    // Food Input & Modals
    foodQuickLogInput,
    setFoodQuickLogInput,
    isOptionsModalOpen,
    setIsOptionsModalOpen,
    activeLoggingMealId,
    setActiveLoggingMealId,
  } = useFood();

  const [fullFoodDatabase, setFullFoodDatabase] = useState<GemiFoodItem[]>([]);
  const [isLoadingDb, setIsLoadingDb] = useState(false);
  const [dbLoadError, setDbLoadError] = useState(false);

  const ensureDbLoaded = useCallback(async () => {
    if (fullFoodDatabase.length > 0 || isLoadingDb) return;
    setIsLoadingDb(true);
    setDbLoadError(false);
    try {
      const foods = await fetchLocalFoodDatabase();
      if (foods && foods.length > 0) {
        setFullFoodDatabase(foods);
      } else {
        throw new Error('Invalid db format');
      }
    } catch (err) {
      console.error(err);
      setDbLoadError(true);
    } finally {
      setIsLoadingDb(false);
    }
  }, [fullFoodDatabase.length, isLoadingDb]);

  // Helper: filter logged items by meal category
  const getMealItems = (mealId: MealId) => {
    return foodLogs.filter(x => x.mealId === mealId);
  };

  // Helper: sum calories for meal category
  const getMealCalories = (mealId: MealId) => {
    return foodLogs
      .filter(x => x.mealId === mealId)
      .reduce((sum, item) => sum + item.calories, 0);
  };

  // Calculate current calories logged
  const currentCalories = foodLogs.reduce((acc, f) => acc + f.calories, 0);
  const caloriesRemaining = Math.max(0, targetCalories - currentCalories);

  const handleOpenModal = (mealId: MealId) => {
    setActiveLoggingMealId(mealId);
    setIsOptionsModalOpen(true);
    ensureDbLoaded();
  };

  const mealDefinitions: Array<{ id: MealId; name: string; icon: string }> = [
    { id: 'breakfast', name: 'Breakfast', icon: 'bakery_dining' },
    { id: 'lunch', name: 'Lunch', icon: 'lunch_dining' },
    { id: 'dinner', name: 'Dinner', icon: 'dinner_dining' },
    { id: 'snack', name: 'Snacks & Uncategorized', icon: 'cookie' }
  ];

  // Handle Natural Language Quick Log submit
  const handleFoodQuickLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodQuickLogInput.trim()) return;

    const query = foodQuickLogInput.toLowerCase();
    let matchedFood: QuickLogFood | null = null;
    let multiplier = 1;

    // Simple keyword mapping for local mock
    if (query.includes('egg') || query.includes('eggs')) {
      matchedFood = { name: 'Boiled Egg', calories: 78, protein: 6.3, carbs: 0.6, fat: 5.3, fiber: 0, sodium: 62 };
      const match = query.match(/(\d+)\s*egg/);
      if (match) multiplier = Number(match[1]);
    } else if (query.includes('toast') || query.includes('bread')) {
      matchedFood = { name: 'Whole Wheat Toast (slice)', calories: 80, protein: 4, carbs: 15, fat: 1, fiber: 2, sodium: 130 };
      const match = query.match(/(\d+)\s*(toast|slice|bread)/);
      if (match) multiplier = Number(match[1]);
    } else if (query.includes('hummus')) {
      matchedFood = { name: 'Hummus commercial', calories: 177, protein: 4.8, carbs: 8.6, fat: 14.3, fiber: 4, sodium: 300 };
    } else if (query.includes('chicken') || query.includes('breast')) {
      matchedFood = { name: 'Chicken breast grilled', calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, sodium: 74 };
    } else if (query.includes('salmon') || query.includes('fish')) {
      matchedFood = { name: 'Oven Baked Salmon', calories: 200, protein: 22, carbs: 0, fat: 12, fiber: 0, sodium: 60 };
    }

    if (matchedFood) {
      const newLog = {
        id: 'log_' + Date.now(),
        name: matchedFood.name,
        mealId: 'snack', // Default to snack/uncategorized
        calories: Math.round(matchedFood.calories * multiplier),
        protein: Number((matchedFood.protein * multiplier).toFixed(1)),
        carbs: Number((matchedFood.carbs * multiplier).toFixed(1)),
        fat: Number((matchedFood.fat * multiplier).toFixed(1)),
        fiber: Number((matchedFood.fiber * multiplier).toFixed(1)),
        sodium: Math.round(matchedFood.sodium * multiplier),
        potassium: 100, // mock
        calcium: 20, // mock
        iron: 0.5, // mock
        vitaminC: 0,
        folate: 0,
        servingSize: multiplier,
        servingUnit: 'portion'
      };
      setFoodLogs(prev => [...prev, newLog]);
      setFoodQuickLogInput('');
      setToastMessage(`Parsed & Logged: ${newLog.name} x${multiplier} (+${newLog.calories} kcal)`);
      setTimeout(() => setToastMessage(null), 3000);
    } else {
      setToastMessage("AI Parser: Food name not recognized. Try '2 eggs' or 'chicken breast'.");
      setTimeout(() => setToastMessage(null), 3500);
    }
  };

  return (
    <div className="lumina-food-layout">
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'var(--inverse-surface)',
          color: 'var(--inverse-on-surface)',
          padding: '12px 24px',
          borderRadius: '9999px',
          fontSize: '14px',
          fontWeight: '600',
          boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--primary-container)', fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Scrollable Nutrient Targets Panel */}
      <section className="gemi-carousel-container">
        <div className="gemi-carousel-header">
          <span className="gemi-carousel-title">
            {nutrientSlide === 'energy' ? 'Energy Summary' : 
             nutrientSlide === 'macros' ? 'Macronutrient Targets' : 'Highlighted Micronutrients'}
          </span>
          
          <div className="gemi-carousel-nav">
            <button 
              className="gemi-carousel-arrow" 
              onClick={() => setNutrientSlide(prev => prev === 'energy' ? 'micros' : prev === 'macros' ? 'energy' : 'macros')}
              aria-label="Previous Slide"
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <div className="gemi-carousel-dots">
              <span className={`gemi-carousel-dot ${nutrientSlide === 'energy' ? 'active' : ''}`} onClick={() => setNutrientSlide('energy')} />
              <span className={`gemi-carousel-dot ${nutrientSlide === 'macros' ? 'active' : ''}`} onClick={() => setNutrientSlide('macros')} />
              <span className={`gemi-carousel-dot ${nutrientSlide === 'micros' ? 'active' : ''}`} onClick={() => setNutrientSlide('micros')} />
            </div>
            <button 
              className="gemi-carousel-arrow" 
              onClick={() => setNutrientSlide(prev => prev === 'energy' ? 'macros' : prev === 'macros' ? 'micros' : 'energy')}
              aria-label="Next Slide"
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>

        {/* SLIDE 1: ENERGY Summary Rings */}
        <div className={`gemi-carousel-slide ${nutrientSlide === 'energy' ? 'active' : ''}`}>
          <div className="gemi-energy-rings-row">
            {/* Circle 1: Consumed */}
            <div className="gemi-ring-container">
              <svg className="gemi-ring-svg" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" className="gemi-ring-bg" />
                <circle 
                  cx="50" 
                  cy="50" 
                  r="40" 
                  fill="none" 
                  className="gemi-ring-fill consumed" 
                  strokeDasharray={251.2}
                  strokeDashoffset={251.2 - (251.2 * Math.min(100, (currentCalories / targetCalories) * 100)) / 100}
                />
              </svg>
              <div className="gemi-ring-center-text">
                <span className="gemi-ring-num">{currentCalories}</span>
                <span className="gemi-ring-unit">kcal</span>
              </div>
              <span className="gemi-ring-label">Consumed</span>
            </div>

            {/* Circle 2: Expenditure */}
            <div className="gemi-ring-container">
              <svg className="gemi-ring-svg" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" className="gemi-ring-bg" />
                <circle 
                  cx="50" 
                  cy="50" 
                  r="40" 
                  fill="none" 
                  className="gemi-ring-fill expenditure" 
                  strokeDasharray={251.2}
                  strokeDashoffset={251.2 - (251.2 * 95.6) / 100}
                />
              </svg>
              <div className="gemi-ring-center-text">
                <span className="gemi-ring-num">2,200</span>
                <span className="gemi-ring-unit">kcal</span>
              </div>
              <span className="gemi-ring-label">Burned</span>
            </div>

            {/* Circle 3: Remaining */}
            <div className="gemi-ring-container">
              <svg className="gemi-ring-svg" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" className="gemi-ring-bg" />
                <circle 
                  cx="50" 
                  cy="50" 
                  r="40" 
                  fill="none" 
                  className="gemi-ring-fill remaining" 
                  strokeDasharray={251.2}
                  strokeDashoffset={251.2 - (251.2 * Math.min(100, (caloriesRemaining / targetCalories) * 100)) / 100}
                />
              </svg>
              <div className="gemi-ring-center-text">
                <span className="gemi-ring-num">{caloriesRemaining}</span>
                <span className="gemi-ring-unit">kcal</span>
              </div>
              <span className="gemi-ring-label">Remaining</span>
            </div>
          </div>
        </div>

        {/* SLIDE 2: MACRONUTRIENT Targets */}
        <div className={`gemi-carousel-slide ${nutrientSlide === 'macros' ? 'active' : ''}`}>
          <div className="lumina-food-macro-bars" style={{ marginTop: '8px' }}>
            {/* Protein Bar */}
            <div className="lumina-food-macro-item">
              <div className="lumina-food-macro-label-row">
                <span className="lumina-food-macro-name">Protein</span>
                <span className="lumina-food-macro-value">{proteinTotal}g / {targetProtein}g ({Math.round((proteinTotal/targetProtein)*100)}%)</span>
              </div>
              <div className="lumina-food-macro-progress protein-bg">
                <div 
                  className="lumina-food-macro-fill protein-fill" 
                  style={{ width: `${Math.min(100, (proteinTotal / targetProtein) * 100)}%` }}
                />
              </div>
            </div>

            {/* Carbs Bar */}
            <div className="lumina-food-macro-item">
              <div className="lumina-food-macro-label-row">
                <span className="lumina-food-macro-name">Carbohydrates</span>
                <span className="lumina-food-macro-value">{carbsTotal}g / {targetCarbs}g ({Math.round((carbsTotal/targetCarbs)*100)}%)</span>
              </div>
              <div className="lumina-food-macro-progress carbs-bg">
                <div 
                  className="lumina-food-macro-fill carbs-fill" 
                  style={{ width: `${Math.min(100, (carbsTotal / targetCarbs) * 100)}%` }}
                />
              </div>
            </div>

            {/* Fats Bar */}
            <div className="lumina-food-macro-item">
              <div className="lumina-food-macro-label-row">
                <span className="lumina-food-macro-name">Fats</span>
                <span className="lumina-food-macro-value">{fatsTotal}g / {targetFats}g ({Math.round((fatsTotal/targetFats)*100)}%)</span>
              </div>
              <div className="lumina-food-macro-progress fats-bg">
                <div 
                  className="lumina-food-macro-fill fats-fill" 
                  style={{ width: `${Math.min(100, (fatsTotal / targetFats) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* SLIDE 3: MICRONUTRIENT Targets */}
        <div className={`gemi-carousel-slide ${nutrientSlide === 'micros' ? 'active' : ''}`}>
          <div className="gemi-micros-grid">
            {/* Fiber */}
            <div className="gemi-micro-card">
              <div className="gemi-micro-meta">
                <span className="gemi-micro-name">Fiber</span>
                <span className="gemi-micro-values">{foodLogs.reduce((acc, f) => acc + (f.fiber || 0), 0).toFixed(1)}g / 30g</span>
              </div>
              <div className="gemi-micro-progress">
                <div className="gemi-micro-fill" style={{ width: `${Math.min(100, (foodLogs.reduce((acc, f) => acc + (f.fiber || 0), 0) / 30) * 100)}%` }} />
              </div>
            </div>

            {/* Sodium */}
            <div className="gemi-micro-card">
              <div className="gemi-micro-meta">
                <span className="gemi-micro-name">Sodium</span>
                <span className="gemi-micro-values">{foodLogs.reduce((acc, f) => acc + (f.sodium || 0), 0)}mg / 2300mg</span>
              </div>
              <div className="gemi-micro-progress">
                <div className="gemi-micro-fill" style={{ width: `${Math.min(100, (foodLogs.reduce((acc, f) => acc + (f.sodium || 0), 0) / 2300) * 100)}%` }} />
              </div>
            </div>

            {/* Potassium */}
            <div className="gemi-micro-card">
              <div className="gemi-micro-meta">
                <span className="gemi-micro-name">Potassium</span>
                <span className="gemi-micro-values">{foodLogs.reduce((acc, f) => acc + (f.potassium || 0), 0)}mg / 4700mg</span>
              </div>
              <div className="gemi-micro-progress">
                <div className="gemi-micro-fill" style={{ width: `${Math.min(100, (foodLogs.reduce((acc, f) => acc + (f.potassium || 0), 0) / 4700) * 100)}%` }} />
              </div>
            </div>

            {/* Calcium */}
            <div className="gemi-micro-card">
              <div className="gemi-micro-meta">
                <span className="gemi-micro-name">Calcium</span>
                <span className="gemi-micro-values">{foodLogs.reduce((acc, f) => acc + (f.calcium || 0), 0)}mg / 1000mg</span>
              </div>
              <div className="gemi-micro-progress">
                <div className="gemi-micro-fill" style={{ width: `${Math.min(100, (foodLogs.reduce((acc, f) => acc + (f.calcium || 0), 0) / 1000) * 100)}%` }} />
              </div>
            </div>

            {/* Iron */}
            <div className="gemi-micro-card">
              <div className="gemi-micro-meta">
                <span className="gemi-micro-name">Iron</span>
                <span className="gemi-micro-values">{foodLogs.reduce((acc, f) => acc + (f.iron || 0), 0).toFixed(1)}mg / 18mg</span>
              </div>
              <div className="gemi-micro-progress">
                <div className="gemi-micro-fill" style={{ width: `${Math.min(100, (foodLogs.reduce((acc, f) => acc + (f.iron || 0), 0) / 18) * 100)}%` }} />
              </div>
            </div>

            {/* Vitamin C */}
            <div className="gemi-micro-card">
              <div className="gemi-micro-meta">
                <span className="gemi-micro-name">Vitamin C</span>
                <span className="gemi-micro-values">{foodLogs.reduce((acc, f) => acc + (f.vitaminC || 0), 0).toFixed(1)}mg / 90mg</span>
              </div>
              <div className="gemi-micro-progress">
                <div className="gemi-micro-fill" style={{ width: `${Math.min(100, (foodLogs.reduce((acc, f) => acc + (f.vitaminC || 0), 0) / 90) * 100)}%` }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Natural Language Logging */}
      <section className="lumina-food-ai-log-wrapper">
        <div className="lumina-food-ai-log-glow" />
        <div className="lumina-food-ai-log-card">
          <div className="lumina-food-ai-log-header">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
            <span>AI Natural Language Log</span>
          </div>
          <form className="lumina-food-ai-log-row" onSubmit={handleFoodQuickLogSubmit}>
            <input 
              type="text" 
              className="lumina-food-ai-log-input" 
              placeholder="I ate 2 eggs and whole wheat toast..."
              value={foodQuickLogInput}
              onChange={(e) => setFoodQuickLogInput(e.target.value)}
            />
            <button type="submit" className="lumina-food-ai-log-btn" aria-label="Submit AI food log">
              <span className="material-symbols-outlined">send</span>
            </button>
          </form>
        </div>
      </section>

      {/* Meal List Section */}
      <section className="lumina-food-meals-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 className="lumina-food-meals-title" style={{ margin: 0 }}>Meals Diary</h3>
        </div>

        {mealDefinitions.map((mealDef) => {
          const loggedItems = getMealItems(mealDef.id);
          const mealCals = getMealCalories(mealDef.id);
          
          return (
            <div key={mealDef.id} style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div 
                className="lumina-food-meal-card"
                style={{ cursor: 'default' }}
              >
                <div className="lumina-food-meal-left">
                  <div className="lumina-food-meal-icon-box">
                    <span className="material-symbols-outlined">{mealDef.icon}</span>
                  </div>
                  <div className="lumina-food-meal-details">
                    <h4 className="lumina-food-meal-name">{mealDef.name}</h4>
                    <p className="lumina-food-meal-desc">
                      {loggedItems.length > 0 ? `${loggedItems.length} items logged` : 'No items logged yet'}
                    </p>
                  </div>
                </div>
                
                <div className="lumina-food-meal-right" style={{ gap: '12px' }}>
                  <span className={`lumina-food-meal-cals ${loggedItems.length > 0 ? 'logged' : 'unlogged'}`}>
                    {mealCals > 0 ? `${mealCals} kcal` : '0 kcal'}
                  </span>
                        <button 
                          aria-label={`Add food to ${mealDef.name}`}
                          onClick={() => handleOpenModal(mealDef.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0
                    }}
                  >
                    <span 
                      className="material-symbols-outlined lumina-food-meal-action-icon"
                      style={{ 
                        color: loggedItems.length > 0 ? 'var(--primary)' : 'var(--outline)',
                        fontVariationSettings: loggedItems.length > 0 ? "'FILL' 1" : "'FILL' 0"
                      }}
                    >
                      add_circle
                    </span>
                  </button>
                </div>
              </div>

              {/* Render checklist of logged items for this meal category */}
              {loggedItems.length > 0 && (
                <div style={{ paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {loggedItems.map((item) => (
                    <div 
                      key={item.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 12px',
                        backgroundColor: 'var(--surface-container-low)',
                        borderRadius: '12px',
                        fontSize: '13px',
                        border: '1px solid rgba(190, 200, 210, 0.04)'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontWeight: 700, color: 'var(--on-surface)' }}>{item.name}</span>
                        <span style={{ fontSize: '11px', color: 'var(--outline)' }}>
                          {item.servingSize} {item.servingUnit} ({item.protein}g P, {item.carbs}g C, {item.fat}g F)
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 700, color: 'var(--on-surface)' }}>{item.calories} kcal</span>
                        <button
                          aria-label={`Delete ${item.name}`}
                          onClick={() => setFoodLogs(prev => prev.filter(x => x.id !== item.id))}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#ba1a1a',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '50%'
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(186, 26, 26, 0.08)')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* Water + Sleep full-width cards */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '12px', padding: '0 16px' }}>

        {/* ── WATER INTAKE ── */}
        <div className="gemi-wellness-card">
          <div className="gemi-wellness-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ color: '#0ea5e9', fontVariationSettings: "'FILL' 1", fontSize: '20px' }}>water_drop</span>
              <span className="gemi-wellness-title">Daily Hydration</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="gemi-wellness-summary">
                <strong style={{ color: waterConsumedMl >= hydrationGoalMl ? '#10b981' : 'var(--on-surface)' }}>{(waterConsumedMl / 1000).toFixed(2)}L</strong>
                <span style={{ color: 'var(--outline)' }}> / {(hydrationGoalMl / 1000).toFixed(1)}L</span>
              </span>
              <button
                onClick={() => { setIsEditingHydrationGoal(true); setHydrationGoalInput(String(hydrationGoalMl)); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--outline)', padding: '2px', display: 'flex' }}
                aria-label="Edit daily hydration goal"
                title="Set daily water goal"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>
              </button>
            </div>
          </div>

          {/* Inline goal editor */}
          {isEditingHydrationGoal && (
            <div className="gemi-hydration-goal-editor">
              <span className="gemi-sleep-picker-label" style={{ marginBottom: '4px', display: 'block' }}>Set Daily Goal (mL)</span>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {[1500, 2000, 2500, 3000, 3500, 4000].map(ml => (
                    <button
                      key={ml}
                      onClick={() => { setHydrationGoalMl(ml); setHydrationGoalInput(String(ml)); setWaterGlassStates(Array(Math.min(12, Math.ceil(ml / 250))).fill(false)); setIsEditingHydrationGoal(false); }}
                      className={`gemi-unit-chip ${hydrationGoalMl === ml ? 'active' : ''}`}
                      style={{ fontSize: '12px', padding: '6px 10px', cursor: 'pointer' }}
                    >
                      {ml >= 1000 ? `${ml / 1000}L` : `${ml}ml`}
                    </button>
                  ))}
                </div>
                <button onClick={() => setIsEditingHydrationGoal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--outline)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
                </button>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'center' }}>
                <input
                  type="number" min="250" max="6000" step="250"
                  className="gemi-custom-form-input"
                  style={{ flex: 1, padding: '8px 12px', fontSize: '14px' }}
                  placeholder="Custom mL (e.g. 3500)"
                  value={hydrationGoalInput}
                  onChange={e => setHydrationGoalInput(e.target.value)}
                />
                <button
                  className="gemi-action-btn primary"
                  style={{ flex: 'none', padding: '8px 16px', borderRadius: '10px' }}
                  onClick={() => {
                    const ml = Number(hydrationGoalInput);
                    if (ml >= 250 && ml <= 6000) {
                      setHydrationGoalMl(ml);
                      setWaterGlassStates(Array(Math.min(12, Math.ceil(ml / 250))).fill(false));
                      setIsEditingHydrationGoal(false);
                    }
                  }}
                >Set</button>
              </div>
            </div>
          )}

          {/* Glass progress bar */}
          <div style={{ height: '4px', backgroundColor: 'var(--surface-container-high)', borderRadius: '999px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.min(100, (waterConsumedMl / hydrationGoalMl) * 100)}%`, backgroundColor: '#0ea5e9', borderRadius: '999px', transition: 'width 0.35s ease' }} />
          </div>

          {/* Individual glass buttons */}
          <div className="gemi-water-glasses-row" role="group" aria-label={`Water intake tracker — ${waterGlassCount} glasses of 250mL each`}>
            {Array.from({ length: waterGlassCount }).map((_, idx) => {
              const filled = waterGlassStates[idx] === true;
              return (
                <button
                  key={idx}
                  className={`gemi-water-glass-btn ${filled ? 'filled' : ''}`}
                  onClick={() => handleWaterGlassToggle(idx)}
                  aria-label={`Glass ${idx + 1} of ${waterGlassCount} (250mL), ${filled ? 'logged' : 'not yet logged'}`}
                  aria-pressed={filled}
                  title={`${filled ? 'Unlog' : 'Log'} glass ${idx + 1} (+250mL)`}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', fontVariationSettings: filled ? "'FILL' 1" : "'FILL' 0" }}>
                    water_drop
                  </span>
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--outline)' }}>Each glass = 250mL · Tap to log/unlog</span>
            {waterConsumedMl >= hydrationGoalMl ? (
              <div className="gemi-wellness-badge-row" style={{ padding: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#0ea5e9' }}>check_circle</span>
                <span style={{ fontSize: '11px', color: '#0ea5e9', fontWeight: 700 }}>Goal reached! 🎉</span>
              </div>
            ) : (
              <span style={{ fontSize: '11px', color: 'var(--outline)' }}>{((hydrationGoalMl - waterConsumedMl) / 1000).toFixed(2)}L remaining</span>
            )}
          </div>
        </div>

        {/* ── SLEEP LOG ── */}
        <div className="gemi-wellness-card">
          <div className="gemi-wellness-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ color: '#8b5cf6', fontVariationSettings: "'FILL' 1", fontSize: '20px' }}>bedtime</span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="gemi-wellness-title">Sleep Log</span>
                <span style={{ fontSize: '10px', color: 'var(--outline)', marginTop: '1px' }}>Log last night → this morning</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ fontSize: '16px', fontWeight: 800, color: sleepQualityColor }}>{sleepHours}h</span>
              <span style={{ fontSize: '10px', fontWeight: 700, color: sleepQualityColor }}>{sleepQuality}</span>
            </div>
          </div>

          <div className="gemi-sleep-pickers">
            <div className="gemi-sleep-picker-group">
              <label className="gemi-sleep-picker-label" htmlFor="bedtime-input">
                <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>brightness_3</span>
                Slept at (last night)
              </label>
              <input
                id="bedtime-input"
                type="time"
                className="gemi-time-input"
                value={bedtime}
                onChange={(e) => setBedtime(e.target.value)}
                aria-label="Bedtime last night"
              />
            </div>
            <div className="gemi-sleep-divider">
              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--outline)' }}>arrow_forward</span>
            </div>
            <div className="gemi-sleep-picker-group">
              <label className="gemi-sleep-picker-label" htmlFor="waketime-input">
                <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>light_mode</span>
                Woke up (this morning)
              </label>
              <input
                id="waketime-input"
                type="time"
                className="gemi-time-input"
                value={waketime}
                onChange={(e) => setWaketime(e.target.value)}
                aria-label="Wake-up time this morning"
              />
            </div>
          </div>

          <div className="gemi-sleep-bar-row">
            <div className="gemi-sleep-progress-bg">
              <div
                className="gemi-sleep-progress-fill"
                style={{
                  width: `${Math.min(100, (sleepHours / 9) * 100)}%`,
                  backgroundColor: sleepQualityColor
                }}
              />
            </div>
            <span style={{ fontSize: '11px', color: 'var(--outline)', whiteSpace: 'nowrap' }}>Goal: 8h</span>
          </div>

          {sleepHours < 6 && (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', padding: '6px 10px', backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: '8px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#ef4444' }}>info</span>
              <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 600 }}>Less than 6h — recovery may be impaired. Aim for 7–9h.</span>
            </div>
          )}
        </div>
      </section>

      {/* Privacy Note */}
      <div className="lumina-food-privacy-note">
        <span className="material-symbols-outlined">lock</span>
        <span>Your data never leaves your phone.</span>
      </div>

      {/* Add Food Options Modal */}
      <FoodModal 
        isOpen={isOptionsModalOpen}
        onClose={() => setIsOptionsModalOpen(false)}
        activeLoggingMealId={activeLoggingMealId}
        setActiveLoggingMealId={setActiveLoggingMealId}
        fullFoodDatabase={fullFoodDatabase}
        isLoadingDb={isLoadingDb}
        dbLoadError={dbLoadError}
        onLoadDatabase={ensureDbLoaded}
        setFoodLogs={setFoodLogs}
        setToastMessage={setToastMessage}
      />
    </div>
  );
};
