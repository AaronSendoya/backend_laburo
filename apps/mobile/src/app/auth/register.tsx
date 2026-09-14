import { useState } from 'react';
import { router, Stack } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { validateEmail, validatePassword, validatePasswordConfirmation } from '@app-laburo/shared';
import { ThemedText } from '@/components/themed-text';
import { GlassCard } from '@/components/glass/GlassCard';
import { GlassButton } from '@/components/glass/GlassButton';
import { FormField } from '@/components/FormField';
import { SectionHeader } from '@/components/SectionHeader';
import { HeaderCancelButton } from '@/components/HeaderCancelButton';
import { PasswordToggleButton } from '@/components/PasswordToggleButton';
import { useRegister } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { ApiError } from '@/sync/apiClient';

export default function RegisterScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const registerMutation = useRegister();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const emailResult = validateEmail(email);
  const passwordResult = validatePassword(password);
  const confirmResult = validatePasswordConfirmation(password, confirmPassword);

  const isValid = emailResult.valid && passwordResult.valid && confirmResult.valid;

  function handleSubmit() {
    setAttempted(true);
    setServerError(null);
    if (!isValid) return;

    registerMutation.mutate(
      { email: email.trim(), password },
      {
        onSuccess: () => router.back(),
        onError: (error) => setServerError(error instanceof ApiError ? error.message : 'No se pudo crear la cuenta.'),
      },
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerLeft: () => <HeaderCancelButton /> }} />
      <ScrollView
        contentContainerStyle={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top + Spacing.three }]}
        keyboardShouldPersistTaps="handled">
        <View style={styles.intro}>
          <ThemedText type="heading">Crear cuenta</ThemedText>
          <ThemedText themeColor="textSecondary" type="small">
            Tus registros ya están a salvo en este dispositivo. Crear una cuenta es opcional — sirve para tener, además, un respaldo en
            la nube.
          </ThemedText>
        </View>

        <GlassCard style={styles.card}>
          <SectionHeader icon="mail-outline">Datos de la cuenta</SectionHeader>

          <FormField
            label="Correo"
            value={email}
            onChangeText={setEmail}
            error={attempted && !emailResult.valid ? emailResult.error : null}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="vos@ejemplo.com"
          />

          <FormField
            label="Contraseña"
            value={password}
            onChangeText={setPassword}
            error={attempted && !passwordResult.valid ? passwordResult.error : null}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Mínimo 10 caracteres, letras y números"
            rightAccessory={<PasswordToggleButton visible={showPassword} onToggle={() => setShowPassword((v) => !v)} />}
          />

          <FormField
            label="Repetir contraseña"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            error={attempted && !confirmResult.valid ? confirmResult.error : null}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </GlassCard>

        {serverError ? (
          <ThemedText themeColor="danger" type="small" style={styles.serverError}>
            {serverError}
          </ThemedText>
        ) : null}

        <GlassButton variant="primary" onPress={handleSubmit} disabled={registerMutation.isPending} containerStyle={styles.submitButton}>
          {registerMutation.isPending ? 'Creando cuenta…' : 'Crear cuenta'}
        </GlassButton>

        <ThemedText type="small" themeColor="textSecondary" style={styles.footerText}>
          ¿Ya tenés cuenta?{' '}
          <ThemedText type="smallBold" themeColor="tintText" onPress={() => router.replace('/auth/login')}>
            Iniciar sesión
          </ThemedText>
        </ThemedText>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.four, gap: Spacing.three, paddingBottom: Spacing.six },
  intro: { gap: Spacing.one },
  card: { gap: Spacing.three },
  serverError: { textAlign: 'center' },
  submitButton: { alignSelf: 'stretch' },
  footerText: { textAlign: 'center' },
});
