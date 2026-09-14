import { useState } from 'react';
import { router, Stack } from 'expo-router';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { validatePassword, validatePasswordConfirmation } from '@app-laburo/shared';
import { ThemedText } from '@/components/themed-text';
import { GlassCard } from '@/components/glass/GlassCard';
import { GlassButton } from '@/components/glass/GlassButton';
import { FormField } from '@/components/FormField';
import { SectionHeader } from '@/components/SectionHeader';
import { HeaderCancelButton } from '@/components/HeaderCancelButton';
import { PasswordToggleButton } from '@/components/PasswordToggleButton';
import { useChangePassword } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { ApiError } from '@/sync/apiClient';

export default function ChangePasswordScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const changePasswordMutation = useChangePassword();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const currentValid = currentPassword.length > 0;
  const newPasswordResult = validatePassword(newPassword);
  const confirmResult = validatePasswordConfirmation(newPassword, confirmPassword);
  const sameAsCurrentError =
    newPasswordResult.valid && currentPassword.length > 0 && newPassword === currentPassword
      ? 'La contraseña nueva debe ser distinta de la actual.'
      : null;

  const isValid = currentValid && newPasswordResult.valid && confirmResult.valid && !sameAsCurrentError;

  function handleSubmit() {
    setAttempted(true);
    setServerError(null);
    if (!isValid) return;

    changePasswordMutation.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          Alert.alert('Contraseña actualizada', 'Se cerró la sesión en cualquier otro dispositivo — acá seguís logueado.');
          router.back();
        },
        onError: (error) => setServerError(error instanceof ApiError ? error.message : 'No se pudo cambiar la contraseña.'),
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
          <ThemedText type="heading">Cambiar contraseña</ThemedText>
          <ThemedText themeColor="textSecondary" type="small">
            Al confirmar, se cierra la sesión en cualquier otro dispositivo donde hayas iniciado sesión con esta cuenta — acá seguís
            logueado, sin volver a entrar.
          </ThemedText>
        </View>

        <GlassCard style={styles.card}>
          <SectionHeader icon="key-outline">Contraseña</SectionHeader>

          <FormField
            label="Contraseña actual"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            error={attempted && !currentValid ? 'Ingresá tu contraseña actual.' : null}
            secureTextEntry={!showPasswords}
            autoCapitalize="none"
            autoCorrect={false}
            rightAccessory={<PasswordToggleButton visible={showPasswords} onToggle={() => setShowPasswords((v) => !v)} />}
          />

          <FormField
            label="Contraseña nueva"
            value={newPassword}
            onChangeText={setNewPassword}
            error={attempted && (!newPasswordResult.valid || sameAsCurrentError) ? (newPasswordResult.error ?? sameAsCurrentError) : null}
            secureTextEntry={!showPasswords}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Mínimo 10 caracteres, letras y números"
          />

          <FormField
            label="Repetir contraseña nueva"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            error={attempted && !confirmResult.valid ? confirmResult.error : null}
            secureTextEntry={!showPasswords}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </GlassCard>

        {serverError ? (
          <ThemedText themeColor="danger" type="small" style={styles.serverError}>
            {serverError}
          </ThemedText>
        ) : null}

        <GlassButton
          variant="primary"
          onPress={handleSubmit}
          disabled={changePasswordMutation.isPending}
          containerStyle={styles.submitButton}>
          {changePasswordMutation.isPending ? 'Actualizando…' : 'Actualizar contraseña'}
        </GlassButton>
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
});
