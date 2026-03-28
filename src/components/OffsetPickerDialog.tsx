import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Chip, Dialog, Portal, Text, TextInput, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';

type Unit = 'days' | 'weeks' | 'months';

interface OffsetPickerDialogProps {
  visible: boolean;
  onDismiss: () => void;
  onAdd: (offset: number) => void;
  existingOffsets: number[];
}

export function OffsetPickerDialog({ visible, onDismiss, onAdd, existingOffsets }: OffsetPickerDialogProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [amount, setAmount] = useState('1');
  const [unit, setUnit] = useState<Unit>('days');

  const toOffset = (val: number, u: Unit): number => {
    switch (u) {
      case 'days': return val;
      case 'weeks': return val * 7;
      // Months are encoded as negative integers (-1 = 1 month, -2 = 2 months, ...)
      // so they can be distinguished from an explicit "30 days" offset.
      case 'months': return -val;
    }
  };

  const parsedAmount = parseInt(amount, 10);
  const isValid = !isNaN(parsedAmount) && parsedAmount >= 0;
  const resultOffset = isValid ? toOffset(parsedAmount, unit) : Number.MIN_SAFE_INTEGER;
  const isDuplicate = isValid && existingOffsets.includes(resultOffset);

  const handleAdd = () => {
    if (isValid && !isDuplicate) {
      onAdd(resultOffset);
      setAmount('1');
      setUnit('days');
    }
  };

  const handleDismiss = () => {
    setAmount('1');
    setUnit('days');
    onDismiss();
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={handleDismiss}>
        <Dialog.Title>{t('settings.addOffset')}</Dialog.Title>
        <Dialog.Content>
          <TextInput
            mode="outlined"
            label={t('settings.offsetAmount')}
            value={amount}
            onChangeText={setAmount}
            keyboardType="number-pad"
            style={styles.input}
          />
          <View style={styles.unitRow}>
            <Chip
              mode="outlined"
              selected={unit === 'days'}
              onPress={() => setUnit('days')}
              style={styles.unitChip}
              showSelectedOverlay
            >
              {t('settings.offsetDays')}
            </Chip>
            <Chip
              mode="outlined"
              selected={unit === 'weeks'}
              onPress={() => setUnit('weeks')}
              style={styles.unitChip}
              showSelectedOverlay
            >
              {t('settings.offsetWeeks')}
            </Chip>
            <Chip
              mode="outlined"
              selected={unit === 'months'}
              onPress={() => setUnit('months')}
              style={styles.unitChip}
              showSelectedOverlay
            >
              {t('settings.offsetMonths')}
            </Chip>
          </View>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={handleDismiss}>{t('common.cancel')}</Button>
          <Button onPress={handleAdd} disabled={!isValid || isDuplicate}>
            {t('common.save')}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  input: {
    marginBottom: 16,
  },
  unitRow: {
    flexDirection: 'row',
    gap: 8,
  },
  unitChip: {
    marginRight: 0,
  },
});
