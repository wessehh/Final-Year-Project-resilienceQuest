import { Tabs } from 'expo-router';
import React from 'react';
import { Text } from 'react-native';
import { useApp } from '@/context/AppContext';

export default function AppTabs() {
  const { isEmergencyActive } = useApp();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#3182ce',
        tabBarInactiveTintColor: '#a0aec0',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#e2e8f0',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 16 }}>🏠</Text>,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 16 }}>🧭</Text>,
        }}
      />
      <Tabs.Screen
        name="aed-search"
        options={{
          title: 'AED Search',
          tabBarIcon: () => <Text style={{ fontSize: 18 }}>⚡</Text>,
        }}
      />
      
      {/* Arcade Tab — hidden during crisis mode */}
      <Tabs.Screen
        name="game"
        options={{
          title: 'Arcade',
          href: isEmergencyActive ? null : '/game',
          tabBarItemStyle: isEmergencyActive ? { display: 'none' } : undefined,
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 16 }}>🎮</Text>,
        }}
      />
      
      <Tabs.Screen
        name="guides"
        options={{
          title: 'Guides',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 16 }}>📖</Text>,
        }}
      />

      {/* Standalone Developer & Evaluator Demo Tab */}
      <Tabs.Screen
        name="dev"
        options={{
          title: 'Demo Suite',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 16 }}>🛠️</Text>,
        }}
      />
    </Tabs>
  );
}