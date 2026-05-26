import React, { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Controller, useForm } from 'react-hook-form';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { z } from 'zod';
import type { AuthStackParamList } from '@/navigation/AuthNavigator';
import { useAuthStore } from '@/store/authStore';
import { Colors } from '@/theme/colors';
import { typography, fontWeight, radius, spacing } from '@/theme/typography';
import {
  User,
  Mail,
  Lock,
  Ruler,
  TrendingDown,
  Dumbbell,
  Activity,
  Check,
  ChevronLeft,
} from 'lucide-react-native';

const schema = z
  .object({
    fullName: z.string().min(1, 'Full name is required'),
    email: z.string().email('Enter a valid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Please confirm your password'),
    height: z.string().min(1, 'Height is required'),
    weight: z.string().min(1, 'Weight is required'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterForm = z.infer<typeof schema>;
type RegisterNavigation = StackNavigationProp<AuthStackParamList, 'Register'>;

/** Renders the premium Gemi registration screen, matching exactly with the Web styling. */
export default function RegisterScreen() {
  const navigation = useNavigation<RegisterNavigation>();
  const signUp = useAuthStore((state) => state.signUp);

  // Physical stats toggles matching web
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('cm');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [goal, setGoal] = useState<'lose_weight' | 'build_muscle' | 'maintain'>('lose_weight');
  const [termsAccepted, setTermsAccepted] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '', height: '', weight: '' },
  });

  const onSubmit = async (values: RegisterForm) => {
    if (!termsAccepted) {
      Alert.alert('Terms and Conditions', 'You must accept the Terms & Conditions to proceed.');
      return;
    }

    // Convert stats to metric equivalents to match Supabase database schema
    const parsedHeight = parseFloat(values.height);
    const parsedWeight = parseFloat(values.weight);
    const heightCm = heightUnit === 'cm' ? parsedHeight : parsedHeight * 30.48;
    const weightKg = weightUnit === 'kg' ? parsedWeight : parsedWeight * 0.45359237;

    const error = await signUp(values.email, values.password, {
      fullName: values.fullName,
      height: heightCm,
      weight: weightKg,
      gender,
      goal,
    });

    if (error) {
      Alert.alert('Sign up failed', error.message);
      return;
    }

    Alert.alert(
      '📧 Account Created',
      `Welcome to Gemi! Your physical profile (Goal: ${goal.replace('_', ' ')}) has been set up successfully.`,
      [{ text: 'Start Journey', onPress: () => navigation.navigate('Login') }]
    );
  };

  const Container = Platform.OS === 'web' ? View : KeyboardAvoidingView;

  return (
    <Container
      style={styles.outer}
      {...(Platform.OS !== 'web' ? { behavior: Platform.OS === 'ios' ? 'padding' : undefined } : {})}
    >
      {/* Decorative Blur Backgrounds */}
      <View style={[styles.glowContainer, { pointerEvents: 'none' }]} pointerEvents="none">
        <View style={styles.glow1} />
        <View style={styles.glow2} />
      </View>

      {/* Top Custom App Bar */}
      <View style={styles.appBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.7}
        >
          <ChevronLeft size={20} color="#0b1c30" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
      >
        {/* Header */}
        <View style={styles.headerSection}>
          <Text style={styles.title}>Let's Personalize Your Coach</Text>
          <Text style={styles.subtitle}>
            We use your stats to customize your AI plan. All data stays local.
          </Text>
        </View>

        <View style={styles.formContainer}>
          {/* Full Name */}
          <View style={styles.inputWrapper}>
            <User size={18} color={Colors.outline} style={styles.inputIcon} />
            <Controller
              control={control}
              name="fullName"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  onChangeText={onChange}
                  placeholder="Full Name"
                  placeholderTextColor={Colors.outline}
                  style={styles.input}
                  value={value}
                  editable={!isSubmitting}
                />
              )}
            />
          </View>
          {errors.fullName && <Text style={styles.errorText}>{errors.fullName.message}</Text>}

          {/* Email */}
          <View style={styles.inputWrapper}>
            <Mail size={18} color={Colors.outline} style={styles.inputIcon} />
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  autoCapitalize="none"
                  keyboardType="email-address"
                  onChangeText={onChange}
                  placeholder="Email Address"
                  placeholderTextColor={Colors.outline}
                  style={styles.input}
                  value={value}
                  editable={!isSubmitting}
                />
              )}
            />
          </View>
          {errors.email && <Text style={styles.errorText}>{errors.email.message}</Text>}

          {/* Password */}
          <View style={styles.inputWrapper}>
            <Lock size={18} color={Colors.outline} style={styles.inputIcon} />
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  secureTextEntry
                  onChangeText={onChange}
                  placeholder="Create Password"
                  placeholderTextColor={Colors.outline}
                  style={styles.input}
                  value={value}
                  editable={!isSubmitting}
                />
              )}
            />
          </View>
          {errors.password && <Text style={styles.errorText}>{errors.password.message}</Text>}

          {/* Confirm Password */}
          <View style={styles.inputWrapper}>
            <Lock size={18} color={Colors.outline} style={styles.inputIcon} />
            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  secureTextEntry
                  onChangeText={onChange}
                  placeholder="Confirm Password"
                  placeholderTextColor={Colors.outline}
                  style={styles.input}
                  value={value}
                  editable={!isSubmitting}
                />
              )}
            />
          </View>
          {errors.confirmPassword && (
            <Text style={styles.errorText}>{errors.confirmPassword.message}</Text>
          )}

          {/* Floating Glassmorphism Physical Stats & Goal Card */}
          <View style={styles.card}>
            {/* Header row with Title & Gender Toggle */}
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Your Physical Stats</Text>
              <View style={styles.genderToggle}>
                <TouchableOpacity
                  style={[styles.genderBtn, gender === 'male' && styles.genderBtnActive]}
                  onPress={() => setGender('male')}
                >
                  <Text style={[styles.genderBtnText, gender === 'male' && styles.genderBtnTextActive]}>
                    Male
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.genderBtn, gender === 'female' && styles.genderBtnActive]}
                  onPress={() => setGender('female')}
                >
                  <Text style={[styles.genderBtnText, gender === 'female' && styles.genderBtnTextActive]}>
                    Female
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Height input row */}
            <View style={styles.statInputRow}>
              <View style={styles.statInputHeader}>
                <Text style={styles.inputLabel}>Height</Text>
                <View style={styles.unitToggleRow}>
                  <TouchableOpacity onPress={() => setHeightUnit('cm')}>
                    <Text style={[styles.unitToggleBtn, heightUnit === 'cm' && styles.unitToggleBtnActive]}>
                      CM
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.unitDivider}>|</Text>
                  <TouchableOpacity onPress={() => setHeightUnit('ft')}>
                    <Text style={[styles.unitToggleBtn, heightUnit === 'ft' && styles.unitToggleBtnActive]}>
                      FT
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.statInputWrapper}>
                <Ruler size={18} color={Colors.outline} style={styles.statIcon} />
                <Controller
                  control={control}
                  name="height"
                  render={({ field: { onChange, value } }) => (
                    <TextInput
                      keyboardType="numeric"
                      onChangeText={onChange}
                      placeholder={heightUnit === 'cm' ? '180' : '5.9'}
                      placeholderTextColor={Colors.outline}
                      style={styles.statTextInput}
                      value={value}
                    />
                  )}
                />
              </View>
              {errors.height && <Text style={styles.errorText}>{errors.height.message}</Text>}
            </View>

            {/* Weight input row */}
            <View style={styles.statInputRow}>
              <View style={styles.statInputHeader}>
                <Text style={styles.inputLabel}>Weight</Text>
                <View style={styles.unitToggleRow}>
                  <TouchableOpacity onPress={() => setWeightUnit('kg')}>
                    <Text style={[styles.unitToggleBtn, weightUnit === 'kg' && styles.unitToggleBtnActive]}>
                      KG
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.unitDivider}>|</Text>
                  <TouchableOpacity onPress={() => setWeightUnit('lbs')}>
                    <Text style={[styles.unitToggleBtn, weightUnit === 'lbs' && styles.unitToggleBtnActive]}>
                      LBS
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.statInputWrapper}>
                <Activity size={18} color={Colors.outline} style={styles.statIcon} />
                <Controller
                  control={control}
                  name="weight"
                  render={({ field: { onChange, value } }) => (
                    <TextInput
                      keyboardType="numeric"
                      onChangeText={onChange}
                      placeholder={weightUnit === 'kg' ? '75.0' : '165.3'}
                      placeholderTextColor={Colors.outline}
                      style={styles.statTextInput}
                      value={value}
                    />
                  )}
                />
              </View>
              {errors.weight && <Text style={styles.errorText}>{errors.weight.message}</Text>}
            </View>

            {/* Goal Selector row */}
            <View style={styles.statInputRow}>
              <Text style={styles.inputLabel}>Fitness Goal</Text>
              <View style={styles.goalSelectorGrid}>
                <TouchableOpacity
                  style={[styles.goalBtn, goal === 'lose_weight' && styles.goalBtnActive]}
                  onPress={() => setGoal('lose_weight')}
                >
                  <TrendingDown size={24} color={goal === 'lose_weight' ? '#0ea5e9' : '#6e7881'} />
                  <Text style={[styles.goalBtnText, goal === 'lose_weight' && styles.goalBtnTextActive]}>Lose Weight</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.goalBtn, goal === 'build_muscle' && styles.goalBtnActive]}
                  onPress={() => setGoal('build_muscle')}
                >
                  <Dumbbell size={24} color={goal === 'build_muscle' ? '#0ea5e9' : '#6e7881'} />
                  <Text style={[styles.goalBtnText, goal === 'build_muscle' && styles.goalBtnTextActive]}>Build Muscle</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.goalBtn, goal === 'maintain' && styles.goalBtnActive]}
                  onPress={() => setGoal('maintain')}
                >
                  <Activity size={24} color={goal === 'maintain' ? '#0ea5e9' : '#6e7881'} />
                  <Text style={[styles.goalBtnText, goal === 'maintain' && styles.goalBtnTextActive]}>Maintain</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Terms checkbox */}
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setTermsAccepted(!termsAccepted)}
            activeOpacity={0.8}
          >
            <View style={[styles.checkbox, termsAccepted && styles.checkboxActive]}>
              {termsAccepted && <Check size={12} color="#ffffff" strokeWidth={3} />}
            </View>
            <Text style={styles.checkboxLabel}>
              I agree to the <Text style={styles.checkboxLink}>Terms & Conditions</Text> and acknowledge the Privacy Policy regarding my local data.
            </Text>
          </TouchableOpacity>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            activeOpacity={0.85}
          >
            <Text style={styles.submitBtnText}>
              {isSubmitting ? 'Creating Account...' : 'Create Account'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.footerLink}>Log In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Container>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: '#f8f9ff',
    ...Platform.select({
      web: {
        height: '100vh' as any,
        overflow: 'auto' as any,
      },
    }),
  },
  glowContainer: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  glow1: {
    position: 'absolute',
    bottom: -100,
    left: '25%',
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: 'rgba(14, 165, 233, 0.05)',
  },
  glow2: {
    position: 'absolute',
    bottom: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(195, 148, 0, 0.04)',
  },
  appBar: {
    height: 56,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(190, 200, 210, 0.1)',
    zIndex: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(110, 120, 129, 0.05)',
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingBottom: 140, // Expanded to ensure extra scrolling breathing room on small viewports
    paddingTop: spacing.lg,
  },
  headerSection: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 24,
    fontWeight: fontWeight.bold,
    color: '#0b1c30',
    marginBottom: spacing.xs,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: typography.sm,
    color: '#3e4850',
    lineHeight: 20,
  },
  formContainer: {
    gap: spacing.md,
    width: '100%',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.4)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    height: 48,
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.03)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
      },
    }),
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: typography.sm,
    color: '#0b1c30',
    fontWeight: fontWeight.medium,
    height: '100%',
    padding: 0,
  },
  errorText: {
    fontSize: typography.xs,
    color: Colors.error,
    paddingLeft: spacing.md,
    marginTop: -spacing.xs,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.3)',
    marginTop: spacing.sm,
    gap: spacing.lg,
    ...Platform.select({
      web: {
        boxShadow: '0px 10px 20px rgba(0, 0, 0, 0.04)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.04,
        shadowRadius: 20,
        elevation: 4,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: fontWeight.bold,
    color: '#6e7881',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  genderToggle: {
    flexDirection: 'row',
    backgroundColor: '#e5eeff',
    borderRadius: radius.full,
    padding: 3,
  },
  genderBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  genderBtnActive: {
    backgroundColor: '#ffffff',
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.05)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
      },
    }),
  },
  genderBtnText: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
    color: '#3e4850',
  },
  genderBtnTextActive: {
    color: '#006591',
  },
  statInputRow: {
    gap: spacing.xs,
  },
  statInputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputLabel: {
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
    color: '#0b1c30',
  },
  unitToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  unitToggleBtn: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
    color: '#6e7881',
  },
  unitToggleBtnActive: {
    color: '#0ea5e9',
  },
  unitDivider: {
    fontSize: 11,
    color: '#6e7881',
    opacity: 0.3,
  },
  statInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: 'rgba(190, 200, 210, 0.25)',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  statIcon: {
    marginRight: spacing.sm,
  },
  statTextInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: fontWeight.bold,
    color: '#0b1c30',
    height: '100%',
    padding: 0,
  },
  goalSelectorGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  goalBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.3)',
    borderRadius: 16,
    paddingVertical: spacing.md,
    gap: 6,
  },
  goalBtnActive: {
    backgroundColor: '#ffffff',
    borderColor: '#0ea5e9',
    ...Platform.select({
      web: {
        boxShadow: '0px 6px 12px rgba(14, 165, 233, 0.1)',
      },
      default: {
        shadowColor: '#0ea5e9',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 3,
      },
    }),
  },
  goalBtnText: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
    color: '#6e7881',
    textAlign: 'center',
  },
  goalBtnTextActive: {
    color: '#0ea5e9',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginTop: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(190, 200, 210, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  checkboxActive: {
    borderColor: '#0ea5e9',
    backgroundColor: '#0ea5e9',
  },
  checkboxTick: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: '#3e4850',
  },
  checkboxLink: {
    color: '#0ea5e9',
    fontWeight: fontWeight.bold,
  },
  submitBtn: {
    backgroundColor: Colors.primaryContainer,
    borderRadius: radius.full,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    ...Platform.select({
      web: {
        boxShadow: '0px 8px 16px rgba(14, 165, 233, 0.25)',
      },
      default: {
        shadowColor: Colors.primaryContainer,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 4,
      },
    }),
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: Colors.onPrimary,
    fontSize: typography.base,
    fontWeight: fontWeight.bold,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xl,
    marginBottom: spacing.xl, // Ensures spacing after footer on small phones
  },
  footerText: {
    fontSize: typography.base,
    color: '#3e4850',
  },
  footerLink: {
    fontSize: typography.base,
    color: '#0ea5e9',
    fontWeight: fontWeight.bold,
  },
});
