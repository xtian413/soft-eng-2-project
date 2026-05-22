import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import DashboardScreen from '@/screens/dashboard/DashboardScreen';
import DietLogScreen from '@/screens/diet/DietLogScreen';
import ProgressScreen from '@/screens/progress/ProgressScreen';
import WorkoutListScreen from '@/screens/workout/WorkoutListScreen';

export type TabParamList = {
  Dashboard: undefined;
  Workout: undefined;
  Diet: undefined;
  Progress: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

/** Renders the main tab navigator. */
export default function TabNavigator() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Workout" component={WorkoutListScreen} />
      <Tab.Screen name="Diet" component={DietLogScreen} />
      <Tab.Screen name="Progress" component={ProgressScreen} />
    </Tab.Navigator>
  );
}
