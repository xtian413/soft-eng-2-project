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
import { Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginForm = z.infer<typeof schema>;
type LoginNavigation = StackNavigationProp<AuthStackParamList, 'Login'>;

/** Renders the premium Aura login screen, matching exactly with the Web styling. */
export default function LoginScreen() {
  const navigation = useNavigation<LoginNavigation>();
  const signIn = useAuthStore((state) => state.signIn);
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: LoginForm) => {
    const error = await signIn(values.email, values.password);
    if (error) {
      Alert.alert('Login failed', error.message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.outer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Ambient background decoration */}
      <View style={[styles.glowContainer, { pointerEvents: 'none' }]} pointerEvents="none">
        <View style={styles.glow1} />
        <View style={styles.glow2} />
      </View>

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Logo Icon box */}
        <View style={styles.logoSection}>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>A</Text>
          </View>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Ready to hit today's targets?</Text>
        </View>

        {/* Form Container */}
        <View style={styles.formContainer}>
          {/* Email Input */}
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
                  style={[styles.input, errors.email && styles.inputError]}
                  value={value}
                  editable={!isSubmitting}
                />
              )}
            />
          </View>
          {errors.email && <Text style={styles.errorText}>{errors.email.message}</Text>}

          {/* Password Input */}
          <View style={styles.inputWrapper}>
            <Lock size={18} color={Colors.outline} style={styles.inputIcon} />
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  secureTextEntry={!showPassword}
                  onChangeText={onChange}
                  placeholder="Password"
                  placeholderTextColor={Colors.outline}
                  style={[styles.input, errors.password && styles.inputError]}
                  value={value}
                  editable={!isSubmitting}
                />
              )}
            />
            <TouchableOpacity
              style={styles.passwordToggle}
              onPress={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff size={18} color={Colors.outline} />
              ) : (
                <Eye size={18} color={Colors.outline} />
              )}
            </TouchableOpacity>
          </View>
          {errors.password && <Text style={styles.errorText}>{errors.password.message}</Text>}

          {/* Forgot Password link */}
          <View style={styles.forgotContainer}>
            <TouchableOpacity onPress={() => Alert.alert('Forgot Password', 'Password recovery link has been simulated.')}>
              <Text style={styles.forgotBtn}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          {/* Login Action Button */}
          <TouchableOpacity
            style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            activeOpacity={0.85}
          >
            <Text style={styles.submitBtnText}>
              {isSubmitting ? 'Logging In...' : 'Log In'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>Or continue with</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Social Buttons with exact brand SVGs */}
        <View style={styles.socialGrid}>
          <TouchableOpacity
            style={styles.socialBtn}
            onPress={() => Alert.alert('Social Login', 'Google authentication initiated.')}
            activeOpacity={0.7}
          >
            <Svg width={18} height={18} viewBox="0 0 24 24" style={styles.socialIcon}>
              <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </Svg>
            <Text style={styles.socialBtnText}>Google</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.socialBtn}
            onPress={() => Alert.alert('Social Login', 'Apple authentication initiated.')}
            activeOpacity={0.7}
          >
            <Svg width={18} height={18} viewBox="0 0 24 24" style={styles.socialIcon}>
              <Path d="M17.05 20.28c-.96.95-2.22 1.72-3.72 1.72-1.45 0-2.2-.84-3.55-.84-1.37 0-2.18.84-3.57.84-1.4 0-2.65-.77-3.66-1.77C.6 18.28-.9 14.1.85 10.8c.87-1.63 2.53-2.65 4.34-2.65 1.37 0 2.45.82 3.25.82s1.88-.82 3.25-.82c1.55 0 2.92.76 3.75 1.75-3.04 1.4-2.55 5.5.4 6.78-.6 1.45-1.18 2.62-1.79 3.6zM13.53 5.4c.05-1.28-.46-2.55-1.3-3.48-.84-.92-2.1-1.44-3.3-1.44-.05 1.3.5 2.54 1.34 3.44.82.93 2.12 1.48 3.26 1.48z" fill="#000000" />
            </Svg>
            <Text style={styles.socialBtnText}>Apple</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>New to Aura?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.footerLink}>Register Now</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: '#f8f9ff',
  },
  glowContainer: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  glow1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
    transform: [{ scale: 1.5 }],
  },
  glow2: {
    position: 'absolute',
    bottom: -50,
    left: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
    transform: [{ scale: 1.5 }],
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    width: '100%',
  },
  logoBox: {
    width: 64,
    height: 64,
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(14, 165, 233, 0.25)',
    marginBottom: spacing.lg,
    ...Platform.select({
      web: {
        boxShadow: '0px 8px 16px rgba(14, 165, 233, 0.15)',
      },
      default: {
        shadowColor: '#0ea5e9',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 4,
      },
    }),
  },
  logoText: {
    fontSize: 38,
    fontWeight: '800',
    color: '#0ea5e9',
    lineHeight: 46,
  },
  title: {
    fontSize: 28,
    fontWeight: fontWeight.bold,
    color: '#0b1c30',
    marginBottom: spacing.xs,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: typography.base,
    color: '#3e4850',
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
    gap: spacing.md,
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
  inputError: {
    color: Colors.error,
  },
  passwordToggle: {
    paddingHorizontal: spacing.xs,
    justifyContent: 'center',
  },
  errorText: {
    fontSize: typography.xs,
    color: Colors.error,
    paddingLeft: spacing.md,
    marginTop: -spacing.xs,
  },
  forgotContainer: {
    alignItems: 'flex-end',
    width: '100%',
    paddingRight: spacing.sm,
    marginTop: -spacing.xs,
  },
  forgotBtn: {
    fontSize: typography.sm,
    fontWeight: fontWeight.semiBold,
    color: '#0ea5e9',
  },
  submitBtn: {
    backgroundColor: Colors.primaryContainer,
    borderRadius: radius.full,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
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
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: spacing.xl,
    gap: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(190, 200, 210, 0.4)',
  },
  dividerText: {
    fontSize: 12,
    fontWeight: fontWeight.semiBold,
    color: '#6e7881',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  socialGrid: {
    flexDirection: 'row',
    width: '100%',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(190, 200, 210, 0.4)',
    height: 46,
    borderRadius: radius.full,
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.03)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
        elevation: 2,
      },
    }),
  },
  socialIcon: {
    marginRight: 4,
  },
  socialBtnText: {
    fontSize: typography.sm,
    fontWeight: fontWeight.bold,
    color: '#0b1c30',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
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
