import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { useAuthStore } from '@/store/authStore';
import { Colors } from '@/theme/colors';
import { typography, fontWeight, radius, spacing } from '@/theme/typography';
import { GOAL_TARGETS, type GoalKey, type FoodLogEntry } from '@/screens/dashboard/types';
import { HomeTab } from '@/screens/dashboard/Home/HomeTab';
import { FoodTab } from '@/screens/dashboard/Food/FoodTab';
import { LiftTab } from '@/screens/dashboard/Lift/LiftTab';
import { AIChatTab } from '@/screens/dashboard/AIChat/AIChatTab';
import { ProfileTab } from '@/screens/dashboard/Profile/ProfileTab';
import { LayoutDashboard, Utensils, Dumbbell, Sparkles, User, Bell } from 'lucide-react-native';

type TabType = 'dashboard' | 'food' | 'chat' | 'lift' | 'profile';

const TABS: { key: TabType; label: string }[] = [
  { key: 'dashboard', label: 'Today' },
  { key: 'food',      label: 'Food' },
  { key: 'chat',      label: 'Coach' }, // Center Floating AI coach
  { key: 'lift',      label: 'Lift' },
  { key: 'profile',   label: 'Profile' },
];

export default function DashboardScreen() {
  const { user, signOut } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastOpacity = useState(new Animated.Value(0))[0];

  // AI coach button pulsing animation
  const pulseAnim = useState(new Animated.Value(1))[0];

  // Shared state of USDA logged food entries (persisted in memory in DashboardScreen)
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
      servingUnit: 'cup',
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
      servingUnit: 'portion',
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
      servingUnit: 'pack',
    },
  ]);

  // Derived goals
  const goal: GoalKey = (user?.user_metadata?.goal as GoalKey) || 'build_muscle';
  const targets = GOAL_TARGETS[goal];

  const fullName = user?.user_metadata?.full_name || 'Christian Gamos';
  const email = user?.email || 'christian.gamos@gemi.ai';

  // Derived current metrics
  const proteinTotal = Number(foodLogs.reduce((acc, f) => acc + f.protein, 0).toFixed(1));
  const carbsTotal = Number(foodLogs.reduce((acc, f) => acc + f.carbs, 0).toFixed(1));
  const fatsTotal = Number(foodLogs.reduce((acc, f) => acc + f.fat, 0).toFixed(1));
  const caloriesEaten = Math.round(foodLogs.reduce((acc, x) => acc + x.calories, 0));

  // Pulse animation for AI coach button
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.12,
          duration: 1500,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 1500,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    ).start();
  }, [pulseAnim]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    Animated.sequence([
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.delay(2000),
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start(() => setToastMessage(null));
  };

  const handleQuickLog = () => {
    const randomFoods = [
      { name: 'Peanut Butter Toast', protein: 8, carbs: 24, fats: 12, calories: 240 },
      { name: 'Greek Yogurt Bowl', protein: 18, carbs: 12, fats: 0, calories: 120 },
      { name: 'Mixed Almonds Pack', protein: 6, carbs: 5, fats: 14, calories: 160 },
      { name: 'Oven Baked Salmon', protein: 28, carbs: 0, fats: 14, calories: 240 },
    ];
    const food = randomFoods[Math.floor(Math.random() * randomFoods.length)];
    
    const newLog: FoodLogEntry = {
      id: 'log_' + Date.now(),
      name: food.name,
      mealId: 'snack',
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
      servingUnit: 'portion',
    };

    setFoodLogs((prev) => [...prev, newLog]);
    triggerToast(`Quick Logged: ${food.name} (+${food.calories} kcal, P: ${food.protein}g)`);
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <HomeTab
            fullName={fullName}
            goal={goal}
            targets={targets}
            proteinTotal={proteinTotal}
            carbsTotal={carbsTotal}
            fatsTotal={fatsTotal}
            caloriesEaten={caloriesEaten}
            onQuickLog={handleQuickLog}
            foodLogs={foodLogs}
            onNavigateToTab={setActiveTab}
          />
        );
      case 'food':
        return (
          <FoodTab
            foodLogs={foodLogs}
            setFoodLogs={setFoodLogs}
            targets={targets}
            triggerToast={triggerToast}
          />
        );
      case 'lift':
        return <LiftTab triggerToast={triggerToast} />;
      case 'chat':
        return <AIChatTab foodLogs={foodLogs} targets={targets} />;
      case 'profile':
        return (
          <ProfileTab
            fullName={fullName}
            email={email}
            goal={goal}
            targets={targets}
            onSignOut={signOut}
          />
        );
    }
  };

  const getActiveTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Today';
      case 'chat': return 'Coach';
      case 'food': return 'Food';
      case 'lift': return 'Lift';
      case 'profile': return 'Profile';
    }
  };

  const getTabIcon = (tabKey: TabType, isActive: boolean) => {
    const color = isActive ? Colors.primary : Colors.outline;
    const size = 20;
    switch (tabKey) {
      case 'dashboard':
        return <LayoutDashboard size={size} color={color} />;
      case 'food':
        return <Utensils size={size} color={color} />;
      case 'lift':
        return <Dumbbell size={size} color={color} />;
      case 'profile':
        return <User size={size} color={color} />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header Appbar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatarWrap}>
            <Image
              style={styles.avatar}
              source={{
                uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD3vRdcAG9t6iFC5DAgdJAW_2xrU33Y5jWF3VTnvuT6g1_txVlo9IKcYRWZLDe7MgGQ4oDQoa78iHbt7RNXwIIUtmdbkDEcD-JTsxkq64qt13q97fhxO8p8ZzBn_Ri15-QgWhsW3f0QAjI-nrChR0yjI4vx5cRkmb0rrzVL6_yHAG9p1-9IaKUzooqUs3icFjuaw9qGLIw6vyp2WQ-MyxyQFwBxT7Cm9LLm1oLZR-pvMeHoR0IkOXnyWvrVn2O1W-3JerDeNtItYgrg',
              }}
            />
          </View>
          <Text style={styles.headerTitle}>{getActiveTitle()}</Text>
        </View>

        <TouchableOpacity
          style={styles.notificationBtn}
          onPress={() => triggerToast('Quiet Mode: Notifications are synchronized.')}
          activeOpacity={0.7}
        >
          <Bell size={18} color={Colors.onSurface} />
        </TouchableOpacity>
      </View>

      {/* Main Tab Screen Area */}
      <View style={styles.content}>{renderTab()}</View>

      {/* Floating Sparkle/AI Message Toast */}
      {toastMessage && (
        <Animated.View style={[styles.toastContainer, { opacity: toastOpacity }]}>
          <Sparkles size={14} color={Colors.primaryContainer} style={styles.toastIcon} />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}

      {/* Glassmorphic Floating Pill Tab Bar */}
      <View style={styles.tabBarContainer}>
        <View style={styles.tabBar}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            if (tab.key === 'chat') {
              // Special elevated floating AI coach tab button
              return (
                <View key={tab.key} style={styles.coachButtonWrapper}>
                  <Animated.View
                    style={{
                      transform: [{ scale: pulseAnim }],
                    }}
                  >
                    <TouchableOpacity
                      style={styles.coachButton}
                      onPress={() => setActiveTab('chat')}
                      activeOpacity={0.8}
                    >
                      <Sparkles size={20} color={Colors.onPrimary} fill={Colors.onPrimary} />
                    </TouchableOpacity>
                  </Animated.View>
                  <Text style={[styles.tabLabel, isActive && styles.tabLabelActive, { marginTop: 4 }]}>
                    Coach
                  </Text>
                </View>
              );
            }

            return (
              <TouchableOpacity
                key={tab.key}
                style={styles.tabItem}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.7}
              >
                <View style={[styles.tabIconContainer, isActive && styles.tabIconActive]}>
                  {getTabIcon(tab.key, isActive)}
                </View>
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
                {isActive && <View style={styles.activeIndicatorDot} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

const screenWidth = Dimensions.get('window').width;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    backgroundColor: Colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(190, 200, 210, 0.15)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatarWrap: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(14, 165, 233, 0.2)',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  headerTitle: {
    fontSize: typography.lg,
    fontWeight: fontWeight.bold,
    color: Colors.onSurface,
    letterSpacing: -0.5,
  },
  notificationBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: 'rgba(110, 120, 129, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  toastContainer: {
    position: 'absolute',
    bottom: 95,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(33, 49, 69, 0.95)',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    zIndex: 999,
    maxWidth: '90%',
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.15)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 10,
      },
    }),
  },
  toastIcon: {
    marginRight: spacing.xs,
  },
  toastText: {
    color: Colors.inverseOnSurface,
    fontSize: typography.sm,
    fontWeight: fontWeight.semiBold,
  },
  tabBarContainer: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.base,
    backgroundColor: 'transparent',
  },
  tabBar: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 500,
    height: 68,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: radius.xl,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    ...Platform.select({
      web: {
        boxShadow: '0px 8px 20px rgba(0, 0, 0, 0.08)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 12,
      },
    }),
  },
  tabItem: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tabIconContainer: {
    opacity: 0.45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabIconActive: {
    opacity: 1,
    transform: [{ scale: 1.05 }],
  },
  tabLabel: {
    fontSize: typography.xs - 1,
    color: Colors.outline,
    marginTop: 2,
    fontWeight: fontWeight.medium,
  },
  tabLabelActive: {
    color: Colors.primary,
    fontWeight: fontWeight.bold,
  },
  activeIndicatorDot: {
    width: 4,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: Colors.primary,
    position: 'absolute',
    bottom: 4,
  },
  coachButtonWrapper: {
    width: 68,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: -20,
  },
  coachButton: {
    width: 46,
    height: 46,
    borderRadius: radius.full,
    backgroundColor: Colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 10px rgba(14, 165, 233, 0.4)',
      },
      default: {
        shadowColor: Colors.primaryContainer,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 8,
      },
    }),
  },
});
