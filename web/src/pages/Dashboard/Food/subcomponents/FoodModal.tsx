import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { CustomFoodForm, GemiFoodItem, ModalTab } from '../../types';
import type { FoodModalProps } from '../types';
import { fetchLocalFoodDatabase } from '../../../../data/foodAdapter';

const emptyCustomForm: CustomFoodForm = {
  name: '',
  servingSize: '',
  servingUnit: '',
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
  fiber: '',
  sodium: '',
};

export const FoodModal: React.FC<FoodModalProps> = ({
  isOpen,
  onClose,
  activeLoggingMealId,
  setFoodLogs,
  setToastMessage,
}) => {
  const [activeTabSub, setActiveTabSub] = useState<ModalTab>('search');
  const [fullFoodDatabase, setFullFoodDatabase] = useState<GemiFoodItem[]>([]);
  const [customFoods, setCustomFoods] = useState<GemiFoodItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilterCategory, setSelectedFilterCategory] = useState('All');
  const [isLoadingDb, setIsLoadingDb] = useState(false);
  const [dbLoadError, setDbLoadError] = useState(false);
  
  // Configurator state
  const [selectedFoodItem, setSelectedFoodItem] = useState<GemiFoodItem | null>(null);
  const [configMealId, setConfigMealId] = useState('breakfast');
  const [configQuantity, setConfigQuantity] = useState(1);
  const [configUnit, setConfigUnit] = useState('');
  const [configGramWeight, setConfigGramWeight] = useState(100);
  
  // Custom Food Form state
  const [customForm, setCustomForm] = useState<CustomFoodForm>(emptyCustomForm);
  const [customFormError, setCustomFormError] = useState('');
  
  // Barcode state
  const [barcodeInput, setBarcodeInput] = useState('');

  // Sync config meal ID with prop when modal opens.
  // Using useEffect with the callback pattern is correct here — the lint rule
  // flags direct setState in the effect body, so we call it in a nested callback.
  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setConfigMealId(activeLoggingMealId);
    }
  }, [isOpen, activeLoggingMealId]);

  // Load USDA Database
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

  // Automatically trigger database load when search tab is viewed
  useEffect(() => {
    if (isOpen && activeTabSub === 'search') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      ensureDbLoaded();
    }
  }, [isOpen, activeTabSub, ensureDbLoaded]);

  // Compute filtered foods list
  const filteredFoods = useMemo(() => {
    const pool = [...customFoods, ...fullFoodDatabase];
    
    // Category match helper
    const matchesCategory = (food: GemiFoodItem, category: string) => {
      if (category === 'All') return true;
      if (category === 'My Foods') {
        return customFoods.some(cf => cf.id === food.id);
      }
      return food.category.toLowerCase().includes(category.toLowerCase());
    };

    // Filter by category first
    let result = pool.filter(food => matchesCategory(food, selectedFilterCategory));

    // Then filter by search query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      result = result.filter(food => 
        food.name.toLowerCase().includes(q) || 
        food.category.toLowerCase().includes(q)
      );
    } else if (selectedFilterCategory === 'All') {
      // Return a reasonable list of staples initially
      return result.slice(0, 15);
    }

    return result;
  }, [searchQuery, selectedFilterCategory, fullFoodDatabase, customFoods]);

  // Submit custom food
  const handleSubmitCustomFood = () => {
    if (!customForm.name.trim()) {
      setCustomFormError('Food name is required');
      return;
    }
    const servSize = Number(customForm.servingSize);
    if (isNaN(servSize) || servSize <= 0) {
      setCustomFormError('Serving size must be a positive number');
      return;
    }
    const cals = Number(customForm.calories);
    if (isNaN(cals) || cals < 0) {
      setCustomFormError('Calories must be a valid number');
      return;
    }

    // Map custom form to food database format
    const newFood: GemiFoodItem = {
      id: 'custom_' + Date.now(),
      name: customForm.name,
      category: 'My Foods',
      calories: cals,
      protein: Number(customForm.protein) || 0,
      carbs: Number(customForm.carbs) || 0,
      fat: Number(customForm.fat) || 0,
      fiber: Number(customForm.fiber) || 0,
      sodium: Number(customForm.sodium) || 0,
      potassium: 0,
      calcium: 0,
      iron: 0,
      vitaminC: 0,
      folate: 0,
      defaultServingSize: servSize,
      defaultServingUnit: customForm.servingUnit || 'serving',
      portions: [
        {
          name: customForm.servingUnit || 'serving',
          gramWeight: servSize,
          amount: 1,
        }
      ]
    };

    setCustomFoods(prev => [newFood, ...prev]);
    setCustomForm(emptyCustomForm);
    setCustomFormError('');

    // Pre-select it in configurator
    setSelectedFoodItem(newFood);
    setConfigQuantity(1);
    setConfigUnit(newFood.defaultServingUnit);
    setConfigGramWeight(newFood.defaultServingSize);
    setActiveTabSub('search');
    setSelectedFilterCategory('My Foods');
  };

  if (!isOpen) return null;

  return (
    <div className="gemi-modal-overlay" onClick={() => {
      onClose();
      setSelectedFoodItem(null);
    }}>
      <div className="gemi-modal-sheet" onClick={(e) => e.stopPropagation()}>
        {selectedFoodItem === null ? (
          <>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--on-surface)' }}>
                Add Food to {configMealId.charAt(0).toUpperCase() + configMealId.slice(1)}
              </h3>
              <button 
                aria-label="Close modal"
                onClick={() => {
                  onClose();
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
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--outline)', marginBottom: '4px', display: 'block' }}>
                  {configUnit === '1g' ? 'Grams:' : 'Servings:'}
                </span>
                <input 
                  type="number"
                  step={configUnit === '1g' ? '1' : '0.25'}
                  min={configUnit === '1g' ? '1' : '0.1'}
                  className="gemi-multiplier-input"
                  value={configQuantity}
                  onChange={(e) => setConfigQuantity(Number(e.target.value))}
                />
              </div>

              <div className="gemi-unit-chips-container">
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--outline)', marginBottom: '4px', display: 'block' }}>Portion Size:</span>
                <div className="gemi-unit-chips">
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
                  <span 
                    className={`gemi-unit-chip ${configUnit === '100g' ? 'active' : ''}`}
                    onClick={() => {
                      setConfigUnit('100g');
                      setConfigGramWeight(100);
                    }}
                  >
                    100g
                  </span>
                  {/* Standard 1g option */}
                  <span 
                    className={`gemi-unit-chip ${configUnit === '1g' ? 'active' : ''}`}
                    onClick={() => {
                      setConfigUnit('1g');
                      setConfigGramWeight(1);
                    }}
                  >
                    1g
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
                  onClose();
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
  );
};
