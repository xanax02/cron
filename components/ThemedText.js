import React from 'react';
import { Text, StyleSheet } from 'react-native';

export const ThemedText = ({ children, style, type, ...props }) => {
  const textStyle = [
    styles.defaultText,
    type === 'title' && styles.title,
    type === 'subtitle' && styles.subtitle,
    style
  ];

  return (
    <Text style={textStyle} {...props}>
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  defaultText: {
    fontSize: 16,
    color: '#333',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    marginVertical: 4,
  },
});

export default ThemedText;
