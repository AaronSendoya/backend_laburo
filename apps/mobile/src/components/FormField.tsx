import { type ReactNode } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { ThemedText } from './themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Radii, Spacing } from '@/constants/theme';

interface FormFieldProps extends TextInputProps {
  label: string;
  error?: string | null;
  /** Ej. el botón de mostrar/ocultar contraseña — se superpone a la derecha del input. */
  rightAccessory?: ReactNode;
}

/** Campo de formulario con look nativo de iOS (relleno + borde redondeado) y espacio para mostrar un error de validación. */
export function FormField({ label, error, style, rightAccessory, ...inputProps }: FormFieldProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.label}>
        {label.toUpperCase()}
      </ThemedText>
      <View style={styles.inputRow}>
        <TextInput
          placeholderTextColor={theme.textSecondary}
          style={[
            styles.input,
            rightAccessory ? styles.inputWithAccessory : null,
            {
              color: theme.text,
              backgroundColor: theme.backgroundElement,
              borderColor: error ? theme.danger : 'transparent',
            },
            style,
          ]}
          {...inputProps}
        />
        {rightAccessory ? <View style={styles.accessory}>{rightAccessory}</View> : null}
      </View>
      {error ? (
        <ThemedText type="small" themeColor="danger" style={styles.error}>
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.one },
  label: { marginLeft: 2 },
  inputRow: { position: 'relative', justifyContent: 'center' },
  input: {
    fontSize: 15,
    paddingVertical: 10,
    paddingHorizontal: Spacing.three,
    borderRadius: Radii.button,
    borderWidth: 1.5,
  },
  inputWithAccessory: { paddingRight: 44 },
  accessory: { position: 'absolute', right: 4 },
  error: { marginLeft: 2 },
});
