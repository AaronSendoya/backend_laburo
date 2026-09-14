import { router } from 'expo-router';
import { Pressable } from 'react-native';
import { ThemedText } from './themed-text';

export function HeaderCancelButton() {
  return (
    <Pressable onPress={() => router.back()} hitSlop={12}>
      <ThemedText themeColor="tintText">Cancelar</ThemedText>
    </Pressable>
  );
}
