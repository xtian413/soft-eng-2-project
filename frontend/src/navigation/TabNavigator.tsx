import DashboardScreen from '@/screens/dashboard/DashboardScreen';

/**
 * The main app navigator.
 * DashboardScreen contains its own 5-tab internal navigation (Home / Food / Lift / Coach / Profile),
 * so we render it directly here rather than adding a React Navigation bottom tab bar on top,
 * which would cause a duplicate nav bar.
 *
 * NOTE: WorkoutListScreen, DietLogScreen, and ProgressScreen still exist in src/screens/ and
 * are wired to the Supabase backend API. They will be integrated into the Dashboard tabs
 * in Sprint 3 when backend connectivity is established.
 */
export default function TabNavigator() {
  return <DashboardScreen />;
}
