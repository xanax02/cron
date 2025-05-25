import React from 'react';
import { View, StyleSheet } from 'react-native';

export const ThemedView = ({ children, style, ...props }) => {
  return (
    <View style={[styles.container, style]} {...props}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8F9FA',
  },
});

export default ThemedView;
