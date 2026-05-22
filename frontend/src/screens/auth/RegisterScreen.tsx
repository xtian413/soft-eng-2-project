import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Controller, useForm } from 'react-hook-form';
import { Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { z } from 'zod';
import type { AuthStackParamList } from '@/navigation/AuthNavigator';
import { useAuthStore } from '@/store/authStore';

const schema = z
  .object({
    email: z.string().email(),
    password: z.string().min(6),
    confirmPassword: z.string().min(6),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterForm = z.infer<typeof schema>;

type RegisterNavigation = StackNavigationProp<AuthStackParamList, 'Register'>;

/** Renders the registration screen. */
export default function RegisterScreen() {
  const navigation = useNavigation<RegisterNavigation>();
  const signUp = useAuthStore((state) => state.signUp);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async (values: RegisterForm) => {
    const error = await signUp(values.email, values.password);
    if (error) {
      Alert.alert('Sign up failed', error);
      return;
    }

    Alert.alert('Check your email', 'Confirm your account to continue.');
    navigation.navigate('Login');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create your account</Text>

      <Text style={styles.label}>Email</Text>
      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, value } }) => (
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={onChange}
            placeholder="you@email.com"
            style={styles.input}
            value={value}
          />
        )}
      />
      {errors.email && <Text style={styles.error}>{errors.email.message}</Text>}

      <Text style={styles.label}>Password</Text>
      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, value } }) => (
          <TextInput
            secureTextEntry
            onChangeText={onChange}
            placeholder="Create a password"
            style={styles.input}
            value={value}
          />
        )}
      />
      {errors.password && (
        <Text style={styles.error}>{errors.password.message}</Text>
      )}

      <Text style={styles.label}>Confirm password</Text>
      <Controller
        control={control}
        name="confirmPassword"
        render={({ field: { onChange, value } }) => (
          <TextInput
            secureTextEntry
            onChangeText={onChange}
            placeholder="Repeat your password"
            style={styles.input}
            value={value}
          />
        )}
      />
      {errors.confirmPassword && (
        <Text style={styles.error}>{errors.confirmPassword.message}</Text>
      )}

      <Button
        title={isSubmitting ? 'Creating...' : 'Create Account'}
        onPress={handleSubmit(onSubmit)}
        disabled={isSubmitting}
      />

      <View style={styles.footer}>
        <Text>Already have an account?</Text>
        <Button title="Sign in" onPress={() => navigation.navigate('Login')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 12,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    borderColor: '#d0d0d0',
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  error: {
    color: '#b00020',
  },
  footer: {
    marginTop: 16,
    gap: 8,
  },
});
