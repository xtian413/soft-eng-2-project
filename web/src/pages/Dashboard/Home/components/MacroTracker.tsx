import React from 'react';

interface MacroTrackerProps {
  proteinTotal: number;
  targetProtein: number;
  carbsTotal: number;
  targetCarbs: number;
  fatsTotal: number;
  targetFats: number;
}

export const MacroTracker: React.FC<MacroTrackerProps> = ({
  proteinTotal,
  targetProtein,
  carbsTotal,
  targetCarbs,
  fatsTotal,
  targetFats,
}) => {
  return (
    <>
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
    </>
  );
};
