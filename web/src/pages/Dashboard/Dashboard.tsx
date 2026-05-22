import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './Dashboard.css';
import { fetchLocalFoodDatabase } from '../../data/foodAdapter';
import type { GemiFoodItem } from '../../data/foodAdapter';

type TabType = 'dashboard' | 'food' | 'lift' | 'chat' | 'profile';
type ModalTab = 'search' | 'custom' | 'barcode';

interface Message {
  id: string;
  sender: 'assistant' | 'user';
  text: string;
}

interface Workout {
  id: string;
  name: string;
  sets: string;
  rpe: number;
  icon: string;
}

interface CustomFoodForm {
  name: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  fiber: string;
  sodium: string;
  servingUnit: string;
  servingSize: string;
}

export function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Retrieve passed state from registration/login or use premium defaults
  const passedData = location.state || {};
  const [fullName] = useState(passedData.fullName || 'Christian Gamos');
  const [email] = useState(passedData.email || 'christian.gamos@gemi.ai');
  const [gender] = useState(passedData.gender || 'male');
  const [height] = useState(passedData.height || '178 cm');
  const [weight] = useState(passedData.weight || '75 kg');
  const [goal] = useState(passedData.goal || 'build_muscle');

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  // --- Gemi Custom Advanced Food State ---
  const [foodLogs, setFoodLogs] = useState<any[]>([
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

  // Macro progress totals initialized to match the Stitch screen exactly
  const [proteinTotal, setProteinTotal] = useState(80);
  const [carbsTotal, setCarbsTotal] = useState(120);
  const [fatsTotal, setFatsTotal] = useState(45);

  // Carousel Slide State
  const [nutrientSlide, setNutrientSlide] = useState<'macros' | 'energy' | 'micros'>('energy');
  
  // Modals & Searching State
  const [isOptionsModalOpen, setIsOptionsModalOpen] = useState(false);
  const [activeLoggingMealId, setActiveLoggingMealId] = useState<string>('breakfast');
  const [activeTabSub, setActiveTabSub] = useState<ModalTab>('search');
  
  // Local DB State — includes user-created custom foods
  const [fullFoodDatabase, setFullFoodDatabase] = useState<GemiFoodItem[]>([]);
  const [customFoods, setCustomFoods] = useState<GemiFoodItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilterCategory, setSelectedFilterCategory] = useState('All');
  const [isLoadingDb, setIsLoadingDb] = useState(false);
  const [dbLoadError, setDbLoadError] = useState(false);
  
  // Food Configurator State
  const [selectedFoodItem, setSelectedFoodItem] = useState<GemiFoodItem | null>(null);
  const [configMealId, setConfigMealId] = useState('breakfast');
  const [configQuantity, setConfigQuantity] = useState(1);
  const [configUnit, setConfigUnit] = useState('');
  const [configGramWeight, setConfigGramWeight] = useState(100);
  
  // Custom Food Form State
  const emptyCustomForm: CustomFoodForm = { name: '', calories: '', protein: '', carbs: '', fat: '', fiber: '', sodium: '', servingUnit: 'serving', servingSize: '100' };
  const [customForm, setCustomForm] = useState<CustomFoodForm>(emptyCustomForm);
  const [customFormError, setCustomFormError] = useState('');

  // Barcode input State
  const [barcodeInput, setBarcodeInput] = useState('');

  // Water: individual glass toggles (HCI — each glass is independently clickable)
  const [waterGlassStates, setWaterGlassStates] = useState<boolean[]>(Array(8).fill(false).map((_, i) => i < 4));
  // Hydration goal: customizable in mL (default 2000mL = 8×250ml glasses)
  const [hydrationGoalMl, setHydrationGoalMl] = useState(2000);
  const [isEditingHydrationGoal, setIsEditingHydrationGoal] = useState(false);
  const [hydrationGoalInput, setHydrationGoalInput] = useState('2000');
  // Derived: how many "glasses" (250ml each) needed for the goal
  const glassesNeeded = Math.max(1, Math.ceil(hydrationGoalMl / 250));
  // Sync glass state array size when glassesNeeded changes
  const waterGlassCount = Math.min(glassesNeeded, 12); // cap at 12 for UI
  const waterConsumedMl = waterGlassStates.slice(0, waterGlassCount).filter(Boolean).length * 250;
  const waterGlasses = waterGlassStates.slice(0, waterGlassCount).filter(Boolean).length;

  // Sleep: interactive bedtime / wake time (HCI — user sets actual times)
  const [bedtime, setBedtime] = useState('23:00');
  const [waketime, setWaketime] = useState('06:30');
  const sleepHours = (() => {
    const [bh, bm] = bedtime.split(':').map(Number);
    const [wh, wm] = waketime.split(':').map(Number);
    let diff = (wh * 60 + wm) - (bh * 60 + bm);
    if (diff < 0) diff += 24 * 60; // cross-midnight
    return Math.round((diff / 60) * 10) / 10;
  })();
  const sleepQuality = sleepHours >= 8 ? 'Excellent' : sleepHours >= 7 ? 'Good' : sleepHours >= 6 ? 'Fair' : 'Needs Improvement';
  const sleepQualityColor = sleepHours >= 8 ? '#10b981' : sleepHours >= 7 ? '#0ea5e9' : sleepHours >= 6 ? '#f59e0b' : '#ef4444';

  const [baseSnackCalories, setBaseSnackCalories] = useState(245);
  const [foodQuickLogInput, setFoodQuickLogInput] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Reactive synchronizer of custom logs with legacy metrics state
  useEffect(() => {
    const p = foodLogs.reduce((acc, f) => acc + f.protein, 0);
    const c = foodLogs.reduce((acc, f) => acc + f.carbs, 0);
    const f = foodLogs.reduce((acc, f) => acc + f.fat, 0);
    const cals = foodLogs.reduce((acc, x) => acc + x.calories, 0);
    
    setProteinTotal(Number(p.toFixed(1)));
    setCarbsTotal(Number(c.toFixed(1)));
    setFatsTotal(Number(f.toFixed(1)));
    
    // Auto adjust baseSnackCalories so that legacy calculations map perfectly to logs
    const macroCals = (p * 4) + (c * 4) + (f * 9);
    setBaseSnackCalories(cals - macroCals);
  }, [foodLogs]);

  // Lazy load database when navigating to Food tab OR when opening the add modal
  const ensureDbLoaded = useCallback(() => {
    if (fullFoodDatabase.length === 0 && !isLoadingDb) {
      setIsLoadingDb(true);
      setDbLoadError(false);
      fetchLocalFoodDatabase().then(foods => {
        setFullFoodDatabase(foods);
        setIsLoadingDb(false);
      }).catch(err => {
        console.error('Failed to load local foods', err);
        setIsLoadingDb(false);
        setDbLoadError(true);
      });
    }
  }, [fullFoodDatabase.length, isLoadingDb]);

  useEffect(() => {
    if (activeTab === 'food' || isOptionsModalOpen) {
      ensureDbLoaded();
    }
  }, [activeTab, isOptionsModalOpen, ensureDbLoaded]);

  // Helper selectors for Meal lists
  const getMealItems = (mealId: string) => {
    return foodLogs.filter((log) => log.mealId === mealId);
  };
  
  const getMealCalories = (mealId: string) => {
    return getMealItems(mealId).reduce((acc, log) => acc + log.calories, 0);
  };

  // Combined searchable food list (USDA DB + user custom foods)
  const allSearchableFoods = [...fullFoodDatabase, ...customFoods];
  const filteredFoods = allSearchableFoods.filter(food => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = q === '' || 
                          food.name.toLowerCase().includes(q) || 
                          food.category.toLowerCase().includes(q);
    if (selectedFilterCategory === 'All') return matchesSearch;
    if (selectedFilterCategory === 'My Foods') return matchesSearch && food.category === 'My Foods';
    return matchesSearch && food.category.toLowerCase().includes(selectedFilterCategory.toLowerCase());
  }).slice(0, 60);

  // Targets based on goals (Christian is build_muscle, which targets 2300 calories matching Stitch)
  const targetCalories = goal === 'build_muscle' ? 2300 : goal === 'lose_weight' ? 2000 : 2400;
  const targetProtein = goal === 'build_muscle' ? 150 : goal === 'lose_weight' ? 130 : 140;
  const targetCarbs = goal === 'build_muscle' ? 200 : goal === 'lose_weight' ? 180 : 190;
  const targetFats = goal === 'build_muscle' ? 65 : goal === 'lose_weight' ? 50 : 60;

  // Derived current calories including macros and unspecified snacks
  const currentCalories = Math.round((proteinTotal * 4) + (carbsTotal * 4) + (fatsTotal * 9) + baseSnackCalories);
  const caloriesRemaining = Math.max(0, targetCalories - currentCalories);

  // SVG Progress Ring calculations matching stitch 282 circumference exactly
  const circumference = 282;
  const percentComplete = Math.min(100, (currentCalories / targetCalories) * 100);
  const strokeDashoffset = circumference - (percentComplete / 100) * circumference;

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
      id: 'quick_' + Date.now(),
      name: food.name,
      mealId: 'snack',
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fats,
      fiber: 2,
      sodium: 120,
      potassium: 180,
      calcium: 50,
      iron: 0.8,
      vitaminC: 1,
      folate: 12,
      servingSize: 1,
      servingUnit: 'serving'
    };
    setFoodLogs(prev => [...prev, newLog]);

    // Show a beautiful toast
    setToastMessage(`Quick Logged: ${food.name} (+${food.calories} kcal, P: ${food.protein}g)`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Stitch AI Natural Language Logging Parser
  const handleFoodQuickLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodQuickLogInput.trim()) return;

    const input = foodQuickLogInput.toLowerCase();
    let loggedMealName = foodQuickLogInput;
    let p = 15;
    let c = 30;
    let f = 8;
    let cals = 250;

    // Try to extract calories explicitly
    const calMatch = input.match(/(\d+)\s*(kcal|calories|cal)/);
    if (calMatch) {
      cals = parseInt(calMatch[1]);
      p = Math.round(cals * 0.2 / 4);
      c = Math.round(cals * 0.5 / 4);
      f = Math.round(cals * 0.3 / 9);
    } else {
      // Intelligent nutrition heuristics
      if (input.includes('egg') || input.includes('eggs')) {
        cals = 140; p = 12; c = 1; f = 10;
        loggedMealName = '2 Large Eggs';
      } else if (input.includes('toast') || input.includes('bread')) {
        cals = 120; p = 4; c = 24; f = 2;
        loggedMealName = 'Whole Wheat Toast';
      } else if (input.includes('banana') || input.includes('fruit')) {
        cals = 100; p = 1; c = 26; f = 0;
        loggedMealName = 'Fresh Banana';
      } else if (input.includes('shake') || input.includes('protein')) {
        cals = 200; p = 25; c = 5; f = 2;
        loggedMealName = 'Protein Shake';
      } else if (input.includes('chicken') || input.includes('breast')) {
        cals = 220; p = 38; c = 0; f = 5;
        loggedMealName = 'Grilled Chicken Breast';
      } else if (input.includes('salad')) {
        cals = 180; p = 15; c = 10; f = 8;
        loggedMealName = 'Garden Salad with Dressing';
      } else if (input.includes('steak') || input.includes('beef')) {
        cals = 350; p = 30; c = 0; f = 22;
        loggedMealName = 'Sirloin Steak';
      } else if (input.includes('rice')) {
        cals = 200; p = 4; c = 44; f = 1;
        loggedMealName = 'Brown Rice Portion';
      } else if (input.includes('burger')) {
        cals = 450; p = 25; c = 40; f = 18;
        loggedMealName = 'Premium Lean Burger';
      }
    }

    const hasDinner = foodLogs.some(x => x.mealId === 'dinner');
    const newLog = {
      id: 'ai_' + Date.now(),
      name: loggedMealName,
      mealId: hasDinner ? 'snack' : 'dinner',
      calories: cals,
      protein: p,
      carbs: c,
      fat: f,
      fiber: Math.round(cals * 0.02),
      sodium: Math.round(cals * 1.5),
      potassium: Math.round(cals * 2.2),
      calcium: Math.round(cals * 0.8),
      iron: Number((cals * 0.01).toFixed(2)),
      vitaminC: Math.round(cals * 0.05),
      folate: Math.round(cals * 0.2),
      servingSize: 1,
      servingUnit: 'portion'
    };
    setFoodLogs(prev => [...prev, newLog]);

    setToastMessage(`AI Logged: ${loggedMealName} (+${cals} kcal, P: ${p}g)`);
    setFoodQuickLogInput('');
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Water: toggle individual glass by index (HCI-compliant direct manipulation)
  const handleWaterGlassToggle = (idx: number) => {
    setWaterGlassStates(prev => {
      // Ensure array is long enough for current goal
      const arr = prev.length >= waterGlassCount
        ? [...prev]
        : [...prev, ...Array(waterGlassCount - prev.length).fill(false)];
      arr[idx] = !arr[idx];
      const count = arr.slice(0, waterGlassCount).filter(Boolean).length;
      if (count === waterGlassCount) {
        setToastMessage(`💦 Hydration goal reached! ${(hydrationGoalMl / 1000).toFixed(1)}L logged.`);
        setTimeout(() => setToastMessage(null), 4000);
      }
      return arr;
    });
  };

  // Custom food: validate and save to local custom foods list
  const handleSubmitCustomFood = () => {
    if (!customForm.name.trim()) { setCustomFormError('Food name is required.'); return; }
    const cals = Number(customForm.calories);
    if (isNaN(cals) || cals <= 0) { setCustomFormError('Enter a valid calorie value.'); return; }
    setCustomFormError('');
    const gram = Number(customForm.servingSize) || 100;
    const newCustomFood: GemiFoodItem = {
      id: 'custom_' + Date.now(),
      name: customForm.name.trim(),
      category: 'My Foods',
      calories: Math.round((cals / gram) * 100),
      protein: Math.round(((Number(customForm.protein) || 0) / gram) * 100 * 10) / 10,
      carbs: Math.round(((Number(customForm.carbs) || 0) / gram) * 100 * 10) / 10,
      fat: Math.round(((Number(customForm.fat) || 0) / gram) * 100 * 10) / 10,
      fiber: Math.round(((Number(customForm.fiber) || 0) / gram) * 100 * 10) / 10,
      sodium: Math.round(((Number(customForm.sodium) || 0) / gram) * 100),
      potassium: 0, calcium: 0, iron: 0, vitaminC: 0, folate: 0,
      defaultServingUnit: customForm.servingUnit || 'serving',
      defaultServingSize: gram,
      portions: [{ name: customForm.servingUnit || 'serving', gramWeight: gram, amount: 1 }]
    };
    setCustomFoods(prev => [newCustomFood, ...prev]);
    setCustomForm(emptyCustomForm);
    // Auto-select the new custom food in the configurator
    setSelectedFoodItem(newCustomFood);
    setConfigMealId(activeLoggingMealId);
    setConfigQuantity(1);
    setConfigUnit(newCustomFood.defaultServingUnit);
    setConfigGramWeight(newCustomFood.defaultServingSize);
    setToastMessage(`Custom food "${newCustomFood.name}" created!`);
    setTimeout(() => setToastMessage(null), 3000);
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
          <>
            {/* Bento Grid */}
            <section className="lumina-bento-grid">
              {/* Calories Card */}
              <div className="lumina-calories-card">
                <div>
                  <h2 className="lumina-card-label">Calories Remaining</h2>
                  <div className="lumina-calories-value">
                    <span className="lumina-cals-num">{caloriesRemaining.toLocaleString()}</span>
                    <span className="lumina-cals-total">/ {targetCalories.toLocaleString()} kcal</span>
                  </div>
                </div>
                
                <div className="lumina-progress-container">
                  <svg className="lumina-circular-progress" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" className="lumina-progress-bg" />
                    <circle 
                      cx="50" 
                      cy="50" 
                      r="45"
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
              </div>

              {/* Protein Card */}
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

              {/* Carbs Card */}
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

              {/* Fats Card */}
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

              {/* Add Snack Log Card */}
              <div className="lumina-quick-log-card" onClick={handleQuickLog}>
                <div className="lumina-quick-log-content">
                  <div className="lumina-quick-log-icon-box">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>add</span>
                  </div>
                  <span className="lumina-quick-log-text">Quick Log</span>
                </div>
              </div>
            </section>

            {/* AI Recovery Insight Card */}
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

            {/* Weekly Review & Streak */}
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

        {/* Food Tracker Tab (Stitch Integrated Food Logging Page) */}
        {activeTab === 'food' && (
          <div className="lumina-food-layout">
            {/* Toast System Notification */}
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

            {/* Gemi Hero Nutrients Carousel (Fade Transition) */}
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
                        strokeDashoffset={251.2 - (251.2 * 95.6) / 100} // BMR (1800) + Workouts (400) = 2200 kcal (~95.6% of 2300)
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

              {[
                { id: 'breakfast', name: 'Breakfast', icon: 'bakery_dining' },
                { id: 'lunch', name: 'Lunch', icon: 'lunch_dining' },
                { id: 'dinner', name: 'Dinner', icon: 'dinner_dining' },
                { id: 'snack', name: 'Snacks & Uncategorized', icon: 'cookie' }
              ].map((mealDef) => {
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
                          onClick={() => {
                            setActiveLoggingMealId(mealDef.id);
                            setIsOptionsModalOpen(true);
                          }}
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

              {/* ── WATER INTAKE ── Dynamic mL goal, individual glass toggles */}
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

                {/* Individual glass buttons — dynamic count */}
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

              {/* ── SLEEP LOG ── Bedtime (last night) + Wake-up (this morning) */}
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
                  alt="User Profile Photo" 
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
                className="lumina-ai-btn" 
                style={{ width: '100%', padding: '12px', height: 'auto', border: '1px solid #ba1a1a', color: '#ba1a1a', background: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 600 }}
                onClick={() => navigate('/login')}
              >
                Sign Out
              </button>
            </div>

            <div className="lumina-weekly-card">
              <h3 className="lumina-weekly-title" style={{ fontSize: '16px', marginBottom: '16px' }}>On-Device Privacy Profile</h3>
              <p style={{ fontSize: '14px', lineHeight: '22px', color: 'var(--on-surface-variant)', margin: '0 0 16px 0' }}>
                Your Gemi profile resides strictly in your offline browser sandboxed storage. Your personal information, fitness logs, and AI conversations never touch the cloud, honoring strict data dignity policies.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', padding: '12px', backgroundColor: 'var(--surface-bright)', borderRadius: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--on-surface-variant)' }}>Gemma AI Weights</span>
                  <span style={{ fontSize: '12px', color: '#059669', fontWeight: 700 }}>Active Local (2.2B)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', padding: '12px', backgroundColor: 'var(--surface-bright)', borderRadius: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--on-surface-variant)' }}>Data Encryption</span>
                  <span style={{ fontSize: '12px', color: '#059669', fontWeight: 700 }}>AES-GCM Local</span>
                </div>
              </div>
            </div>
          </div>
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

      {/* Gemi Add Food Slide-Up Options Modal */}
      {isOptionsModalOpen && (
        <div className="gemi-modal-overlay" onClick={() => {
          setIsOptionsModalOpen(false);
          setSelectedFoodItem(null);
        }}>
          <div className="gemi-modal-sheet" onClick={(e) => e.stopPropagation()}>
            {selectedFoodItem === null ? (
              <>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--on-surface)' }}>
                    Add Food to {activeLoggingMealId.charAt(0).toUpperCase() + activeLoggingMealId.slice(1)}
                  </h3>
                  <button 
                    aria-label="Close modal"
                    onClick={() => {
                      setIsOptionsModalOpen(false);
                      setSelectedFoodItem(null);
                    }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--outline)' }}
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                {/* Sub-tabs toggles */}
                <div className="gemi-filter-tabs" style={{ marginBottom: '16px' }}>
                  <span 
                    className={`gemi-filter-pill ${activeTabSub === 'search' ? 'active' : ''}`}
                    onClick={() => { setActiveTabSub('search'); ensureDbLoaded(); }}
                  >
                    Food Database
                  </span>
                  <span 
                    className={`gemi-filter-pill ${activeTabSub === 'custom' ? 'active' : ''}`}
                    onClick={() => setActiveTabSub('custom')}
                  >
                    + Custom Food
                  </span>
                  <span 
                    className={`gemi-filter-pill ${activeTabSub === 'barcode' ? 'active' : ''}`}
                    onClick={() => setActiveTabSub('barcode')}
                  >
                    Scan (BETA)
                  </span>
                </div>

                {/* Database Search Section */}
                {activeTabSub === 'search' && (
                  <div className="gemi-search-wrapper">
                    <div className="gemi-search-bar-row">
                      <div className="gemi-search-input-container">
                        <span className="material-symbols-outlined gemi-search-icon">search</span>
                        <input 
                          type="text"
                          className="gemi-search-field"
                          placeholder="Search 1000s of foods (e.g. Chicken, Egg, Hummus)..."
                          value={searchQuery}
                          autoFocus
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                          <button 
                            onClick={() => setSearchQuery('')} 
                            style={{ 
                              position: 'absolute',
                              right: '12px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: 'var(--outline)',
                              padding: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              zIndex: 2
                            }} 
                            aria-label="Clear search"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Filter Categories */}
                    <div className="gemi-filter-tabs" style={{ flexWrap: 'wrap', gap: '6px' }}>
                      {['All', 'My Foods', 'Vegetables', 'Dairy', 'Legumes', 'Finfish', 'Poultry', 'Beef'].map((cat) => (
                        <span 
                          key={cat}
                          className={`gemi-filter-pill ${selectedFilterCategory === cat ? 'active' : ''}`}
                          onClick={() => setSelectedFilterCategory(cat)}
                        >
                          {cat}
                        </span>
                      ))}
                    </div>

                    {/* Results list */}
                    <div className="gemi-results-list">
                      {isLoadingDb ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px', gap: '12px', color: 'var(--outline)', fontSize: '13px' }}>
                          <div className="gemi-loading-spinner" />
                          <span>Loading USDA Foundation Foods Database...</span>
                        </div>
                      ) : dbLoadError ? (
                        <div style={{ textAlign: 'center', padding: '24px' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--error)' }}>cloud_off</span>
                          <p style={{ fontSize: '13px', color: 'var(--outline)', margin: '8px 0 0' }}>Failed to load database. Check your setup.</p>
                        </div>
                      ) : filteredFoods.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '32px' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '36px', color: 'var(--outline-variant)' }}>search_off</span>
                          <p style={{ fontSize: '13px', color: 'var(--outline)', margin: '8px 0 4px' }}>No matches found</p>
                          <p style={{ fontSize: '11px', color: 'var(--outline-variant)', margin: 0 }}>Try "Tomato", "Hummus", "Chicken Breast", or "Oat"</p>
                        </div>
                      ) : (
                        filteredFoods.map((food) => (
                          <div 
                            key={food.id}
                            className="gemi-result-row"
                            onClick={() => {
                              setSelectedFoodItem(food);
                              setConfigMealId(activeLoggingMealId);
                              setConfigQuantity(1);
                              setConfigUnit(food.defaultServingUnit);
                              setConfigGramWeight(food.defaultServingSize);
                            }}
                          >
                            <div className="gemi-result-info">
                              <span className="gemi-result-name">{food.name}</span>
                              <span className="gemi-result-category">{food.category}</span>
                              <span className="gemi-result-nutrition">
                                P: {food.protein}g | C: {food.carbs}g | F: {food.fat}g (per 100g)
                              </span>
                            </div>
                            <div className="gemi-result-cals-badge">
                              <span className="gemi-result-cals-num">{food.calories}</span>
                              <span className="gemi-result-cals-label">kcal / 100g</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Custom Food Creator */}
                {activeTabSub === 'custom' && (
                  <div className="gemi-custom-food-form">
                    <p className="gemi-custom-food-hint">
                      Create a reusable custom food. It will appear under <strong>My Foods</strong> in future sessions.
                    </p>

                    {customFormError && (
                      <div className="gemi-custom-form-error">
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>error</span>
                        {customFormError}
                      </div>
                    )}

                    <div className="gemi-custom-form-field">
                      <label className="gemi-custom-form-label" htmlFor="cf-name">Food Name *</label>
                      <input id="cf-name" type="text" className="gemi-custom-form-input" placeholder="e.g. Homemade Protein Bar"
                        value={customForm.name} onChange={e => setCustomForm(p => ({...p, name: e.target.value}))} />
                    </div>

                    <div className="gemi-custom-form-row-2">
                      <div className="gemi-custom-form-field">
                        <label className="gemi-custom-form-label" htmlFor="cf-servsize">Serving Size (g) *</label>
                        <input id="cf-servsize" type="number" min="1" className="gemi-custom-form-input" placeholder="100"
                          value={customForm.servingSize} onChange={e => setCustomForm(p => ({...p, servingSize: e.target.value}))} />
                      </div>
                      <div className="gemi-custom-form-field">
                        <label className="gemi-custom-form-label" htmlFor="cf-servunit">Serving Unit</label>
                        <input id="cf-servunit" type="text" className="gemi-custom-form-input" placeholder="serving, cup, piece..."
                          value={customForm.servingUnit} onChange={e => setCustomForm(p => ({...p, servingUnit: e.target.value}))} />
                      </div>
                    </div>

                    <div className="gemi-custom-form-divider">Nutrition per Serving</div>

                    <div className="gemi-custom-form-row-2">
                      <div className="gemi-custom-form-field">
                        <label className="gemi-custom-form-label" htmlFor="cf-cals">Calories (kcal) *</label>
                        <input id="cf-cals" type="number" min="0" className="gemi-custom-form-input" placeholder="0"
                          value={customForm.calories} onChange={e => setCustomForm(p => ({...p, calories: e.target.value}))} />
                      </div>
                      <div className="gemi-custom-form-field">
                        <label className="gemi-custom-form-label" htmlFor="cf-protein">Protein (g)</label>
                        <input id="cf-protein" type="number" min="0" step="0.1" className="gemi-custom-form-input" placeholder="0"
                          value={customForm.protein} onChange={e => setCustomForm(p => ({...p, protein: e.target.value}))} />
                      </div>
                    </div>

                    <div className="gemi-custom-form-row-3">
                      <div className="gemi-custom-form-field">
                        <label className="gemi-custom-form-label" htmlFor="cf-carbs">Carbs (g)</label>
                        <input id="cf-carbs" type="number" min="0" step="0.1" className="gemi-custom-form-input" placeholder="0"
                          value={customForm.carbs} onChange={e => setCustomForm(p => ({...p, carbs: e.target.value}))} />
                      </div>
                      <div className="gemi-custom-form-field">
                        <label className="gemi-custom-form-label" htmlFor="cf-fat">Fat (g)</label>
                        <input id="cf-fat" type="number" min="0" step="0.1" className="gemi-custom-form-input" placeholder="0"
                          value={customForm.fat} onChange={e => setCustomForm(p => ({...p, fat: e.target.value}))} />
                      </div>
                      <div className="gemi-custom-form-field">
                        <label className="gemi-custom-form-label" htmlFor="cf-fiber">Fiber (g)</label>
                        <input id="cf-fiber" type="number" min="0" step="0.1" className="gemi-custom-form-input" placeholder="0"
                          value={customForm.fiber} onChange={e => setCustomForm(p => ({...p, fiber: e.target.value}))} />
                      </div>
                    </div>

                    <div className="gemi-custom-form-field">
                      <label className="gemi-custom-form-label" htmlFor="cf-sodium">Sodium (mg)</label>
                      <input id="cf-sodium" type="number" min="0" className="gemi-custom-form-input" placeholder="0"
                        value={customForm.sodium} onChange={e => setCustomForm(p => ({...p, sodium: e.target.value}))} />
                    </div>

                    <button className="gemi-action-btn primary" style={{ marginTop: '16px', width: '100%' }} onClick={handleSubmitCustomFood}>
                      Save & Configure Serving
                    </button>
                  </div>
                )}

                {/* Barcode scanner mockup section */}
                {activeTabSub === 'barcode' && (
                  <div className="gemi-scanner-container">
                    <div className="gemi-scanner-viewfinder">
                      <div className="gemi-scanner-laser" />
                      <div className="gemi-scanner-corner tl" />
                      <div className="gemi-scanner-corner tr" />
                      <div className="gemi-scanner-corner bl" />
                      <div className="gemi-scanner-corner br" />
                      <span className="gemi-scanner-overlay-text">Laser Active</span>
                    </div>

                    <div className="gemi-scanner-manual">
                      <span className="gemi-scanner-label">Mock Scanner Code Input:</span>
                      <div className="gemi-scanner-row">
                        <input 
                          type="text" 
                          className="gemi-scanner-input"
                          placeholder="e.g. 0412200"
                          value={barcodeInput}
                          onChange={(e) => setBarcodeInput(e.target.value)}
                        />
                        <button 
                          className="gemi-action-btn primary"
                          style={{ padding: '0 24px', flex: 'none', borderRadius: '12px' }}
                          onClick={() => {
                            const hummus = fullFoodDatabase.find(f => f.name.toLowerCase().includes('hummus'));
                            if (hummus && (barcodeInput === '0412200' || barcodeInput === '412200')) {
                              setSelectedFoodItem(hummus);
                              setConfigMealId(activeLoggingMealId);
                              setConfigQuantity(1);
                              setConfigUnit(hummus.defaultServingUnit);
                              setConfigGramWeight(hummus.defaultServingSize);
                              setToastMessage("Matched Barcode: Hummus commercial");
                              setTimeout(() => setToastMessage(null), 2500);
                            } else {
                              setToastMessage("Beta Code not found! Try entering '0412200' for Hummus.");
                              setTimeout(() => setToastMessage(null), 3000);
                            }
                          }}
                        >
                          Scan
                        </button>
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--outline)', marginTop: '4px', display: 'block' }}>
                        *Beta feature. Enter code <strong>0412200</strong> to mock scan local hummus staple.
                      </span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Configurator detailed item pane */
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {/* Config Header */}
                <div className="gemi-config-header">
                  <button className="gemi-config-back" onClick={() => setSelectedFoodItem(null)}>
                    <span className="material-symbols-outlined">arrow_back</span>
                  </button>
                  <h3 className="gemi-config-title">{selectedFoodItem.name}</h3>
                </div>

                {/* Meal Select Category Row */}
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--outline)', marginBottom: '8px' }}>Log to Meal:</span>
                <div className="gemi-meal-selector-row">
                  {[
                    { id: 'breakfast', label: 'Breakfast', icon: 'bakery_dining' },
                    { id: 'lunch', label: 'Lunch', icon: 'lunch_dining' },
                    { id: 'dinner', label: 'Dinner', icon: 'dinner_dining' },
                    { id: 'snack', label: 'Snack', icon: 'cookie' }
                  ].map((meal) => (
                    <div 
                      key={meal.id}
                      className={`gemi-meal-selector-btn ${configMealId === meal.id ? 'active' : ''}`}
                      onClick={() => setConfigMealId(meal.id)}
                    >
                      <span className="material-symbols-outlined gemi-meal-selector-icon">{meal.icon}</span>
                      <span className="gemi-meal-selector-label">{meal.label}</span>
                    </div>
                  ))}
                </div>

                {/* Portion Sizes & Servings */}
                <div className="gemi-portion-row">
                  <div className="gemi-multiplier-box">
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--outline)', marginBottom: '4px', display: 'block' }}>Servings:</span>
                    <input 
                      type="number"
                      step="0.25"
                      min="0.1"
                      className="gemi-multiplier-input"
                      value={configQuantity}
                      onChange={(e) => setConfigQuantity(Number(e.target.value))}
                    />
                  </div>

                  <div className="gemi-unit-chips-container">
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--outline)', marginBottom: '4px', display: 'block' }}>Portion Size:</span>
                    <div className="gemi-unit-chips">
                      {/* Portions list parsed from USDA database */}
                      {selectedFoodItem.portions && selectedFoodItem.portions.map((port, idx) => (
                        <span 
                          key={port.name + idx}
                          className={`gemi-unit-chip ${configUnit === port.name ? 'active' : ''}`}
                          onClick={() => {
                            setConfigUnit(port.name);
                            setConfigGramWeight(port.gramWeight);
                          }}
                        >
                          {port.amount} {port.name} ({port.gramWeight}g)
                        </span>
                      ))}
                      {/* Standard 100g option */}
                      <span 
                        className={`gemi-unit-chip ${configUnit === '100g' ? 'active' : ''}`}
                        onClick={() => {
                          setConfigUnit('100g');
                          setConfigGramWeight(100);
                        }}
                      >
                        100g
                      </span>
                    </div>
                  </div>
                </div>

                {/* Nutrition Summary Box */}
                {(() => {
                  const multiplier = configQuantity * (configGramWeight / 100);
                  const scaledCals = Math.round(selectedFoodItem.calories * multiplier);
                  const scaledProtein = Number((selectedFoodItem.protein * multiplier).toFixed(1));
                  const scaledCarbs = Number((selectedFoodItem.carbs * multiplier).toFixed(1));
                  const scaledFat = Number((selectedFoodItem.fat * multiplier).toFixed(1));

                  return (
                    <>
                      <div className="gemi-config-summary-grid">
                        <div className="gemi-summary-box cals">
                          <span className="gemi-summary-num" style={{ color: 'var(--primary)' }}>{scaledCals}</span>
                          <span className="gemi-summary-label">Calories</span>
                        </div>
                        <div className="gemi-summary-box">
                          <span className="gemi-summary-num">{scaledProtein}g</span>
                          <span className="gemi-summary-label">Protein</span>
                        </div>
                        <div className="gemi-summary-box">
                          <span className="gemi-summary-num">{scaledCarbs}g</span>
                          <span className="gemi-summary-label">Carbs</span>
                        </div>
                        <div className="gemi-summary-box">
                          <span className="gemi-summary-num">{scaledFat}g</span>
                          <span className="gemi-summary-label">Fats</span>
                        </div>
                      </div>

                      {/* Detail Micronutrient list */}
                      <div className="gemi-detail-micros-section">
                        <h4 className="gemi-detail-micros-title">Micronutrient Highlights:</h4>
                        <div className="gemi-detail-micros-list">
                          <div className="gemi-detail-micro-row">
                            <span className="gemi-detail-micro-name">Fiber</span>
                            <span className="gemi-detail-micro-value">{(selectedFoodItem.fiber * multiplier).toFixed(1)}g</span>
                          </div>
                          <div className="gemi-detail-micro-row">
                            <span className="gemi-detail-micro-name">Sodium</span>
                            <span className="gemi-detail-micro-value">{Math.round(selectedFoodItem.sodium * multiplier)}mg</span>
                          </div>
                          <div className="gemi-detail-micro-row">
                            <span className="gemi-detail-micro-name">Potassium</span>
                            <span className="gemi-detail-micro-value">{Math.round(selectedFoodItem.potassium * multiplier)}mg</span>
                          </div>
                          <div className="gemi-detail-micro-row">
                            <span className="gemi-detail-micro-name">Calcium</span>
                            <span className="gemi-detail-micro-value">{Math.round(selectedFoodItem.calcium * multiplier)}mg</span>
                          </div>
                          <div className="gemi-detail-micro-row">
                            <span className="gemi-detail-micro-name">Iron</span>
                            <span className="gemi-detail-micro-value">{(selectedFoodItem.iron * multiplier).toFixed(2)}mg</span>
                          </div>
                          <div className="gemi-detail-micro-row">
                            <span className="gemi-detail-micro-name">Vitamin C</span>
                            <span className="gemi-detail-micro-value">{(selectedFoodItem.vitaminC * multiplier).toFixed(1)}mg</span>
                          </div>
                          <div className="gemi-detail-micro-row">
                            <span className="gemi-detail-micro-name">Folate</span>
                            <span className="gemi-detail-micro-value">{Math.round(selectedFoodItem.folate * multiplier)}µg</span>
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}

                {/* Action Buttons */}
                <div className="gemi-modal-actions">
                  <button className="gemi-action-btn secondary" onClick={() => setSelectedFoodItem(null)}>
                    Back to List
                  </button>
                  <button 
                    className="gemi-action-btn primary"
                    onClick={() => {
                      const multiplier = configQuantity * (configGramWeight / 100);
                      const newLog = {
                        id: 'log_' + Date.now(),
                        name: selectedFoodItem.name,
                        mealId: configMealId,
                        calories: Math.round(selectedFoodItem.calories * multiplier),
                        protein: Number((selectedFoodItem.protein * multiplier).toFixed(1)),
                        carbs: Number((selectedFoodItem.carbs * multiplier).toFixed(1)),
                        fat: Number((selectedFoodItem.fat * multiplier).toFixed(1)),
                        fiber: Number((selectedFoodItem.fiber * multiplier).toFixed(1)),
                        sodium: Math.round(selectedFoodItem.sodium * multiplier),
                        potassium: Math.round(selectedFoodItem.potassium * multiplier),
                        calcium: Math.round(selectedFoodItem.calcium * multiplier),
                        iron: Number((selectedFoodItem.iron * multiplier).toFixed(2)),
                        vitaminC: Number((selectedFoodItem.vitaminC * multiplier).toFixed(1)),
                        folate: Math.round(selectedFoodItem.folate * multiplier),
                        servingSize: configQuantity,
                        servingUnit: configUnit || 'serving'
                      };
                      setFoodLogs(prev => [...prev, newLog]);
                      setSelectedFoodItem(null);
                      setIsOptionsModalOpen(false);
                      setToastMessage(`Logged: ${newLog.name} (+${newLog.calories} kcal)`);
                      setTimeout(() => setToastMessage(null), 3000);
                    }}
                  >
                    Log Food Item
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
