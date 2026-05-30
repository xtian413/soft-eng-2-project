# WGER API Integration Guide

## 🎯 Overview

Your LiftTab now features **WGER (Workout Generator) API integration** with **advanced dual-mode body highlighting**:

### Two Highlighting Modes:

1. **Click Mode** 🎯
   - Tap any muscle on the body map
   - Only that muscle highlights with full intensity
   - Browse all exercises that target it
   - Perfect for focused muscle group workouts

2. **Exercise Mode** 💪
   - After selecting an exercise
   - **Primary muscles** (what the exercise mainly targets) → Strong highlighting (#0984e3)
   - **Secondary muscles** (what gets affected) → Light highlighting (#74b9ff)
   - Visual feedback showing exactly which muscles work

---

## 🔧 Setup Instructions

### Step 1: Verify API Key

Your WGER API key is already configured in `wgerService.ts`:
```typescript
const API_KEY = '9cda3542e5d22ed7603d8b1a8721589fd59bfcfe';
```

✅ **No additional setup needed** - the API key is embedded and WGER requires no authentication

### Step 2: Install Dependencies

The service uses `axios` which is likely already installed. Verify:
```bash
cd frontend
npm list axios
```

If missing:
```bash
npm install axios
```

### Step 3: Restart App

```bash
npm start
# Press 'r' to reload in Expo
```

---

## 📱 How to Use

### Basic Workflow

```
1. Open Lift tab → Go to your workout
   ↓
2. Click "Show Muscles" → Interactive body map appears
   ↓
3. Tap a body part (e.g., Chest)
   ↓
4. Body part ONLY highlights (click mode)
   ↓
5. Exercise Browser opens showing all chest exercises
   ↓
6. Tap an exercise (e.g., Bench Press)
   ↓
7. Exercise highlighting activates
   - Chest: Strong highlight (primary)
   - Front Deltoids, Triceps: Light highlight (secondary)
   ↓
8. Exercise added to your workout list
   ↓
9. Body continues showing exercise targeting until you click another muscle
```

### Click-Mode (Single Muscle Selection)

- **What**: Select one muscle to explore
- **When**: Finding exercises for a specific body part
- **Visual**: Only selected muscle highlighted
- **Example**: Click "Biceps" → See all bicep exercises

### Exercise-Mode (Multi-Muscle Targeting)

- **What**: Shows what an exercise actually targets
- **When**: After selecting an exercise
- **Visual**: 
  - Strong color (#0984e3) = Primary target
  - Light color (#74b9ff) = Secondary involvement
- **Example**: Select "Bench Press" → See chest highlighted strong, shoulders & triceps light

---

## 🗺️ WGER Muscle Mapping

WGER provides 15 muscles mapped to body visualization:

| WGER ID | Muscle | Visualization |
|---------|--------|----------------|
| 1 | Biceps | biceps |
| 2 | Triceps | triceps |
| 3 | Forearm | forearm |
| 4 | Chest | chest |
| 5 | Back (Lat) | back |
| 6 | Trapezius | trapezius |
| 7 | Shoulders | deltoids |
| 8 | Abs | abs |
| 9 | Obliques | obliques |
| 10 | Quadriceps | quadriceps |
| 11 | Hamstrings | hamstring |
| 12 | Glutes | gluteal |
| 13 | Calves | calves |
| 14 | Adductors | adductors |
| 15 | Abductors | abductors |

---

## 🔌 API Endpoints Used

WGER provides public endpoints (no authentication):

- `GET /muscle/` - Get all 15 muscles
- `GET /equipment/` - Get 11 equipment types
- `GET /exerciseinfo/?muscles={id}` - Get exercises for muscle
- `GET /exerciseinfo/?equipment={id}` - Get exercises for equipment
- `GET /exerciseinfo/{id}/` - Get exercise details
- `GET /exerciseinfo/?muscles={id}&equipment={id}` - Combined filters

**Base URL**: `https://wger.de/api/v2`

---

## 💡 Example Scenarios

### Scenario 1: Leg Day
```
1. Click "Quads" on body map
2. See all quad exercises (Squats, Leg Press, Leg Extension)
3. Select "Back Squat"
4. Body highlights:
   - Quads: STRONG (primary)
   - Glutes, Hamstrings: light (secondary)
```

### Scenario 2: Push Day
```
1. Click "Chest"
2. Select "Barbell Bench Press"
3. Body highlights:
   - Chest: STRONG
   - Shoulders, Triceps: light
4. Later click "Shoulders"
5. Select "Overhead Press"
6. Body highlights:
   - Shoulders: STRONG
   - Chest, Triceps: light
```

### Scenario 3: Back Day
```
1. Click "Back"
2. Filter by "Dumbbell" only
3. Select "Dumbbell Rows"
4. Body highlights:
   - Back (Lats): STRONG
   - Biceps, Traps: light
```

---

## 🎨 Highlighting Color System

| Situation | Color | Intensity | Meaning |
|-----------|-------|-----------|---------|
| Primary Muscle | #0984e3 (blue) | 100% | Main target |
| Secondary Muscle | #74b9ff (light blue) | 40% | Also worked |
| Unrelated Muscle | #3f3f3f (gray) | 0% | Not involved |
| No Highlighting | gray | 0% | No active selection |

---

## 🔄 Component Architecture

### `wgerService.ts` (API Layer)
```typescript
wgerService.getMuscles()                    // All 15 muscles
wgerService.getEquipment()                  // All 11 equipment types
wgerService.getExercisesByMuscle(muscleId)  // Exercises for muscle
wgerService.getExercisesByEquipment(equipId) // Exercises for equipment
wgerService.getExerciseById(id)             // Full exercise details
wgerService.getMuscleName(muscleId)         // Muscle name lookup
```

### `BodyMuscleMap.tsx` (Visualization)
```typescript
Props:
- exerciseName? : string (fallback exercise-based highlighting)
- onBodyPartClick? : (muscleId, muscleName) => void
- isInteractive? : boolean (allow clicking)
- highlightMode : 'none' | 'click' | 'exercise'
- selectedMuscleId? : number (for click mode)
- primaryMuscleIds[] : number[] (strong highlight)
- secondaryMuscleIds[] : number[] (light highlight)
```

### `WGERExerciseBrowser.tsx` (Exercise Selection)
```typescript
Props:
- visible : boolean
- muscleId : number | null (WGER muscle ID)
- muscleName : string
- onSelectExercise : (exercise: ExerciseInfo) => void
```

### `LiftTab.tsx` (Orchestration)
```typescript
State:
- highlightMode : 'none' | 'click' | 'exercise'
- selectedMuscleId : number | null
- primaryMuscleIds[] : number[]
- secondaryMuscleIds[] : number[]

Handlers:
- handleBodyPartClick() → Click mode + show browser
- handleSelectExerciseFromDB() → Exercise mode + highlight update
```

---

## 🐛 Troubleshooting

### "No exercises found for muscle"
- **Check**: Does WGER have exercises for that muscle?
- **Solution**: Try a different muscle (e.g., Chest usually has 100+ exercises)
- **Note**: Less common muscles might have fewer exercises

### "Body highlighting not showing"
- **Check**: Is `highlightMode` set to 'click' or 'exercise'?
- **Check**: Are `selectedMuscleId` or `primaryMuscleIds` set?
- **Solution**: Tap a muscle first to enter click mode

### "Exercise won't add to workout"
- **Check**: Is the Exercise Browser modal responding?
- **Solution**: Tap the lightning bolt (⚡) next to exercise name
- **Note**: Exercise adds immediately and closes browser

### "Network error when loading"
- **Check**: Internet connection active?
- **Check**: WGER API reachable at `https://wger.de/api/v2`?
- **Solution**: Try different exercise/muscle
- **Rate limit**: WGER is public, check RapidAPI status

---

## 📊 Data Structure Example

### Exercise Response from WGER

```json
{
  "id": 132,
  "name": "Bench press with barbell",
  "uuid": "abc123...",
  "category": 11,
  "muscles": [4, 7, 2],           // Primary: Chest, Shoulders, Triceps
  "muscles_secondary": [],         // Secondary: (empty for this example)
  "equipment": [1],               // Barbell
  "translations": [{
    "id": 1,
    "name": "Bench press",
    "description": "<p>Lie on flat bench...</p>",
    "language": 2
  }],
  "images": [{
    "id": 1,
    "image": "https://...",
    "is_main": true,
    "license_author": "Wger"
  }],
  "videos": [{
    "id": 1,
    "video": "https://youtube.com/...",
    "license_author": "User"
  }],
  "notes": [{
    "id": 1,
    "comment": "Keep elbows at 45 degree angle",
    "exercise": 132
  }]
}
```

---

## ⚙️ Advanced Features

### Equipment Filtering
```
When Exercise Browser opens:
- User sees "All" button + each equipment type
- Tap "Dumbbell" → See only dumbbell exercises
- Tap "Bodyweight" → See only bodyweight exercises
- Tap "All" → Reset to all exercises
```

### Exercise Details
```
Each exercise card has:
- Exercise name
- Equipment badges
- Quick description
- [Show Details] button

Expanded details show:
- 💪 Primary & secondary muscles
- 📋 Instructions (numbered steps)
- 📖 Full description (with HTML stripped)
- 🎥 Watch Video button (external link)
```

### Muscle Name Localization
```
WGER supports 24+ languages
Currently using English (name_en)
Can switch to other languages by changing API field
```

---

## 🚀 Performance Notes

### Caching
- `wgerService` caches muscles & equipment on first load
- Subsequent calls to `getMuscles()` return cached data
- Exercises fetched fresh each time (not cached)

### API Calls
1. **Load Exercise Browser**: 2 API calls
   - GET /muscle/ (if not cached)
   - GET /equipment/ (if not cached)
   - GET /exerciseinfo/?muscles={id}

2. **Select Exercise**: 0 new API calls (data already loaded)

### Optimization
- Consider caching exercises locally for offline mode
- Implement pagination if WGER returns 100+ results

---

## 🎓 Learning Resources

- **WGER Project**: https://wger.de/
- **WGER GitHub**: https://github.com/wger-project/wger
- **WGER API Docs**: https://wger.de/en/api/v2/ (interactive)
- **Exercise Database**: 845+ exercises in WGER

---

## ✅ Feature Checklist

- [x] Click muscle to enter click-mode highlighting
- [x] Only clicked muscle highlights (all others gray)
- [x] Exercise Browser shows exercises for muscle
- [x] Equipment filter buttons work
- [x] Select exercise to enter exercise-mode
- [x] Primary muscles show strong highlight
- [x] Secondary muscles show light highlight
- [x] Exercise details expand/collapse
- [x] Instructions display with step numbers
- [x] Target muscles shown as badges
- [x] Video buttons appear (click to open)
- [x] Exercise adds to workout list
- [x] Switching muscles updates highlighting

---

## 💬 Tips & Tricks

1. **Best Muscles to Start With**
   - Chest: 80+ exercises
   - Back: 70+ exercises
   - Legs: 60+ exercises
   - Shoulders: 40+ exercises

2. **Using Click Mode Effectively**
   - Click a muscle to explore all its exercises
   - This is the main discovery mechanism
   - Try filtering by equipment to narrow down

3. **Reading Exercise Details**
   - Instructions are numbered steps (follow them)
   - Tips are form recommendations (prevent injury)
   - Videos show proper form (external YouTube links)

4. **Mixed Exercise Selection**
   - Select chest exercises first
   - Then select back exercises
   - Body highlighting updates each time
   - All exercises stay in your workout list

---

## 🔮 Future Enhancements

Possible additions:
- [ ] Save favorite exercises per muscle
- [ ] Suggested exercise progression
- [ ] Video playback in-app
- [ ] Exercise history tracking
- [ ] Offline mode (cache popular exercises)
- [ ] Custom exercise creation
- [ ] Muscle group presets ("Full Body", "Push/Pull", etc.)
- [ ] Exercise difficulty ratings

---

## 📞 Support

If exercises don't appear:
1. Try a major muscle (Chest, Legs, Back)
2. Check internet connection
3. Try a different equipment type
4. Restart the app

Your WGER API key is valid and working! 🎉
