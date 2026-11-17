/**
 * FoodBridge - Filter Kategori Marker Peta
 * Memfilter tampilan Donatur Surplus Makanan vs Penerima Manfaat
 */

import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MarkerFilterCategory } from '../../types/foodRescue';

interface FilterPillsProps {
  activeFilter: MarkerFilterCategory;
  onSelectFilter: (filter: MarkerFilterCategory) => void;
  donorCount: number;
  recipientCount: number;
}

export const FilterPills: React.FC<FilterPillsProps> = ({
  activeFilter,
  onSelectFilter,
  donorCount,
  recipientCount,
}) => {
  const totalCount = donorCount + recipientCount;

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Filter: Semua */}
        <TouchableOpacity
          style={[
            styles.pill,
            activeFilter === 'ALL' ? styles.activePillAll : styles.inactivePill,
          ]}
          onPress={() => onSelectFilter('ALL')}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name="layers-outline"
            size={14}
            color={activeFilter === 'ALL' ? '#FFFFFF' : '#475569'}
          />
          <Text
            style={[
              styles.pillText,
              activeFilter === 'ALL' ? styles.activeText : styles.inactiveText,
            ]}
          >
            Semua ({totalCount})
          </Text>
        </TouchableOpacity>

        {/* Filter: Donatur */}
        <TouchableOpacity
          style={[
            styles.pill,
            activeFilter === 'DONOR' ? styles.activePillDonor : styles.inactivePill,
          ]}
          onPress={() => onSelectFilter('DONOR')}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name="food-apple-outline"
            size={14}
            color={activeFilter === 'DONOR' ? '#FFFFFF' : '#059669'}
          />
          <Text
            style={[
              styles.pillText,
              activeFilter === 'DONOR' ? styles.activeText : styles.inactiveText,
            ]}
          >
            Donatur Surplus ({donorCount})
          </Text>
        </TouchableOpacity>

        {/* Filter: Penerima */}
        <TouchableOpacity
          style={[
            styles.pill,
            activeFilter === 'RECIPIENT' ? styles.activePillRecipient : styles.inactivePill,
          ]}
          onPress={() => onSelectFilter('RECIPIENT')}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name="hand-heart-outline"
            size={14}
            color={activeFilter === 'RECIPIENT' ? '#FFFFFF' : '#EA580C'}
          />
          <Text
            style={[
              styles.pillText,
              activeFilter === 'RECIPIENT' ? styles.activeText : styles.inactiveText,
            ]}
          >
            Penerima Manfaat ({recipientCount})
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
  },
  scrollContent: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  inactivePill: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  activePillAll: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  activePillDonor: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  activePillRecipient: {
    backgroundColor: '#EA580C',
    borderColor: '#EA580C',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 5,
  },
  activeText: {
    color: '#FFFFFF',
  },
  inactiveText: {
    color: '#334155',
  },
});
