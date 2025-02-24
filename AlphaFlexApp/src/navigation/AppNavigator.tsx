import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import WelcomeScreen from '../screens/WelcomeScreen';
import EmailVerificationScreen from '../screens/EmailVerificationScreen';
import WelcomeMessageScreen from '../screens/WelcomeMessageScreen';
import PortfolioListScreen from '../screens/PortfolioListScreen';
import PortfolioDetailsScreen from '../screens/PortfolioDetailsScreen';
import ConnectBrokerScreen from '../screens/ConnectBrokerScreen';
import AutopilotConnectionScreen from '../screens/AutopilotConnectionScreen';
import RobinhoodLoginScreen from '../screens/RobinhoodLoginScreen';
import AllocationScreen from '../screens/AllocationScreen';
import OrderScreen from '../screens/OrderScreen';
import CongratulationScreen from '../screens/CongratulationScreen';

const Stack = createStackNavigator();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: 'white' },
          headerTintColor: 'black',
        }}
      >
        <Stack.Screen
          name="Welcome"
          component={WelcomeScreen}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="EmailVerification"
          component={EmailVerificationScreen}
          options={{
            title: 'Email Verification',
            headerLeft: () => <BackButton />,
          }}
        />

        <Stack.Screen
          name="WelcomeMessage"
          component={WelcomeMessageScreen}
          options={{
            title: 'Welcome to AlphaFlex',
            headerLeft: () => <BackButton />,
          }}
        />

        <Stack.Screen
          name="PortfolioList"
          component={PortfolioListScreen}
          options={{
            title: 'Portfolio List',
            headerLeft: () => <BackButton />,
          }}
        />

        <Stack.Screen
          name="PortfolioDetails"
          component={PortfolioDetailsScreen}
          options={{
            title: 'Portfolio Details',
            headerLeft: () => <BackButton />,
          }}
        />

        <Stack.Screen
          name="ConnectBroker"
          component={ConnectBrokerScreen}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="AutopilotConnection"
          component={AutopilotConnectionScreen}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="RobinhoodLogin"
          component={RobinhoodLoginScreen}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="Allocation"
          component={AllocationScreen}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="Order"
          component={OrderScreen}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="Congratulation"
          component={CongratulationScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const BackButton = () => {
  const navigation = useNavigation();

  const handleBackPress = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Welcome');
    }
  };

  return (
    <TouchableOpacity
      style={styles.backButton}
      onPress={handleBackPress}
    >
      <Text style={styles.backButtonText}>Back</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  backButton: {
    marginLeft: 15,
    padding: 10,
    backgroundColor: 'white',
    borderRadius: 5,
  },
  backButtonText: {
    color: 'black',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AppNavigator;