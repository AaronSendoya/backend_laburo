import { type PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { db } from './client';
import migrations from '../../drizzle/migrations';

/** Corre las migraciones de SQLite al arrancar. Bloquea el render hasta terminar (suele tardar unos ms). */
export function MigrationsGate({ children }: PropsWithChildren) {
  const { success, error } = useMigrations(db, migrations);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>No se pudo preparar la base de datos local.</Text>
        <Text style={styles.errorDetail}>{error.message}</Text>
      </View>
    );
  }

  if (!success) {
    return null;
  }

  return children;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { fontSize: 16, fontWeight: '600', textAlign: 'center', marginBottom: 8 },
  errorDetail: { fontSize: 13, textAlign: 'center', opacity: 0.7 },
});
