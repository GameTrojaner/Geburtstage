import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Avatar, useTheme } from 'react-native-paper';
import { getInitials } from '../utils/birthday';

interface ContactAvatarProps {
  name: string;
  imageUri?: string;
  size?: number;
}

export function ContactAvatar({ name, imageUri, size = 48 }: ContactAvatarProps) {
  const theme = useTheme();

  if (imageUri) {
    return (
      <Image
        source={{ uri: imageUri }}
        style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
      />
    );
  }

  return (
    <Avatar.Text
      size={size}
      label={getInitials(name)}
      style={{ backgroundColor: theme.colors.primaryContainer }}
      labelStyle={{ color: theme.colors.onPrimaryContainer }}
    />
  );
}

const styles = StyleSheet.create({
  image: {
    resizeMode: 'cover',
  },
});
