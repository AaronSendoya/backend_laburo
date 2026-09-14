import { useState } from 'react';
import { router, Stack } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { validateEmail } from '@app-laburo/shared';
import { ThemedText } from '@/components/themed-text';
import { GlassCard } from '@/components/glass/GlassCard';
import { GlassButton } from '@/components/glass/GlassButton';
import { FormField } from '@/components/FormField';
import { SectionHeader } from '@/components/SectionHeader';
import { HeaderCancelButton } from '@/components/HeaderCancelButton';
import { PasswordToggleButton } from '@/components/PasswordToggleButton';
import { useLogin } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { ApiError } from '@/sync/apiClient';

export default function LoginScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const loginMutation = useLogin();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const emailResult = validateEmail(email);
  const passwordValid = password.length > 0;
  const isValid = emailResult.valid && passwordValid;

  function handleSubmit() {
    setAttempted(true);
    setServerError(null);
    if (!isValid) return;

    loginMutation.mutate(
      { email: email.trim(), password },
      {
        onSuccess: () => router.back(),
        onError: (error) => setServerError(error instanceof ApiError ? error.message : 'No se pudo iniciar sesión.'),
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
          <ThemedText type="heading">Iniciar sesión</ThemedText>
          <ThemedText themeColor="textSecondary" type="small">
            Entrá con tu cuenta para retomar el respaldo en la nube de tus registros.
          </ThemedText>
        </View>

        <GlassCard style={styles.card}>
          <SectionHeader icon="log-in-outline">Tu cuenta</SectionHeader>

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
            error={attempted && !passwordValid ? 'Ingresá tu contraseña.' : null}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            rightAccessory={<PasswordToggleButton visible={showPassword} onToggle={() => setShowPassword((v) => !v)} />}
          />
        </GlassCard>

        {serverError ? (
          <ThemedText themeColor="danger" type="small" style={styles.serverError}>
            {serverError}
          </ThemedText>
        ) : null}

        <GlassButton variant="primary" onPress={handleSubmit} disabled={loginMutation.isPending} containerStyle={styles.submitButton}>
          {loginMutation.isPending ? 'Iniciando sesión…' : 'Iniciar sesión'}
        </GlassButton>

        <ThemedText type="small" themeColor="textSecondary" style={styles.footerText}>
          ¿No tenés cuenta todavía?{' '}
          <ThemedText type="smallBold" themeColor="tintText" onPress={() => router.replace('/auth/register')}>
            Crear una
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
