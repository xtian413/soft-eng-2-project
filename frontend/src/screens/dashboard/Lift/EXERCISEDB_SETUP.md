# ExerciseDB Integration Guide

## 🎯 Feature Overview

The Lift screen now includes a powerful **Interactive Body Part Explorer** that integrates with the ExerciseDB API. Users can:

1. **Click on body parts** in the visual muscle map
2. **See all available exercises** for that muscle group
3. **Filter by equipment type** (barbell, dumbbell, machine, cable, bodyweight, kettlebell, etc.)
4. **View detailed instructions** for each exercise
5. **See exercise tips and variations**
6. **Add exercises directly to their workout**

---

## 🔧 Setup Instructions

### Step 1: Get ExerciseDB API Key

1. Visit [RapidAPI](https://rapidapi.com/api-sports/api/exercisedb-api)
2. Sign up for a free account (if you don't have one)
3. Subscribe to the **ExerciseDB API** (free tier available)
4. Copy your **API Key** from the dashboard

### Step 2: Add API Key to `.env`

Update `frontend/.env`:

```
EXPO_PUBLIC_EXERCISEDB_API_KEY=your-api-key-here
```

Replace `your-api-key-here` with your actual RapidAPI key.

### Step 3: Restart the App

Reload the Expo development server:

```bash
cd frontend
npm start
# Press 'r' to reload
```

---

## 📱 How to Use

### Basic Flow

1. **Open Lift Screen** → Go to the "Lift" tab
2. **Click "Show Muscles"** → Display the interactive body map
3. **Tap a Muscle Group** → Opens the Exercise Browser modal
4. **Select Equipment Filters** → Choose your preferred equipment type (optional)
5. **Tap an Exercise** → Expands to show full instructions and tips
6. **Click the Lightning Bolt ⚡** → Adds exercise to your current workout

### Example Workflow

```
User taps "Chest" on the body map
  ↓
Exercise Browser opens showing all chest exercises
  ↓
User selects "Dumbbell" filter to see only dumbbell exercises
  ↓
User sees "Dumbbell Bench Press" with full instructions
  ↓
User clicks ⚡ button to add it to their workout
  ↓
Exercise added and ready to log sets
```

---

## 🗂️ File Structure

```
frontend/src/
├── api/
│   └── exerciseDbService.ts          # ExerciseDB API client
├── screens/dashboard/Lift/
│   ├── LiftTab.tsx                   # Main component (updated)
│   ├── BodyMuscleMap.tsx             # Interactive body visualization (updated)
│   ├── ExerciseBrowser.tsx           # Exercise selection modal (NEW)
│   ├── exerciseMuscles.ts            # Exercise-to-muscle mapping
│   └── index.ts
```

---

## 🔌 API Endpoints Used

The service uses these ExerciseDB endpoints:

- `GET /exercises/bodyPart/{bodyPart}` - Get exercises by body part
- `GET /exercises/equipmentList` - Get available equipment types
- `GET /exercises/equipment/{equipment}` - Filter by equipment
- `GET /exercises/exercise/{exerciseId}` - Get single exercise details

---

## 🎨 UI Components

### Interactive Body Map
- Shows muscles targeted by current exercise
- **When interactive**: Tap any muscle to browse exercises
- **When static**: Just displays muscle visualization

### Exercise Browser Modal
- **Header**: Shows selected body part name
- **Equipment Filter Row**: Horizontal scrollable filter buttons
- **Exercise Cards**: Displays exercise name, equipment badges, quick overview
- **Expanded Details**: Full instructions, tips, target muscles, video link

### Exercise Card Layout

```
┌─────────────────────────────┐
│ Exercise Name          ⚡    │  <- Tap to add
│ [Equip] [Tags]             │
├─────────────────────────────┤
│ Quick description...        │
├─────────────────────────────┤
│ 💪 Target Muscles:         │
│    [Badge1] [Badge2]       │
├─────────────────────────────┤
│ 📋 Instructions:           │
│    1. Step one...          │
│    2. Step two...          │
├─────────────────────────────┤
│ 💡 Pro Tips:               │
│    • Tip 1                 │
│    • Tip 2                 │
├─────────────────────────────┤
│ [Watch Video]              │
└─────────────────────────────┘
```

---

## 🔄 Equipment Mapping

Filters available:
- **All** - All exercises
- **Barbell** - Barbell exercises
- **Dumbbell** - Dumbbell exercises
- **Machine** - Machine exercises
- **Cable** - Cable machine exercises
- **Bodyweight** - Calisthenics/bodyweight
- **Kettlebell** - Kettlebell exercises
- **Medicine Ball** - Medicine ball exercises

---

## 🚨 Rate Limiting Notes

**Free RapidAPI Tier:**
- ⚠️ 100 requests/day
- ⚠️ 5 requests/minute

**Recommendations:**
- Consider caching results locally
- For production, upgrade to a paid tier
- Or self-host the ExerciseDB API

---

## 🐛 Troubleshooting

### "No exercises found"
- Check if the API key is correctly set in `.env`
- Ensure you've subscribed to ExerciseDB on RapidAPI
- Check if you've exceeded rate limits
- Try a different body part

### "Muscle visualization unavailable"
- The Body component fails gracefully
- Check browser console for errors
- Ensure `react-native-body-highlighter` is installed

### "Network Error" when loading exercises
- Verify internet connection
- Check API key validity
- Check rate limit status on RapidAPI dashboard
- Restart the app

---

## 🔮 Future Enhancements

Possible additions:
1. **Video playback** in-app instead of external links
2. **Save favorite exercises** to user profile
3. **Exercise history** - track what exercises were done
4. **Custom exercise library** - users create their own exercises
5. **Offline mode** - cache popular exercises locally
6. **Exercise progression** - suggest harder variations
7. **Workout templates** - pre-built exercise combinations

---

## 📚 Resources

- [ExerciseDB Documentation](https://docs.exercisedb.dev/)
- [RapidAPI Console](https://rapidapi.com/console)
- [react-native-body-highlighter](https://github.com/HichamELBSI/react-native-body-highlighter)

---

## ✅ Verification Checklist

- [ ] API key added to `frontend/.env`
- [ ] App reloaded/restarted
- [ ] Can see "Show Muscles" toggle in Lift tab
- [ ] Can tap body parts on the muscle map
- [ ] Exercise Browser modal opens
- [ ] Can filter by equipment type
- [ ] Can expand exercise cards to see instructions
- [ ] Can add exercises with ⚡ button

---

## 💡 Tips

1. **Start with major muscle groups** (chest, legs, back) - they have the most exercises
2. **Use equipment filters** to narrow down to what's available
3. **Expand exercise cards** to read full instructions before adding
4. **Pro tips are specific to form** - read them to prevent injury
5. **Watch videos** for complex movements (when implemented)

Enjoy exploring thousands of exercises! 💪
