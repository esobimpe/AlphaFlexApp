import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import BottomNav from '../components/BottomNav';

const { width } = Dimensions.get('window');
const API_URL = 'http://192.168.4.24:5001';

const CongratulationScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { amount, holdings, fromVerification, totalInvested: existingTotal } = route.params;
  const [totalInvested, setTotalInvested] = useState(fromVerification ? existingTotal : 0);
  const [currentHoldings, setCurrentHoldings] = useState([]);
  const [performanceChange, setPerformanceChange] = useState(0);
  const [showNavBar, setShowNavBar] = useState(false);
  const [isSoldOut, setIsSoldOut] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [buyingPower, setBuyingPower] = useState(0);

  useEffect(() => {
    console.log('Route params:', route.params);
    updateInvestmentData();
    fetchUserData();
    fetchPerformance();

    // Set up interval for periodic updates of buying power
    const intervalId = setInterval(fetchUserData, 30000); // Update every 30 seconds

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  const fetchUserData = async () => {
    try {
      // Get current user email
      const currentUserEmail = await AsyncStorage.getItem('currentUserEmail');
      if (!currentUserEmail) {
        console.error('No current user email found');
        return;
      }

      // Get user data from API
      try {
        const response = await fetch(`${API_URL}/api/user/${currentUserEmail}`);
        if (response.ok) {
          const userData = await response.json();
          console.log('Latest user data from API:', userData);
          if (userData && userData.availableBalance !== undefined) {
            // Set from API
            setBuyingPower(userData.availableBalance);
            
            // ALSO update the robinhoodUser in AsyncStorage to ensure both screens use the same value
            const robinhoodUserStr = await AsyncStorage.getItem('robinhoodUser');
            if (robinhoodUserStr) {
              const robinhoodUser = JSON.parse(robinhoodUserStr);
              robinhoodUser.buyingPower = userData.availableBalance;
              await AsyncStorage.setItem('robinhoodUser', JSON.stringify(robinhoodUser));
            }
          }
        } else {
          console.error('Failed to fetch user data from API');
          
          // Fallback to AsyncStorage
          const robinhoodUserStr = await AsyncStorage.getItem('robinhoodUser');
          if (robinhoodUserStr) {
            const robinhoodUser = JSON.parse(robinhoodUserStr);
            setBuyingPower(robinhoodUser.buyingPower || 0);
          }
        }
      } catch (error) {
        console.error('Error fetching user data from API:', error);
        
        // Fallback to AsyncStorage
        const robinhoodUserStr = await AsyncStorage.getItem('robinhoodUser');
        if (robinhoodUserStr) {
          const robinhoodUser = JSON.parse(robinhoodUserStr);
          setBuyingPower(robinhoodUser.buyingPower || 0);
        }
      }

      // Get user's first name
      const robinhoodUserStr = await AsyncStorage.getItem('robinhoodUser');
      if (robinhoodUserStr) {
        const robinhoodUser = JSON.parse(robinhoodUserStr);
        setFirstName(robinhoodUser.user?.first_name || '');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const updateInvestmentData = async () => {
    try {
      const currentUserEmail = await AsyncStorage.getItem('currentUserEmail');
      if (!currentUserEmail) {
        console.error('No current user email found');
        return;
      }

      const usersData = await AsyncStorage.getItem('usersData');
      let users = usersData ? JSON.parse(usersData) : {};
      
      let userData = users[currentUserEmail] || {
        isInvested: false,
        totalInvested: 0,
        holdings: []
      };

      const updatedTotalInvested = fromVerification 
        ? existingTotal 
        : (userData.totalInvested || 0) + amount;

      console.log('Updating total invested to:', updatedTotalInvested);
      setTotalInvested(updatedTotalInvested);
      userData.totalInvested = updatedTotalInvested;

      const existingHoldings = userData.holdings || [];
      const existingStocksMap = new Map(
        existingHoldings.map(holding => [holding.Stock, holding])
      );

      let updatedHoldings = [...existingHoldings];
      
      if (!fromVerification) {
        holdings.forEach(newHolding => {
          const existingHolding = existingStocksMap.get(newHolding.Stock);
          if (!existingHolding) {
            updatedHoldings.push(newHolding);
          }
        });
      } else {
        updatedHoldings = existingHoldings;
      }

      setCurrentHoldings(updatedHoldings);
      userData.holdings = updatedHoldings;
      userData.isInvested = true;
      userData.isSoldOut = false;
      setShowNavBar(true);
      setIsSoldOut(false);

      users[currentUserEmail] = userData;
      await AsyncStorage.setItem('usersData', JSON.stringify(users));

      // Update API storage
      try {
        await fetch(`${API_URL}/api/user/update`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: currentUserEmail,
            userData: {
              ...userData,
              lastUpdated: new Date().toISOString()
            }
          })
        });
      } catch (error) {
        console.error('Error updating API storage:', error);
      }
    } catch (error) {
      console.error('Error updating investment data:', error);
    }
  };

  const fetchPerformance = async () => {
    try {
      const response = await fetch(`${API_URL}/performance`);
      const data = await response.json();
      if (data?.performance?.data) {
        console.log('Setting performance change to:', data.performance.data[0]);
        setPerformanceChange(data.performance.data[0]);
      }
    } catch (error) {
      console.error('Error fetching performance:', error);
    }
  };

  const handleBuyMore = () => {
    // Show reauthentication alert
    Alert.alert(
      "Authentication Required",
      "For security reasons, we need to verify your identity before proceeding with additional investments.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Continue",
          onPress: async () => {
            try {
              // Clear the existing Robinhood auth data to force login
              await AsyncStorage.removeItem('robinhoodAuthData');
              
              // Store the current investment state so we can retrieve it after login
              await AsyncStorage.setItem('pendingInvestmentState', JSON.stringify({
                totalInvested,
                holdings: currentHoldings,
                timestamp: new Date().toISOString()
              }));
              
              // Just navigate to RobinhoodLogin - it will handle the flow to Allocation
              navigation.navigate('RobinhoodLogin');
            } catch (error) {
              console.error('Error preparing for reauthentication:', error);
              Alert.alert('Error', 'Something went wrong. Please try again.');
            }
          }
        }
      ]
    );
  };

  const clearAllStorageData = async () => {
    try {
      const currentUserEmail = await AsyncStorage.getItem('currentUserEmail');
      if (!currentUserEmail) return;

      await AsyncStorage.removeItem('robinhoodAuthData');
      await AsyncStorage.removeItem('robinhoodUser');
      await AsyncStorage.removeItem('biometricEmail');

      // Update user data in both AsyncStorage and API
      const usersData = await AsyncStorage.getItem('usersData');
      if (usersData) {
        const users = JSON.parse(usersData);
        if (users[currentUserEmail]) {
          const updatedUserData = {
            ...users[currentUserEmail],
            isInvested: false,
            isSoldOut: true,
            totalInvested: 0,
            holdings: []
          };

          users[currentUserEmail] = updatedUserData;
          await AsyncStorage.setItem('usersData', JSON.stringify(users));

          // Update API
          try {
            await fetch(`${API_URL}/api/user/update`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                email: currentUserEmail,
                userData: {
                  ...updatedUserData,
                  lastUpdated: new Date().toISOString()
                }
              })
            });
          } catch (error) {
            console.error('Error updating API storage during sell:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error clearing storage data:', error);
      throw error;
    }
  };

  const handleSellAll = () => {
    Alert.alert(
      'Confirm Sell All',
      'Are you sure you want to sell your entire portfolio?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'OK',
          onPress: async () => {
            try {
              await clearAllStorageData();
              
              setIsSoldOut(true);
              setCurrentHoldings([]);
              setTotalInvested(0);
              setBuyingPower(0);

              navigation.reset({
                index: 0,
                routes: [{ 
                  name: 'PortfolioList'
                }]
              });
            } catch (error) {
              console.error('Error processing sell order:', error);
              Alert.alert('Error', 'Failed to process your sell order. Please try again.');
            }
          }
        }
      ]
    );
  };

  const calculateAllocation = (percentage) => {
    return (parseFloat(percentage) / 100) * (totalInvested);
  };

  const calculateCurrentValue = () => {
    // If there are no holdings, the current value is 0
    if (!currentHoldings || currentHoldings.length === 0) {
      return 0;
    }
    
    // Apply any performance changes to the total invested
    // This simulates how the actual stocks would perform in the real market
    const performanceMultiplier = 1 + (performanceChange / 100);
    return totalInvested * performanceMultiplier;
  };

  const calculateReturn = () => {
    const currentValue = calculateCurrentValue();
    const returnValue = (currentValue - totalInvested) / totalInvested * 100;
    return returnValue.toFixed(2);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.congratsTitle}>Congrats, {firstName}</Text>
      <Text style={styles.subtitle}>
        {isSoldOut
          ? "You've sold out of AlphaFlex Portfolio"
          : "You are now invested in AlphaFlex Portfolio"}
      </Text>

      <LinearGradient
        colors={['#000', '#333']}
        style={styles.card}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.cardContent}>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Total Invested</Text>
            <Text style={styles.cardValue}>${totalInvested.toFixed(2)}</Text>
          </View>

          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Current Value</Text>
            <Text style={styles.cardValue}>${calculateCurrentValue().toFixed(2)}</Text>
          </View>

          <View style={[styles.cardRow, styles.cardDivider]} />

          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Return (%)</Text>
            <Text style={[
              styles.cardValue,
              parseFloat(calculateReturn()) >= 0 ? styles.positiveChange : styles.negativeChange
            ]}>
              {parseFloat(calculateReturn()) >= 0 ? '+' : ''}{calculateReturn()}%
            </Text>
          </View>
        </View>
      </LinearGradient>

      {!isSoldOut && (
        <ScrollView style={styles.holdingsList}>
          <Text style={styles.listTitle}>Order list</Text>
          {currentHoldings.map((holding, index) => (
            <View key={index} style={styles.holdingItem}>
              <Text style={styles.stockName}>{holding.Stock}</Text>
              <View style={styles.allocationContainer}>
                <Text style={styles.percentage}>
                  {holding['Stock Allocation Weight (%)']}%
                </Text>
                <Text style={styles.allocationAmount}>
                  ${calculateAllocation(holding['Stock Allocation Weight (%)']).toFixed(2)}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <View style={[styles.actionButtons, showNavBar && { paddingBottom: 80 }]}>
        <TouchableOpacity
          style={[styles.button, styles.buyMoreButton]}
          onPress={handleBuyMore}
        >
          <Text style={styles.buyMoreButtonText}>Buy More</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.button,
            styles.sellAllButton,
            isSoldOut && styles.disabledButton
          ]}
          onPress={handleSellAll}
          disabled={isSoldOut}
        >
          <Text style={[
            styles.sellAllButtonText,
            isSoldOut && styles.disabledButtonText
          ]}>
            Sell All
          </Text>
        </TouchableOpacity>
      </View>
      <BottomNav />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  congratsTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 100,
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 30,
  },
  card: {
    width: width - 40,
    alignSelf: 'center',
    borderRadius: 20,
    padding: 30,
    marginBottom: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  cardContent: {
    width: '100%',
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  cardLabel: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.8,
  },
  cardValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  cardDivider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    marginVertical: 5,
  },
  positiveChange: {
    color: '#4CAF50',
  },
  negativeChange: {
    color: '#FF3B30',
  },
  holdingsList: {
    flex: 1,
    paddingHorizontal: 20,
    marginBottom: 180,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#333',
  },
  holdingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  stockName: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  allocationContainer: {
    alignItems: 'flex-end',
  },
  percentage: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  allocationAmount: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 20,
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 4,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  buyMoreButton: {
    backgroundColor: '#000',
  },
  sellAllButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#000',
  },
  disabledButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  buyMoreButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sellAllButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButtonText: {
    color: '#888',
  }
});

export default CongratulationScreen;