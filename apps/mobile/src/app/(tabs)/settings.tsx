import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { validateFreeText } from '@app-laburo/shared';
import { ThemedText } from '@/components/themed-text';
import { GlassCard } from '@/components/glass/GlassCard';
import { GlassButton } from '@/components/glass/GlassButton';
import { SyncStatusPill } from '@/components/glass/SyncStatusPill';
import { FormField } from '@/components/FormField';
import { SectionHeader } from '@/components/SectionHeader';
import { SegmentedControl } from '@/components/SegmentedControl';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { runSync } from '@/sync/syncEngine';
import { useSyncStatusStore } from '@/sync/syncStatus.store';
import { useDiscardOutboxOp, useFailedOutboxOps, useRetryOutboxOp } from '@/hooks/useOutbox';
import { useSetCompanyName } from '@/hooks/useCompanyName';
import { useAuthSession, useLogout } from '@/hooks/useAuth';
import {
  useSetHoursGoal,
  useSetRemindersEnabled,
  useSetReminderThresholdHours,
  useSetStreakEnabled,
  useStreakEnabled,
  useRemindersEnabled,
} from '@/hooks/useAppSettings';
import { getCompanyName, getHoursGoal, getReminderThresholdHours, DEFAULT_REMINDER_THRESHOLD_HOURS } from '@/settings/localSettings';
import { useThemePreferenceStore, type ThemePreference } from '@/theme/themePreference.store';
import { saveThemePreference } from '@/theme/themePreference';
import { ensureNotificationPermission } from '@/notifications/reminders';

const COMPANY_NAME_MAX_LENGTH = 80;
const MAX_REMINDER_THRESHOLD_HOURS = 72;
const MAX_HOURS_GOAL = 100_000;

function validateHoursGoalInput(value: string): { valid: boolean; error?: string } {
  const trimmed = value.trim();
  if (!trimmed) return { valid: false, error: 'Ingresá la meta de horas.' };
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0) return { valid: false, error: 'Ingresá un número mayor a 0.' };
  if (parsed > MAX_HOURS_GOAL) return { valid: false, error: 'Ese número parece demasiado alto — revisalo.' };
  return { valid: true };
}

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'Sistema' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
];

export default function SettingsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const setCompanyName = useSetCompanyName();
  const [savedCompanyName, setSavedCompanyName] = useState<string | null>(null);
  const [companyNameInput, setCompanyNameInput] = useState('');
  const [companyNameError, setCompanyNameError] = useState<string | null>(null);
  // Arranca en modo edición: si no hay nombre guardado, es lo que hace falta mostrar;
  // si sí hay uno, el effect de abajo lo pasa a modo vista apenas termina de cargar.
  const [isEditingCompanyName, setIsEditingCompanyName] = useState(true);

  const themePreference = useThemePreferenceStore((s) => s.preference);
  const setThemePreferenceState = useThemePreferenceStore((s) => s.setPreference);

  const { data: streakEnabled = false } = useStreakEnabled();
  const setStreakEnabled = useSetStreakEnabled();
  const { data: remindersEnabled = false } = useRemindersEnabled();
  const setRemindersEnabled = useSetRemindersEnabled();
  const setReminderThresholdHours = useSetReminderThresholdHours();
  const [reminderThresholdHours, setReminderThresholdHoursState] = useState(DEFAULT_REMINDER_THRESHOLD_HOURS);
  const [reminderThresholdInput, setReminderThresholdInput] = useState(String(DEFAULT_REMINDER_THRESHOLD_HOURS));
  const [reminderThresholdError, setReminderThresholdError] = useState<string | null>(null);

  const setHoursGoal = useSetHoursGoal();
  const [savedHoursGoal, setSavedHoursGoalState] = useState<number | null>(null);
  const [hoursGoalInput, setHoursGoalInput] = useState('');
  const [hoursGoalError, setHoursGoalError] = useState<string | null>(null);
  // Arranca en modo edición por la misma razón que Perfil: si no hay meta
  // guardada todavía, es lo que hace falta mostrar apenas carga.
  const [isEditingHoursGoal, setIsEditingHoursGoal] = useState(true);

  const lastSyncedAt = useSyncStatusStore((s) => s.lastSyncedAt);
  const lastError = useSyncStatusStore((s) => s.lastError);
  const { data: failedOps = [] } = useFailedOutboxOps();
  const retryOp = useRetryOutboxOp();
  const discardOp = useDiscardOutboxOp();

  const { data: authSession } = useAuthSession();
  const logout = useLogout();

  useEffect(() => {
    void getCompanyName().then((name) => {
      setSavedCompanyName(name);
      setCompanyNameInput(name ?? '');
      setIsEditingCompanyName(!name);
    });
    void getReminderThresholdHours().then((hours) => {
      setReminderThresholdHoursState(hours);
      setReminderThresholdInput(String(hours));
    });
    void getHoursGoal().then((goal) => {
      setSavedHoursGoalState(goal);
      setHoursGoalInput(goal ? String(goal) : '');
      setIsEditingHoursGoal(!goal);
    });
  }, []);

  function handleSaveCompanyName() {
    const result = validateFreeText(companyNameInput, { fieldLabel: 'El nombre de la empresa', required: true, maxLength: COMPANY_NAME_MAX_LENGTH });
    setCompanyNameError(result.error ?? null);
    if (!result.valid) return;

    const trimmed = companyNameInput.trim();
    setCompanyName.mutate(trimmed, {
      onSuccess: () => {
        setSavedCompanyName(trimmed);
        setIsEditingCompanyName(false);
      },
    });
  }

  function handleStartEditCompanyName() {
    setCompanyNameError(null);
    setCompanyNameInput(savedCompanyName ?? '');
    setIsEditingCompanyName(true);
  }

  function handleCancelEditCompanyName() {
    setCompanyNameError(null);
    setCompanyNameInput(savedCompanyName ?? '');
    setIsEditingCompanyName(false);
  }

  function handleSaveHoursGoal() {
    const result = validateHoursGoalInput(hoursGoalInput);
    setHoursGoalError(result.error ?? null);
    if (!result.valid) return;

    const parsed = Number(hoursGoalInput.trim());
    setHoursGoal.mutate(parsed, {
      onSuccess: () => {
        setSavedHoursGoalState(parsed);
        setIsEditingHoursGoal(false);
      },
    });
  }

  function handleStartEditHoursGoal() {
    setHoursGoalError(null);
    setIsEditingHoursGoal(true);
  }

  function handleCancelEditHoursGoal() {
    setHoursGoalError(null);
    setHoursGoalInput(savedHoursGoal ? String(savedHoursGoal) : '');
    setIsEditingHoursGoal(false);
  }

  function handleReminderThresholdBlur() {
    const parsed = Number(reminderThresholdInput.trim());
    if (!Number.isFinite(parsed) || parsed <= 0 || parsed > MAX_REMINDER_THRESHOLD_HOURS) {
      setReminderThresholdError(`Ingresá un número entre 1 y ${MAX_REMINDER_THRESHOLD_HOURS} horas.`);
      setReminderThresholdInput(String(reminderThresholdHours));
      return;
    }
    setReminderThresholdError(null);
    if (parsed !== reminderThresholdHours) {
      setReminderThresholdHours.mutate(parsed, { onSuccess: () => setReminderThresholdHoursState(parsed) });
    }
  }

  function handleLogout() {
    Alert.alert('Cerrar sesión', 'Tus registros locales no se van a borrar — solo se pausa el respaldo en la nube.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: () => logout.mutate() },
    ]);
  }

  function handleThemeChange(preference: ThemePreference) {
    setThemePreferenceState(preference);
    void saveThemePreference(preference);
  }

  async function handleToggleReminders(next: boolean) {
    if (next) {
      const granted = await ensureNotificationPermission();
      if (!granted) {
        Alert.alert(
          'Permiso de notificaciones',
          'Para avisarte necesito permiso de notificaciones. Podés habilitarlo desde Ajustes del sistema › Pista8 › Notificaciones.',
        );
        return;
      }
    }
    setRemindersEnabled.mutate(next);
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top + Spacing.three }]}>
      <ThemedText type="heading">Ajustes</ThemedText>

      <GlassCard style={styles.section}>
        <SectionHeader icon="briefcase-outline">Perfil</SectionHeader>
        {isEditingCompanyName ? (
          <>
            <FormField
              label="Empresa / lugar de trabajo"
              value={companyNameInput}
              onChangeText={(text) => {
                setCompanyNameInput(text);
                setCompanyNameError(null);
              }}
              error={companyNameError}
              placeholder="Ej: Pista8"
              maxLength={COMPANY_NAME_MAX_LENGTH}
              autoCorrect={false}
              autoFocus={Boolean(savedCompanyName)}
            />
            <View style={styles.buttonRow}>
              {savedCompanyName ? (
                <GlassButton onPress={handleCancelEditCompanyName} containerStyle={styles.flexButton}>
                  Cancelar
                </GlassButton>
              ) : null}
              <GlassButton variant="primary" onPress={handleSaveCompanyName} containerStyle={styles.flexButton}>
                Guardar
              </GlassButton>
            </View>
          </>
        ) : (
          <View style={styles.profileRow}>
            <View style={styles.profileInfo}>
              <ThemedText type="small" themeColor="textSecondary">
                Empresa / lugar de trabajo
              </ThemedText>
              <ThemedText type="smallBold">{savedCompanyName}</ThemedText>
            </View>
            <Pressable onPress={handleStartEditCompanyName} hitSlop={8} style={styles.editButton}>
              <Ionicons name="pencil-outline" size={14} color={theme.tintText} />
              <ThemedText type="small" themeColor="tintText">
                Editar
              </ThemedText>
            </Pressable>
          </View>
        )}
      </GlassCard>

      <GlassCard style={styles.section}>
        <SectionHeader icon="flag-outline">Meta de horas</SectionHeader>
        {isEditingHoursGoal ? (
          <>
            <FormField
              label="Horas requeridas en total"
              value={hoursGoalInput}
              onChangeText={(text) => {
                setHoursGoalInput(text);
                setHoursGoalError(null);
              }}
              error={hoursGoalError}
              placeholder="Ej: 480"
              keyboardType="number-pad"
              autoFocus={Boolean(savedHoursGoal)}
            />
            <View style={styles.buttonRow}>
              {savedHoursGoal ? (
                <GlassButton onPress={handleCancelEditHoursGoal} containerStyle={styles.flexButton}>
                  Cancelar
                </GlassButton>
              ) : null}
              <GlassButton variant="primary" onPress={handleSaveHoursGoal} containerStyle={styles.flexButton}>
                Guardar
              </GlassButton>
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              Se usa para mostrar tu progreso en el Inicio. Opcional.
            </ThemedText>
          </>
        ) : (
          <View style={styles.profileRow}>
            <View style={styles.profileInfo}>
              <ThemedText type="small" themeColor="textSecondary">
                Horas requeridas en total
              </ThemedText>
              <ThemedText type="smallBold">{savedHoursGoal} horas</ThemedText>
            </View>
            <Pressable onPress={handleStartEditHoursGoal} hitSlop={8} style={styles.editButton}>
              <Ionicons name="pencil-outline" size={14} color={theme.tintText} />
              <ThemedText type="small" themeColor="tintText">
                Editar
              </ThemedText>
            </Pressable>
          </View>
        )}
      </GlassCard>

      <GlassCard style={styles.section}>
        <SectionHeader icon="color-palette-outline">Apariencia</SectionHeader>
        <SegmentedControl options={THEME_OPTIONS} value={themePreference} onChange={handleThemeChange} />
      </GlassCard>

      <GlassCard style={styles.section}>
        <SectionHeader icon="options-outline">Preferencias</SectionHeader>
        <View style={styles.rowBetween}>
          <View style={styles.preferenceText}>
            <ThemedText type="small">Mostrar racha de días trabajados</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Días consecutivos en el Dashboard.
            </ThemedText>
          </View>
          <Switch value={streakEnabled} onValueChange={(next) => setStreakEnabled.mutate(next)} />
        </View>
        <View style={styles.rowBetween}>
          <View style={styles.preferenceText}>
            <ThemedText type="small">Avisarme si me olvido de marcar salida</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Notificación local, después de la entrada.
            </ThemedText>
          </View>
          <Switch value={remindersEnabled} onValueChange={(next) => void handleToggleReminders(next)} />
        </View>
        {remindersEnabled ? (
          <FormField
            label="Avisar después de (horas)"
            value={reminderThresholdInput}
            onChangeText={(text) => {
              setReminderThresholdInput(text);
              setReminderThresholdError(null);
            }}
            onEndEditing={handleReminderThresholdBlur}
            error={reminderThresholdError}
            keyboardType="number-pad"
            placeholder="8"
          />
        ) : null}
      </GlassCard>

      <GlassCard style={styles.section}>
        <SectionHeader icon="cloud-outline">Respaldo en la nube</SectionHeader>
        {authSession ? (
          <>
            <ThemedText type="small" themeColor="textSecondary">
              Conectado como
            </ThemedText>
            <ThemedText type="smallBold">{authSession.email}</ThemedText>
            <View style={styles.buttonRow}>
              <GlassButton onPress={() => router.push('/auth/change-password')} containerStyle={styles.hugButton}>
                Cambiar contraseña
              </GlassButton>
              <GlassButton variant="danger" onPress={handleLogout} disabled={logout.isPending} containerStyle={styles.hugButton}>
                Cerrar sesión
              </GlassButton>
            </View>
          </>
        ) : (
          <>
            <ThemedText type="small" themeColor="textSecondary">
              Creá una cuenta gratis y subí tus datos a la nube — opcional, la app funciona igual sin esto.
            </ThemedText>
            <GlassButton variant="primary" onPress={() => router.push('/auth/register')} containerStyle={styles.hugButton}>
              Crear cuenta
            </GlassButton>
            <ThemedText type="small" themeColor="tintText" style={styles.centeredLink} onPress={() => router.push('/auth/login')}>
              Ya tengo cuenta
            </ThemedText>
          </>
        )}
      </GlassCard>

      {authSession ? (
        <GlassCard style={styles.section}>
          <SectionHeader icon="sync-outline">Sincronización</SectionHeader>
          <SyncStatusPill />
          <ThemedText type="small" themeColor="textSecondary">
            {lastSyncedAt ? `Última sincronización: ${new Date(lastSyncedAt).toLocaleString('es-AR')}` : 'Todavía no sincronizó'}
          </ThemedText>
          {lastError ? (
            <ThemedText type="small" themeColor="danger">
              {lastError}
            </ThemedText>
          ) : null}
          <GlassButton onPress={() => void runSync()} containerStyle={styles.hugButton}>
            Sincronizar ahora
          </GlassButton>
        </GlassCard>
      ) : null}

      {failedOps.length > 0 ? (
        <GlassCard style={styles.section}>
          <SectionHeader icon="alert-circle-outline">{`Operaciones con error (${failedOps.length})`}</SectionHeader>
          {failedOps.map((op) => (
            <View key={op.opId} style={styles.failedRow}>
              <ThemedText type="small" style={styles.failedText}>
                {op.lastError}
              </ThemedText>
              <GlassButton onPress={() => retryOp.mutate(op.opId)} style={styles.smallButton}>
                Reintentar
              </GlassButton>
              <GlassButton variant="danger" onPress={() => discardOp.mutate(op.opId)} style={styles.smallButton}>
                Descartar
              </GlassButton>
            </View>
          ))}
        </GlassCard>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.four, gap: Spacing.three, paddingBottom: Spacing.six },
  section: { gap: Spacing.two },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two },
  buttonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  flexButton: { flex: 1 },
  hugButton: { alignSelf: 'flex-start' },
  profileRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two },
  profileInfo: { gap: 2 },
  editButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 4 },
  preferenceText: { flex: 1, gap: 1 },
  failedRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  failedText: { flex: 1 },
  smallButton: { paddingVertical: 6, paddingHorizontal: 10 },
  centeredLink: { textAlign: 'center' },
});
