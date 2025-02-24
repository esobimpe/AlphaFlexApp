import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useInvestment } from '../hooks/useInvestment';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BottomNav = () => {
  const navigation = useNavigation();
  const { investmentStatus, loading } = useInvestment();
  const [isCurrentlyInvested, setIsCurrentlyInvested] = useState(false);

  useEffect(() => {
    checkCurrentInvestmentStatus();
  }, []);

  const checkCurrentInvestmentStatus = async () => {
    try {
      const currentUserEmail = await AsyncStorage.getItem('currentUserEmail');
      if (!currentUserEmail) return;

      const usersData = await AsyncStorage.getItem('usersData');
      const users = usersData ? JSON.parse(usersData) : {};
      const userData = users[currentUserEmail];

      setIsCurrentlyInvested(userData?.isInvested && userData?.totalInvested > 0);
    } catch (error) {
      console.error('Error checking investment status:', error);
    }
  };

  const handleHomePress = async () => {
    try {
      const currentUserEmail = await AsyncStorage.getItem('currentUserEmail');
      if (!currentUserEmail) return;

      const usersData = await AsyncStorage.getItem('usersData');
      const users = usersData ? JSON.parse(usersData) : {};
      const userData = users[currentUserEmail];

      // Only navigate to Congratulation if user is actually invested
      if (userData?.isInvested && userData?.totalInvested > 0) {
        navigation.navigate('Congratulation', {
          amount: 0,
          holdings: userData.holdings,
          fromVerification: true,
          totalInvested: userData.totalInvested,
          availableBalance: userData.availableBalance
        });
      } else {
        // If not invested, navigate to PortfolioList
        navigation.navigate('PortfolioList');
      }
    } catch (error) {
      console.error('Error navigating:', error);
      navigation.navigate('PortfolioList');
    }
  };

  if (loading) return null;

  return (
    <View style={styles.navBar}>
      <TouchableOpacity 
        style={styles.navItem}
        onPress={handleHomePress}
      >
        <Ionicons name="home-outline" size={28} color="black" />
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.navItem}
        onPress={() => navigation.navigate('PortfolioList')}
      >
        <Ionicons name="list-outline" size={28} color="black" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.navItem}>
        <Ionicons name="person-outline" size={28} color="black" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    height: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    paddingHorizontal: 20,
    zIndex: 1000,
  },
  navItem: {
    padding: 10,
  },
});

export default BottomNav;