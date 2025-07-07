/**
 * BC-U001_UniversalSearch - Universal search component
 * Component Reference: BC-U001
 * 
 * Universal search component that provides consistent search functionality
 * across all models with AI-powered suggestions and advanced filtering
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  modelName: string;
  recordId: number;
  icon?: string;
  imageUrl?: string;
  relevanceScore?: number;
  onPress: () => void;
}

export interface SearchFilter {
  key: string;
  label: string;
  active: boolean;
  count?: number;
}

export interface SearchSuggestion {
  id: string;
  text: string;
  type: 'recent' | 'popular' | 'ai' | 'completion';
  icon?: string;
  onPress: () => void;
}

interface UniversalSearchProps {
  visible: boolean;
  onClose: () => void;
  placeholder?: string;
  initialQuery?: string;
  results: SearchResult[];
  suggestions: SearchSuggestion[];
  filters: SearchFilter[];
  loading?: boolean;
  onSearch: (query: string) => void;
  onFilterChange: (filters: SearchFilter[]) => void;
  onClearHistory?: () => void;
  enableVoiceSearch?: boolean;
  enableAISuggestions?: boolean;
}

/**
 * BC-U001: Universal Search Component
 * 
 * Features:
 * - Global search across all models
 * - AI-powered search suggestions
 * - Real-time search results
 * - Advanced filtering options
 * - Voice search support
 * - Search history and popular searches
 * - Responsive modal design
 */
export default function UniversalSearch({
  visible,
  onClose,
  placeholder = 'Search everything...',
  initialQuery = '',
  results,
  suggestions,
  filters,
  loading = false,
  onSearch,
  onFilterChange,
  onClearHistory,
  enableVoiceSearch = false,
  enableAISuggestions = true,
}: UniversalSearchProps) {
  const [query, setQuery] = useState(initialQuery);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const inputRef = useRef<TextInput>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      setQuery(initialQuery);
    }
  }, [visible, initialQuery]);

  // Handle search input changes
  const handleQueryChange = useCallback((text: string) => {
    setQuery(text);
    setShowSuggestions(text.length === 0);
    
    // Debounce search
    const timeoutId = setTimeout(() => {
      onSearch(text);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [onSearch]);

  // Handle search submission
  const handleSearch = useCallback((searchQuery?: string) => {
    const finalQuery = searchQuery || query;
    if (finalQuery.trim()) {
      setShowSuggestions(false);
      onSearch(finalQuery.trim());
    }
  }, [query, onSearch]);

  // Handle suggestion press
  const handleSuggestionPress = useCallback((suggestion: SearchSuggestion) => {
    setQuery(suggestion.text);
    setShowSuggestions(false);
    suggestion.onPress();
  }, []);

  // Handle filter toggle
  const handleFilterToggle = useCallback((filterKey: string) => {
    const updatedFilters = filters.map(filter => 
      filter.key === filterKey 
        ? { ...filter, active: !filter.active }
        : filter
    );
    onFilterChange(updatedFilters);
  }, [filters, onFilterChange]);

  // Clear search
  const handleClear = useCallback(() => {
    setQuery('');
    setShowSuggestions(true);
    onSearch('');
  }, [onSearch]);

  // Render search suggestion
  const renderSuggestion = useCallback((suggestion: SearchSuggestion) => {
    const getSuggestionIcon = () => {
      switch (suggestion.type) {
        case 'recent':
          return 'history';
        case 'popular':
          return 'trending-up';
        case 'ai':
          return 'auto-awesome';
        default:
          return 'search';
      }
    };

    return (
      <TouchableOpacity
        key={suggestion.id}
        style={styles.suggestionItem}
        onPress={() => handleSuggestionPress(suggestion)}
      >
        <MaterialIcons
          name={suggestion.icon || getSuggestionIcon() as any}
          size={20}
          color="#8E8E93"
        />
        <Text style={styles.suggestionText}>{suggestion.text}</Text>
        {suggestion.type === 'ai' && (
          <View style={styles.aiTag}>
            <Text style={styles.aiTagText}>AI</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }, [handleSuggestionPress]);

  // Render search result
  const renderResult = useCallback((result: SearchResult) => (
    <TouchableOpacity
      key={result.id}
      style={styles.resultItem}
      onPress={result.onPress}
    >
      <View style={styles.resultIcon}>
        <MaterialIcons
          name={result.icon || 'description' as any}
          size={24}
          color="#007AFF"
        />
      </View>
      
      <View style={styles.resultContent}>
        <Text style={styles.resultTitle} numberOfLines={1}>
          {result.title}
        </Text>
        {result.subtitle && (
          <Text style={styles.resultSubtitle} numberOfLines={1}>
            {result.subtitle}
          </Text>
        )}
        {result.description && (
          <Text style={styles.resultDescription} numberOfLines={2}>
            {result.description}
          </Text>
        )}
        <Text style={styles.resultModel}>{result.modelName}</Text>
      </View>
      
      {result.relevanceScore && (
        <View style={styles.relevanceScore}>
          <Text style={styles.relevanceText}>
            {Math.round(result.relevanceScore * 100)}%
          </Text>
        </View>
      )}
    </TouchableOpacity>
  ), []);

  // Render filter chip
  const renderFilter = useCallback((filter: SearchFilter) => (
    <TouchableOpacity
      key={filter.key}
      style={[
        styles.filterChip,
        filter.active && styles.activeFilterChip
      ]}
      onPress={() => handleFilterToggle(filter.key)}
    >
      <Text style={[
        styles.filterText,
        filter.active && styles.activeFilterText
      ]}>
        {filter.label}
        {filter.count !== undefined && ` (${filter.count})`}
      </Text>
    </TouchableOpacity>
  ), [handleFilterToggle]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.searchContainer}>
            <MaterialIcons name="search" size={20} color="#8E8E93" />
            <TextInput
              ref={inputRef}
              style={styles.searchInput}
              placeholder={placeholder}
              value={query}
              onChangeText={handleQueryChange}
              onSubmitEditing={() => handleSearch()}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
            {enableVoiceSearch && (
              <TouchableOpacity style={styles.voiceButton}>
                <MaterialIcons name="mic" size={20} color="#007AFF" />
              </TouchableOpacity>
            )}
          </View>
          
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        {/* Filters */}
        {filters.length > 0 && !showSuggestions && (
          <View style={styles.filtersContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filtersList}
            >
              {filters.map(renderFilter)}
            </ScrollView>
          </View>
        )}

        {/* Content */}
        <View style={styles.content}>
          {showSuggestions ? (
            // Suggestions
            <ScrollView style={styles.suggestionsContainer}>
              {enableAISuggestions && suggestions.some(s => s.type === 'ai') && (
                <View style={styles.suggestionSection}>
                  <Text style={styles.sectionTitle}>AI Suggestions</Text>
                  {suggestions.filter(s => s.type === 'ai').map(renderSuggestion)}
                </View>
              )}
              
              {suggestions.some(s => s.type === 'recent') && (
                <View style={styles.suggestionSection}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Recent Searches</Text>
                    {onClearHistory && (
                      <TouchableOpacity onPress={onClearHistory}>
                        <Text style={styles.clearText}>Clear</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  {suggestions.filter(s => s.type === 'recent').map(renderSuggestion)}
                </View>
              )}
              
              {suggestions.some(s => s.type === 'popular') && (
                <View style={styles.suggestionSection}>
                  <Text style={styles.sectionTitle}>Popular Searches</Text>
                  {suggestions.filter(s => s.type === 'popular').map(renderSuggestion)}
                </View>
              )}
            </ScrollView>
          ) : (
            // Results
            <ScrollView style={styles.resultsContainer}>
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#007AFF" />
                  <Text style={styles.loadingText}>Searching...</Text>
                </View>
              ) : results.length > 0 ? (
                <>
                  <Text style={styles.resultsCount}>
                    {results.length} result{results.length !== 1 ? 's' : ''} for "{query}"
                  </Text>
                  {results.map(renderResult)}
                </>
              ) : query.trim() ? (
                <View style={styles.emptyState}>
                  <MaterialIcons name="search-off" size={64} color="#C7C7CC" />
                  <Text style={styles.emptyTitle}>No results found</Text>
                  <Text style={styles.emptySubtitle}>
                    Try adjusting your search or filters
                  </Text>
                </View>
              ) : null}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
    marginLeft: 8,
  },
  voiceButton: {
    padding: 4,
  },
  cancelButton: {
    padding: 4,
  },
  cancelText: {
    fontSize: 16,
    color: '#007AFF',
  },
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  filtersList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  activeFilterChip: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
  },
  activeFilterText: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  suggestionsContainer: {
    flex: 1,
  },
  suggestionSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  clearText: {
    fontSize: 14,
    color: '#007AFF',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 8,
  },
  suggestionText: {
    fontSize: 16,
    color: '#000000',
    marginLeft: 12,
    flex: 1,
  },
  aiTag: {
    backgroundColor: '#007AFF',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  aiTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  resultsContainer: {
    flex: 1,
  },
  resultsCount: {
    fontSize: 14,
    color: '#8E8E93',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  resultIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  resultContent: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  resultSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 2,
  },
  resultDescription: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 18,
    marginBottom: 4,
  },
  resultModel: {
    fontSize: 12,
    color: '#C7C7CC',
    textTransform: 'uppercase',
  },
  relevanceScore: {
    backgroundColor: '#F2F2F7',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  relevanceText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8E8E93',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 12,
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
