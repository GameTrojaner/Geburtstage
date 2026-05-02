import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Dialog, Portal, Text, useTheme } from 'react-native-paper';

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
}

export function LoadingOverlay({ visible, message }: LoadingOverlayProps) {
  const theme = useTheme();

  return (
    <Portal>
      <Dialog visible={visible} dismissable={false} style={styles.dialog}>
        <Dialog.Content>
          <View style={styles.content}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            {message ? (
              <Text variant="bodyMedium" style={[styles.message, { color: theme.colors.onSurface }]}>
                {message}
              </Text>
            ) : null}
          </View>
        </Dialog.Content>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  dialog: {
    alignSelf: 'center',
    minWidth: 160,
  },
  content: {
    alignItems: 'center',
    gap: 16,
    paddingVertical: 8,
  },
  message: {
    textAlign: 'center',
  },
});
