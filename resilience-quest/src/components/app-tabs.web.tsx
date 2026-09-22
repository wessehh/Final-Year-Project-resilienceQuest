import { Tabs } from 'expo-router';
import React from 'react';
import { Text } from 'react-native';

export default function AppTabsWeb() {
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
        name="guides"
        options={{
          title: 'Guides',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 16 }}>📖</Text>,
        }}
      />
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