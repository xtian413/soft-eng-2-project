import React, { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Controller, useForm } from 'react-hook-form';
import {
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
import { typography, fontWeight, radius, spacing, layout } from '@/theme/typography';
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Ruler,
  TrendingDown,
  Dumbbell,
  Activity,
  Check,
  ChevronLeft,
  Calendar,
} from 'lucide-react-native';
import { type ActivityLevel, type GoalKey, GOAL_LABELS } from '@/screens/dashboard/types';
import { AuthErrorBanner } from '@/components/common/AuthErrorBanner';
import type { BannerVariant } from '@/components/common/AuthErrorBanner';
import { DatePickerSelect } from '@/components/common/DatePickerSelect';

/** Friendlier goal labels for the registration screen — keeps the shared GOAL_LABELS clean. */
const REGISTER_GOAL_LABELS: Record<GoalKey, string> = {
  moderate_cut: 'Fat Loss',
  aggressive_cut: 'Rapid Fat Loss',
  maintain: 'Stay Fit',
  lean_bulk: 'Build Muscle',
};

const REGISTER_GOAL_DESCS: Record<GoalKey, string> = {
  moderate_cut: 'Lose ~0.5 kg/week — moderate deficit',
  aggressive_cut: 'Lose ~0.75 kg/week — stricter deficit',
  maintain: 'Keep your current weight',
  lean_bulk: 'Gain ~0.25 kg/week — light surplus',
};

const isNumericPositive = (v: string) => {
  const n = parseFloat(v);
  return !isNaN(n) && n > 0;
};

const schema = z
  .object({
    fullName: z.string().min(1, 'Full name is required'),
    email: z.string().email('Enter a valid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Please confirm your password'),
    birthdate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format').refine(date => !isNaN(Date.parse(date)), 'Invalid date'),
    height: z.string().refine(isNumericPositive, 'Enter a valid height'),
    weight: z.string().refine(isNumericPositive, 'Enter a valid weight'),
    targetWeight: z.string().optional().refine(
      (v) => !v || v.trim() === '' || isNumericPositive(v),
      'Enter a valid target weight'
    ),
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
  const [goal, setGoal] = useState<GoalKey>('moderate_cut');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('sedentary');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Inline error/success banner state
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const [bannerType, setBannerType] = useState<BannerVariant>('error');
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '', birthdate: '', height: '', weight: '', targetWeight: '' },
  });

  const onSubmit = async (values: RegisterForm) => {
    // Clear any previous banner
    setBannerMessage(null);

    if (!termsAccepted) {
      setBannerType('warning');
      setBannerMessage('Please accept the Terms & Conditions to proceed.');
      return;
    }

    // Convert stats to metric equivalents to match Supabase database schema
    const parsedHeight = parseFloat(values.height);
    const parsedWeight = parseFloat(values.weight);
    const parsedTargetWeight = values.targetWeight ? parseFloat(values.targetWeight) : parsedWeight;
    const heightCm = heightUnit === 'cm' ? parsedHeight : parsedHeight * 30.48;
    const weightKg = weightUnit === 'kg' ? parsedWeight : parsedWeight * 0.45359237;
    const targetWeightKg = weightUnit === 'kg' ? parsedTargetWeight : parsedTargetWeight * 0.45359237;

    const birthDateObj = new Date(values.birthdate);
    const today = new Date();
    let age = today.getFullYear() - birthDateObj.getFullYear();
    const m = today.getMonth() - birthDateObj.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDateObj.getDate())) {
      age--;
    }

    const error = await signUp(values.email, values.password, {
      fullName: values.fullName,
      height: heightCm,
      weight: weightKg,
      gender,
      goal,
      age,
      activityLevel,
      targetWeightKg,
    });

    if (error) {
      // Map common Supabase error messages to user-friendly text
      const msg = error.message.toLowerCase();
      if (msg.includes('already registered') || msg.includes('duplicate') || msg.includes('already exists')) {
        setBannerType('info');
        setBannerMessage('This email is already registered. Try logging in instead.');
      } else if (msg.includes('network') || msg.includes('fetch') || msg.includes('connect')) {
        setBannerType('warning');
        setBannerMessage('No internet connection. Please check your network and try again.');
      } else if (msg.includes('password')) {
        setBannerType('error');
        setBannerMessage(error.message);
      } else {
        setBannerType('error');
        setBannerMessage(error.message || 'Something went wrong. Please try again.');
      }
      return;
    }

    // Success — show inline success banner, then auto-navigate
    setIsSuccess(true);
    setBannerType('success');
    setBannerMessage(`Account created! Welcome to Gemi (Goal: ${GOAL_LABELS[goal]}).`);

    setTimeout(() => {
      setIsSuccess(false);
      setBannerMessage(null);
      navigation.navigate('Login');
    }, 2000);
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
          accessibilityRole="button"
          accessibilityLabel="Back to login"
          hitSlop={8}
        >
          <ChevronLeft size={20} color="#0b1c30" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{
          flex: 1,
          ...Platform.select({
            web: {
              maxHeight: 'calc(100vh - 56px)' as any,
            },
          }),
        }}
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
          {/* Inline error/success banner (replaces Alert.alert) */}
          <AuthErrorBanner
            message={bannerMessage}
            type={bannerType}
            onDismiss={() => setBannerMessage(null)}
            action={bannerType === 'info' && bannerMessage?.includes('already registered')
              ? { label: 'Go to Login', onPress: () => navigation.navigate('Login') }
              : undefined}
          />
          {/* Full Name */}
          <View style={styles.fieldWrapper}>
            <Text style={styles.fieldLabel}>Full Name</Text>
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
                  accessibilityLabel="Full name"
                  textContentType="name"
                />
              )}
            />
          </View>
          {errors.fullName && <Text style={styles.errorText}>{errors.fullName.message}</Text>}
          </View>

          {/* Email */}
          <View style={styles.fieldWrapper}>
            <Text style={styles.fieldLabel}>Email Address</Text>
            <View style={styles.inputWrapper}>
              <Mail size={18} color={Colors.outline} style={styles.inputIcon} />
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  onChangeText={onChange}
                  placeholder="Email Address"
                  placeholderTextColor={Colors.outline}
                  style={styles.input}
                  value={value}
                  editable={!isSubmitting}
                  accessibilityLabel="Email address"
                  textContentType="emailAddress"
                />
              )}
            />
          </View>
          {errors.email && <Text style={styles.errorText}>{errors.email.message}</Text>}
          </View>

          {/* Password */}
          <View style={styles.fieldWrapper}>
            <Text style={styles.fieldLabel}>Password</Text>
            <View style={styles.inputWrapper}>
              <Lock size={18} color={Colors.outline} style={styles.inputIcon} />
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  secureTextEntry={!showPassword}
                  autoComplete="new-password"
                  onChangeText={onChange}
                  placeholder="Create Password"
                  placeholderTextColor={Colors.outline}
                  style={styles.input}
                  value={value}
                  editable={!isSubmitting}
                  accessibilityLabel="Create password"
                  textContentType="newPassword"
                />
              )}
            />
            <TouchableOpacity
              style={styles.passwordToggle}
              onPress={() => setShowPassword(!showPassword)}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              hitSlop={8}
            >
              {showPassword ? (
                <EyeOff size={18} color={Colors.outline} />
              ) : (
                <Eye size={18} color={Colors.outline} />
              )}
            </TouchableOpacity>
          </View>
          {errors.password && <Text style={styles.errorText}>{errors.password.message}</Text>}
          </View>

          {/* Confirm Password */}
          <View style={styles.fieldWrapper}>
            <Text style={styles.fieldLabel}>Confirm Password</Text>
            <View style={styles.inputWrapper}>
              <Lock size={18} color={Colors.outline} style={styles.inputIcon} />
            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  secureTextEntry={!showConfirmPassword}
                  autoComplete="new-password"
                  onChangeText={onChange}
                  placeholder="Confirm Password"
                  placeholderTextColor={Colors.outline}
                  style={styles.input}
                  value={value}
                  editable={!isSubmitting}
                  accessibilityLabel="Confirm password"
                  textContentType="newPassword"
                />
              )}
            />
            <TouchableOpacity
              style={styles.passwordToggle}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              accessibilityRole="button"
              accessibilityLabel={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              hitSlop={8}
            >
              {showConfirmPassword ? (
                <EyeOff size={18} color={Colors.outline} />
              ) : (
                <Eye size={18} color={Colors.outline} />
              )}
            </TouchableOpacity>
          </View>
          {errors.confirmPassword && (
            <Text style={styles.errorText}>{errors.confirmPassword.message}</Text>
          )}
          </View>
          <View style={styles.birthdateRow}>
            <Calendar size={18} color={Colors.outline} style={styles.birthdateIcon} />
            <Controller
              control={control}
              name="birthdate"
              render={({ field: { onChange, value } }) => (
                <DatePickerSelect
                  value={value}
                  onChange={onChange}
                  disabled={isSubmitting}
                  label="Date of Birth"
                />
              )}
            />
          </View>
          {errors.birthdate && <Text style={styles.errorText}>{errors.birthdate.message}</Text>}

          {/* Floating Glassmorphism Physical Stats & Goal Card */}
          <View style={styles.card}>
            {/* Header row with Title & Gender Toggle */}
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Your Physical Stats</Text>
              <View style={styles.genderToggle}>
                <TouchableOpacity
                  style={[styles.genderBtn, gender === 'male' && styles.genderBtnActive]}
                  onPress={() => setGender('male')}
                  accessibilityRole="button"
                  accessibilityLabel="Select male"
                  accessibilityState={{ selected: gender === 'male' }}
                >
                  <Text style={[styles.genderBtnText, gender === 'male' && styles.genderBtnTextActive]}>
                    Male
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.genderBtn, gender === 'female' && styles.genderBtnActive]}
                  onPress={() => setGender('female')}
                  accessibilityRole="button"
                  accessibilityLabel="Select female"
                  accessibilityState={{ selected: gender === 'female' }}
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
                  <TouchableOpacity
                    onPress={() => setHeightUnit('cm')}
                    accessibilityRole="button"
                    accessibilityLabel="Use centimeters"
                    accessibilityState={{ selected: heightUnit === 'cm' }}
                  >
                    <Text style={[styles.unitToggleBtn, heightUnit === 'cm' && styles.unitToggleBtnActive]}>
                      CM
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.unitDivider}>|</Text>
                  <TouchableOpacity
                    onPress={() => setHeightUnit('ft')}
                    accessibilityRole="button"
                    accessibilityLabel="Use feet"
                    accessibilityState={{ selected: heightUnit === 'ft' }}
                  >
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
                      accessibilityLabel={`Height in ${heightUnit === 'cm' ? 'centimeters' : 'feet'}`}
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
                  <TouchableOpacity
                    onPress={() => setWeightUnit('kg')}
                    accessibilityRole="button"
                    accessibilityLabel="Use kilograms"
                    accessibilityState={{ selected: weightUnit === 'kg' }}
                  >
                    <Text style={[styles.unitToggleBtn, weightUnit === 'kg' && styles.unitToggleBtnActive]}>
                      KG
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.unitDivider}>|</Text>
                  <TouchableOpacity
                    onPress={() => setWeightUnit('lbs')}
                    accessibilityRole="button"
                    accessibilityLabel="Use pounds"
                    accessibilityState={{ selected: weightUnit === 'lbs' }}
                  >
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
                      accessibilityLabel={`Weight in ${weightUnit === 'kg' ? 'kilograms' : 'pounds'}`}
                    />
                  )}
                />
              </View>
              {errors.weight && <Text style={styles.errorText}>{errors.weight.message}</Text>}
            </View>

            {/* Target Weight input row */}
            <View style={styles.statInputRow}>
              <View style={styles.statInputHeader}>
                <Text style={styles.inputLabel}>Target Weight</Text>
                <Text style={styles.targetWeightHint}>(optional — defaults to current weight)</Text>
              </View>
              <View style={styles.statInputWrapper}>
                <Activity size={18} color={Colors.outline} style={styles.statIcon} />
                <Controller
                  control={control}
                  name="targetWeight"
                  render={({ field: { onChange, value } }) => (
                    <TextInput
                      keyboardType="numeric"
                      onChangeText={onChange}
                      placeholder={weightUnit === 'kg' ? '75.0' : '165.3'}
                      placeholderTextColor={Colors.outline}
                      style={styles.statTextInput}
                      value={value}
                      accessibilityLabel={`Target weight in ${weightUnit === 'kg' ? 'kilograms' : 'pounds'}`}
                    />
                  )}
                />
              </View>
              {errors.targetWeight && <Text style={styles.errorText}>{errors.targetWeight.message}</Text>}
            </View>

            {/* Goal Selector row */}
            <View style={styles.statInputRow}>
              <Text style={styles.inputLabel}>Fitness Goal</Text>
              <View style={styles.goalSelectorGrid}>
                {([
                  { key: 'moderate_cut' as GoalKey, icon: 'cut', label: REGISTER_GOAL_LABELS.moderate_cut, desc: REGISTER_GOAL_DESCS.moderate_cut },
                  { key: 'aggressive_cut' as GoalKey, icon: 'cut', label: REGISTER_GOAL_LABELS.aggressive_cut, desc: REGISTER_GOAL_DESCS.aggressive_cut },
                  { key: 'maintain' as GoalKey, icon: 'maintain', label: REGISTER_GOAL_LABELS.maintain, desc: REGISTER_GOAL_DESCS.maintain },
                  { key: 'lean_bulk' as GoalKey, icon: 'bulk', label: REGISTER_GOAL_LABELS.lean_bulk, desc: REGISTER_GOAL_DESCS.lean_bulk },
                ]).map(({ key, icon, label, desc }) => (
                  <TouchableOpacity
                    key={key}
                    style={[styles.goalBtn, goal === key && styles.goalBtnActive]}
                    onPress={() => setGoal(key)}
                    accessibilityRole="button"
                    accessibilityLabel={`Select ${label} goal`}
                    accessibilityState={{ selected: goal === key }}
                  >
                    {icon === 'cut' ? (
                      <TrendingDown size={24} color={goal === key ? '#0ea5e9' : '#6e7881'} />
                    ) : icon === 'bulk' ? (
                      <Dumbbell size={24} color={goal === key ? '#0ea5e9' : '#6e7881'} />
                    ) : (
                      <Activity size={24} color={goal === key ? '#0ea5e9' : '#6e7881'} />
                    )}
                    <Text style={[styles.goalBtnText, goal === key && styles.goalBtnTextActive]}>{label}</Text>
                    <Text style={styles.goalBtnDesc}>{desc}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Activity Level Selector row */}
            <View style={styles.statInputRow}>
              <Text style={styles.inputLabel}>Activity Level</Text>
              <View style={styles.activityLevelGrid}>
                {[
                  { id: 'sedentary', label: 'Sedentary', desc: 'Little / no exercise' },
                  { id: 'lightly_active', label: 'Lightly Active', desc: '1–3 days / week' },
                  { id: 'moderately_active', label: 'Moderately Active', desc: '3–5 days / week' },
                  { id: 'very_active', label: 'Very Active', desc: '6–7 days / week' },
                  { id: 'extremely_active', label: 'Extremely Active', desc: 'Intense daily training' },
                ].map((level) => (
                  <TouchableOpacity
                    key={level.id}
                    style={[styles.activityBtn, activityLevel === level.id && styles.activityBtnActive]}
                    onPress={() => setActivityLevel(level.id as ActivityLevel)}
                    accessibilityRole="button"
                    accessibilityLabel={`${level.label} — ${level.desc}`}
                    accessibilityState={{ selected: activityLevel === level.id }}
                  >
                    <Text style={[styles.activityBtnText, activityLevel === level.id && styles.activityBtnTextActive]}>
                      {level.label}
                    </Text>
                    <Text style={styles.activityBtnDesc}>{level.desc}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Terms checkbox */}
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setTermsAccepted(!termsAccepted)}
            activeOpacity={0.8}
            accessibilityRole="checkbox"
            accessibilityLabel="Accept terms and privacy policy"
            accessibilityState={{ checked: termsAccepted }}
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
            style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled, isSuccess && styles.submitBtnSuccess]}
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting || isSuccess}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Create account"
            accessibilityState={{ disabled: isSubmitting || isSuccess }}
          >
            <Text style={styles.submitBtnText}>
              {isSuccess ? '✓ Account Created!' : isSubmitting ? 'Creating Account...' : 'Create Account'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            accessibilityRole="button"
            accessibilityLabel="Log in"
          >
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
        overflow: 'hidden' as any,
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
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
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
    width: '100%',
    maxWidth: layout.modalMaxWidth,
    alignSelf: 'center',
  },
  headerSection: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 24,
    fontWeight: fontWeight.bold,
    color: '#0b1c30',
    marginBottom: spacing.xs,
    letterSpacing: 0,
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
  passwordToggle: {
    minWidth: layout.minTouchTarget,
    minHeight: layout.minTouchTarget,
    justifyContent: 'center',
    alignItems: 'center',
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
    minHeight: 32,
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
    minHeight: 92,
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
  goalBtnDesc: {
    fontSize: 9,
    color: Colors.outline,
    marginTop: 2,
    textAlign: 'center',
  },
  goalBtnTextActive: {
    color: '#0ea5e9',
  },
  activityLevelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  activityBtn: {
    flex: 1,
    minWidth: '30%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.3)',
    borderRadius: 16,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    minHeight: 48,
  },
  activityBtnActive: {
    backgroundColor: '#ffffff',
    borderColor: '#0ea5e9',
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 8px rgba(14, 165, 233, 0.1)',
      },
      default: {
        shadowColor: '#0ea5e9',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 2,
      },
    }),
  },
  activityBtnText: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
    color: '#6e7881',
    textAlign: 'center',
  },
  activityBtnTextActive: {
    color: '#0ea5e9',
  },
  activityBtnDesc: {
    fontSize: 9,
    color: Colors.outline,
    marginTop: 2,
    textAlign: 'center',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginTop: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  checkbox: {
    width: 24,
    height: 24,
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
  submitBtnSuccess: {
    backgroundColor: '#16a34a',
    shadowColor: '#16a34a',
    ...Platform.select({
      web: {
        boxShadow: '0px 8px 16px rgba(22, 163, 74, 0.25)',
      },
      default: {
        shadowColor: '#16a34a',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
      },
    }),
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
  targetWeightHint: {
    fontSize: 10,
    color: Colors.outline,
    fontWeight: fontWeight.medium,
  },
  birthdateRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  birthdateIcon: {
    marginTop: spacing.sm + 2,
  },
  fieldWrapper: {
    width: '100%',
    gap: spacing.xs,
  },
  fieldLabel: {
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
    color: '#0b1c30',
  },
});
