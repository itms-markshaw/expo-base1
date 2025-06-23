/**
 * Custom Bottom Navigation Component
 * Shows on all screens to maintain consistent navigation
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppNavigation } from './AppNavigationProvider';

interface NavItem {
  id: string;
  name: string;
  icon: string;
  screenName: string;
}

interface CustomBottomNavigationProps {
  currentScreen?: string;
}

export default function CustomBottomNavigation({ currentScreen }: CustomBottomNavigationProps) {
  const { navigateToScreen } = useAppNavigation();

  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      name: 'Dashboard',
      icon: 'dashboard',
      screenName: 'Dashboard',
    },
    {
      id: 'sales',
      name: 'Sales',
      icon: 'shopping-cart',
      screenName: 'Sales Orders',
    },
    {
      id: 'contacts',
      name: 'Contacts',
      icon: 'people',
      screenName: 'Contacts',
    },
    {
      id: 'calendar',
      name: 'Calendar',
      icon: 'calendar-today',
      screenName: 'Calendar',
    },
    {
      id: 'more',
      name: 'More',
      icon: 'more-horiz',
      screenName: 'More',
    },
  ];

  const handleNavPress = (item: NavItem) => {
    navigateToScreen(item.screenName);
  };

  const isActive = (item: NavItem) => {
    if (!currentScreen) return false;

    // Map current screen to nav items
    const screenMapping: Record<string, string> = {
      'Dashboard': 'dashboard',
      'CleanNavigationScreen': 'dashboard',
      'Sales Orders': 'sales',
      'SalesOrderScreen': 'sales',
      'Sales': 'sales',
      'Contacts': 'contacts',
      'ContactsScreen': 'contacts',
      'Calendar': 'calendar',
      'CalendarScreen': 'calendar',
      // All other screens map to 'more'
      'Activities': 'more',
      'ActivitiesScreen': 'more',
      'Messages': 'more',
      'MessagesScreen': 'more',
      'Attachments': 'more',
      'AttachmentsScreen': 'more',
      'Projects': 'more',
      'ProjectsScreen': 'more',
      'Helpdesk': 'more',
      'HelpdeskScreen': 'more',
      'Employees': 'more',
      'EmployeesScreen': 'more',
      'CRM': 'more',
      'CRMLeads': 'more',
      'CRMLeadsScreen': 'more',
      'Mobile': 'more',
      'MobileScreen': 'more',
      'Settings': 'more',
      'SettingsScreen': 'more',
      'Sync': 'more',
      'SyncScreen': 'more',
      'Data': 'more',
      'DataScreen': 'more',
      'Testing': 'more',
      'TestScreen': 'more',
      'Documentation': 'more',
      'More': 'more',
      'MoreTabScreen': 'more',
    };

    return screenMapping[currentScreen] === item.id;
  };

  return (
    <View style={styles.container}>
      {navItems.map((item) => {
        const active = isActive(item);
        return (
          <TouchableOpacity
            key={item.id}
            style={styles.navItem}
            onPress={() => handleNavPress(item)}
          >
            <MaterialIcons
              name={item.icon as any}
              size={24}
              color={active ? '#007AFF' : '#8E8E93'}
            />
            <Text style={[styles.navText, active && styles.navTextActive]}>
              {item.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopColor: '#E5E5E5',
    borderTopWidth: 1,
    paddingBottom: Platform.OS === 'ios' ? 20 : 5,
    paddingTop: 8,
    height: Platform.OS === 'ios' ? 85 : 60,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  navText: {
    fontSize: 10,
    color: '#8E8E93',
    marginTop: 2,
    fontWeight: '500',
  },
  navTextActive: {
    color: '#007AFF',
  },
});
