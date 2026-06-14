# Onboarding Module Documentation

## Overview

The onboarding module provides a first-launch tutorial experience that matches the existing design system of the AI Insight application. Users see the onboarding slides after their first login and can skip or navigate through them.

## Architecture

### Files Created

1. **`OnboardingScreen.tsx`** - Main onboarding component
   - Renders 6 slides covering all major app features
   - Horizontal swipeable FlatList with paging
   - Navigation controls (Skip, Back, Next, Get Started)
   - Pagination indicators
   - AsyncStorage integration for tracking first launch

2. **`onboardingHelper.ts`** - Utility functions
   - `hasUserSeenOnboarding()` - Check if user has seen onboarding
   - `markOnboardingAsSeen()` - Manually mark as seen
   - `resetOnboarding()` - Reset flag (for testing)

### Files Modified

1. **`AppNavigator.tsx`** - Navigation integration
   - Added state to track onboarding flag
   - Checks AsyncStorage on app startup
   - Shows onboarding screen if `hasSeenOnboarding` is false
   - Displays main app after onboarding is complete

## Design System Integration

The onboarding module uses the exact design system from the app:

### Colors
- **Primary**: `#006591` (blue) - Used for icons and primary button
- **Carbs Accent**: `#f59e0b` (orange) - Used for food tracking icon
- **Protein Accent**: `#60a5fa` (sky blue) - Used for workouts icon
- **Secondary Container**: `#fd761a` (orange) - Used for progress icon
- **Background**: `#f8f9ff` (light blue)
- **Text Colors**: `#0b1c30` (onBackground), `#3e4850` (onSurfaceVariant)

### Typography
- **Titles**: `xxl` (28px), bold weight
- **Descriptions**: `base` (15px), regular weight
- **Buttons**: `base` (15px), medium/semiBold weight

### Spacing
- Uses the app's spacing scale: xs, sm, md, base, lg, xl, xxl, xxxl
- Consistent padding and margins with existing screens

### Components
- **Icons**: From `lucide-react-native` (same as rest of app)
- **Buttons**: Matching the button styles from LoginScreen
- **Cards**: Subtle background containers using `surfaceContainer` color

## Slides

1. **Welcome** - Introduction to the app with Sparkles icon
2. **Dashboard** - Daily progress monitoring with Home icon
3. **Food Tracking** - Nutrition logging with Apple icon
4. **Workouts** - Exercise tracking with Dumbbell icon
5. **AI Insights** - Personalized recommendations with Sparkles icon
6. **Profile & Progress** - Achievement tracking with TrendingUp icon

## Navigation Flow

```
App Startup
    ↓
Check Session (Auth Store)
    ↓
User Not Logged In? → Show AuthNavigator (Login/Register)
    ↓
User Logged In?
    ↓
Check hasSeenOnboarding Flag (AsyncStorage)
    ↓
Flag Not Set? → Show OnboardingScreen
    ↓
Flag Set? → Show TabNavigator (Main App)
```

## User Interactions

### Navigation Controls

- **Skip Button** (Slides 1-5): Immediately mark as seen and enter main app
- **Back Button** (Slides 2-6): Navigate to previous slide
- **Next Button** (Slides 1-5): Navigate to next slide
- **Get Started Button** (Slide 6): Mark as seen and enter main app
- **Close Button** (Top Right): Skip onboarding

### Pagination

- Dots at bottom indicate current slide
- Active dot is larger and colored (primary blue)
- Inactive dots are small and gray

## First Launch Behavior

1. User signs up or logs in for the first time
2. `hasSeenOnboarding` AsyncStorage flag is checked
3. If flag doesn't exist or is `false`, OnboardingScreen is displayed
4. User can:
   - Skip through all slides
   - Navigate back and forth between slides
   - Complete the tutorial by pressing "Get Started"
5. Upon completion, flag is set to `'true'` in AsyncStorage
6. User is directed to the main TabNavigator

## AsyncStorage

**Key**: `hasSeenOnboarding`
**Value**: `'true'` or missing
**Device**: Local device only (per-device tracking)

## Code Quality

### TypeScript
- Fully typed components and interfaces
- Type-safe navigation props
- Proper error handling

### Reusability
- Uses existing theme system (no new colors/typography)
- Uses existing icons from `lucide-react-native`
- Follows project folder structure
- No duplicate UI elements

### Responsiveness
- FlatList scales to screen width automatically
- Text uses responsive font sizing
- Buttons scale appropriately on different screen sizes
- Padding and margins respect spacing scale

## Extending the Onboarding

### Adding New Slides

1. Add a new slide object to the `slides` array in `OnboardingScreen.tsx`:

```typescript
{
  id: '7',
  title: 'New Feature',
  description: 'Description of the new feature.',
  icon: <NewIcon size={80} color={Colors.primary} strokeWidth={1.5} />,
  backgroundColor: Colors.background,
}
```

2. The slide will automatically be added to the navigation flow

### Showing Tutorial Again

To allow users to view the onboarding again from settings:

```typescript
import { resetOnboarding } from '@/utils/onboardingHelper';

// In your settings component
const handleShowTutorialAgain = async () => {
  await resetOnboarding();
  // Navigate to onboarding screen
};
```

## Testing

### Manual Testing
1. Clear AsyncStorage: `await AsyncStorage.removeItem('hasSeenOnboarding')`
2. Log in or create new account
3. Verify onboarding appears
4. Test navigation controls
5. Verify main app loads after completion

### Automated Testing
Use the helper utilities:
```typescript
import { resetOnboarding, hasUserSeenOnboarding } from '@/utils/onboardingHelper';

// Reset for testing
await resetOnboarding();

// Check status
const seen = await hasUserSeenOnboarding();
```

## Troubleshooting

### Onboarding Shows Every Login
- Check that `hasSeenOnboarding` AsyncStorage key is being set properly
- Use `AsyncStorage.getItem('hasSeenOnboarding')` to debug
- Ensure `markOnboardingAsSeen()` is being called

### Slides Not Scrolling
- Ensure FlatList is not nested inside a ScrollView
- Check `scrollEnabled` prop is `true`
- Verify `pagingEnabled` is `true`

### AsyncStorage Errors
- Ensure AsyncStorage is initialized before app startup
- Handle errors in catch blocks gracefully
- Use try-catch when reading AsyncStorage

## Browser/Web Support

The onboarding works on React Native Web through the standard metro/expo setup. All styling and components are cross-platform compatible.
