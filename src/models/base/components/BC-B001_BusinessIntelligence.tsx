/**
 * BC-B001_BusinessIntelligence - Universal business intelligence component
 * Component Reference: BC-B001
 * 
 * Universal BI component that provides consistent analytics and reporting
 * functionality across all models with charts, metrics, and insights
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const { width: screenWidth } = Dimensions.get('window');

export interface MetricCard {
  id: string;
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  color: string;
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    percentage: number;
    period: string;
  };
  onPress?: () => void;
}

export interface ChartData {
  id: string;
  title: string;
  type: 'line' | 'bar' | 'pie' | 'donut';
  data: any[];
  color?: string;
  height?: number;
}

export interface InsightCard {
  id: string;
  title: string;
  description: string;
  type: 'info' | 'warning' | 'success' | 'error';
  actionLabel?: string;
  onAction?: () => void;
}

interface BusinessIntelligenceProps {
  modelName: string;
  recordId?: number;
  metrics: MetricCard[];
  charts?: ChartData[];
  insights?: InsightCard[];
  loading?: boolean;
  onRefresh?: () => void;
  onMetricPress?: (metric: MetricCard) => void;
  onChartPress?: (chart: ChartData) => void;
}

/**
 * BC-B001: Universal Business Intelligence Component
 * 
 * Features:
 * - Dynamic metrics cards with trends
 * - Multiple chart types support
 * - AI-powered insights and recommendations
 * - Responsive grid layout
 * - Pull-to-refresh functionality
 * - Interactive elements with drill-down
 */
export default function BusinessIntelligence({
  modelName,
  recordId,
  metrics,
  charts = [],
  insights = [],
  loading = false,
  onRefresh,
  onMetricPress,
  onChartPress,
}: BusinessIntelligenceProps) {
  const [refreshing, setRefreshing] = useState(false);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    if (onRefresh) {
      setRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    }
  }, [onRefresh]);

  // Render metric card
  const renderMetricCard = useCallback((metric: MetricCard) => {
    const getTrendIcon = () => {
      if (!metric.trend) return null;
      switch (metric.trend.direction) {
        case 'up':
          return 'trending-up';
        case 'down':
          return 'trending-down';
        default:
          return 'trending-flat';
      }
    };

    const getTrendColor = () => {
      if (!metric.trend) return '#8E8E93';
      switch (metric.trend.direction) {
        case 'up':
          return '#34C759';
        case 'down':
          return '#FF3B30';
        default:
          return '#8E8E93';
      }
    };

    return (
      <TouchableOpacity
        key={metric.id}
        style={[styles.metricCard, { borderLeftColor: metric.color }]}
        onPress={() => onMetricPress?.(metric)}
        disabled={!metric.onPress && !onMetricPress}
      >
        <View style={styles.metricHeader}>
          <MaterialIcons name={metric.icon as any} size={24} color={metric.color} />
          <Text style={styles.metricTitle}>{metric.title}</Text>
        </View>
        
        <Text style={styles.metricValue}>{metric.value}</Text>
        
        {metric.subtitle && (
          <Text style={styles.metricSubtitle}>{metric.subtitle}</Text>
        )}
        
        {metric.trend && (
          <View style={styles.trendContainer}>
            <MaterialIcons
              name={getTrendIcon() as any}
              size={16}
              color={getTrendColor()}
            />
            <Text style={[styles.trendText, { color: getTrendColor() }]}>
              {metric.trend.percentage}% {metric.trend.period}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }, [onMetricPress]);

  // Render chart placeholder
  const renderChart = useCallback((chart: ChartData) => (
    <TouchableOpacity
      key={chart.id}
      style={[styles.chartCard, { height: chart.height || 200 }]}
      onPress={() => onChartPress?.(chart)}
    >
      <View style={styles.chartHeader}>
        <Text style={styles.chartTitle}>{chart.title}</Text>
        <MaterialIcons name="bar-chart" size={20} color="#8E8E93" />
      </View>
      
      <View style={styles.chartPlaceholder}>
        <MaterialIcons name="insert-chart" size={48} color="#C7C7CC" />
        <Text style={styles.chartPlaceholderText}>
          {chart.type.toUpperCase()} Chart
        </Text>
        <Text style={styles.chartDataText}>
          {chart.data.length} data points
        </Text>
      </View>
    </TouchableOpacity>
  ), [onChartPress]);

  // Render insight card
  const renderInsight = useCallback((insight: InsightCard) => {
    const getInsightColor = () => {
      switch (insight.type) {
        case 'success':
          return '#34C759';
        case 'warning':
          return '#FF9500';
        case 'error':
          return '#FF3B30';
        default:
          return '#007AFF';
      }
    };

    const getInsightIcon = () => {
      switch (insight.type) {
        case 'success':
          return 'check-circle';
        case 'warning':
          return 'warning';
        case 'error':
          return 'error';
        default:
          return 'info';
      }
    };

    return (
      <View key={insight.id} style={[styles.insightCard, { borderLeftColor: getInsightColor() }]}>
        <View style={styles.insightHeader}>
          <MaterialIcons
            name={getInsightIcon() as any}
            size={20}
            color={getInsightColor()}
          />
          <Text style={styles.insightTitle}>{insight.title}</Text>
        </View>
        
        <Text style={styles.insightDescription}>{insight.description}</Text>
        
        {insight.actionLabel && insight.onAction && (
          <TouchableOpacity style={styles.insightAction} onPress={insight.onAction}>
            <Text style={[styles.insightActionText, { color: getInsightColor() }]}>
              {insight.actionLabel}
            </Text>
            <MaterialIcons name="arrow-forward" size={16} color={getInsightColor()} />
          </TouchableOpacity>
        )}
      </View>
    );
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <ScrollView
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#007AFF"
          />
        ) : undefined
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Business Intelligence</Text>
        <Text style={styles.headerSubtitle}>
          {recordId ? `${modelName} #${recordId}` : modelName}
        </Text>
      </View>

      {/* Metrics Grid */}
      {metrics.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Metrics</Text>
          <View style={styles.metricsGrid}>
            {metrics.map(renderMetricCard)}
          </View>
        </View>
      )}

      {/* Charts */}
      {charts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Analytics</Text>
          {charts.map(renderChart)}
        </View>
      )}

      {/* Insights */}
      {insights.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Insights</Text>
          {insights.map(renderInsight)}
        </View>
      )}

      {/* Empty State */}
      {metrics.length === 0 && charts.length === 0 && insights.length === 0 && (
        <View style={styles.emptyState}>
          <MaterialIcons name="analytics" size={64} color="#C7C7CC" />
          <Text style={styles.emptyTitle}>No Analytics Available</Text>
          <Text style={styles.emptySubtitle}>
            Analytics data will appear here when available
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  content: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 12,
  },
  header: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  metricsGrid: {
    paddingHorizontal: 16,
    gap: 12,
  },
  metricCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
    marginLeft: 8,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  metricSubtitle: {
    fontSize: 12,
    color: '#8E8E93',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  chartPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartPlaceholderText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
    marginTop: 8,
  },
  chartDataText: {
    fontSize: 12,
    color: '#C7C7CC',
    marginTop: 4,
  },
  insightCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginLeft: 8,
  },
  insightDescription: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
  },
  insightAction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  insightActionText: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#C7C7CC',
    textAlign: 'center',
    marginTop: 8,
  },
});
