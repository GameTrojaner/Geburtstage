import React, { useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet } from 'react-native';
import { Avatar, useTheme } from 'react-native-paper';
import { getInitials } from '../utils/birthday';

interface ContactAvatarProps {
  name: string;
  imageUri?: string;
  fallbackImageUri?: string;
  size?: number;
}

export function ContactAvatar({ name, imageUri, fallbackImageUri, size = 48 }: ContactAvatarProps) {
  const theme = useTheme();
  const imageCandidates = useMemo(
    () => [imageUri, fallbackImageUri].filter((x): x is string => !!x && x.length > 0),
    [imageUri, fallbackImageUri]
  );
  const [imageIndex, setImageIndex] = useState(0);

  useEffect(() => {
    setImageIndex(0);
  }, [imageUri, fallbackImageUri]);

  const activeImageUri = imageCandidates[imageIndex];

  if (activeImageUri) {
    return (
      <Image
        source={{ uri: activeImageUri }}
        style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
        onError={() => {
          if (imageIndex + 1 < imageCandidates.length) {
            setImageIndex(imageIndex + 1);
          }
        }}
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
