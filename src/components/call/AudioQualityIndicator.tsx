import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface AudioQualityIndicatorProps {
  onQualityChange?: (quality: 'excellent' | 'good' | 'poor') => void;
}

export function AudioQualityIndicator({ onQualityChange }: AudioQualityIndicatorProps) {
  const [quality, setQuality] = useState<'excellent' | 'good' | 'poor'>('good');
  const [signalBars, setSignalBars] = useState(3);

  useEffect(() => {
    // Simulate audio quality monitoring
    const interval = setInterval(() => {
      const randomQuality = Math.random();
      let newQuality: 'excellent' | 'good' | 'poor';
      let bars: number;

      if (randomQuality > 0.8) {
        newQuality = 'excellent';
        bars = 4;
      } else if (randomQuality > 0.5) {
        newQuality = 'good';
        bars = 3;
      } else {
        newQuality = 'poor';
        bars = randomQuality > 0.3 ? 2 : 1;
      }

      setQuality(newQuality);
      setSignalBars(bars);
      onQualityChange?.(newQuality);
    }, 5000);

    return () => clearInterval(interval);
  }, [onQualityChange]);

  const getQualityColor = () => {
    switch (quality) {
      case 'excellent': return '#4CAF50';
      case 'good': return '#FF9800';
      case 'poor': return '#F44336';
    }
  };

  return (
    <View style={[styles.container, { borderColor: getQualityColor() }]}>
      <View style={styles.barsContainer}>
        {[1, 2, 3, 4].map((bar) => (
          <View
            key={bar}
            style={[
              styles.bar,
              {
                backgroundColor: bar <= signalBars ? getQualityColor() : 'rgba(255,255,255,0.3)',
                height: bar * 3 + 6,
              },
            ]}
          />
        ))}
      </View>
      <Text style={[styles.text, { color: getQualityColor() }]}>
        {quality}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginRight: 8,
  },
  bar: {
    width: 3,
    marginHorizontal: 1,
    borderRadius: 1.5,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default AudioQualityIndicator;
