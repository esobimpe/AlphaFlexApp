import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

const OrderScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [holdings, setHoldings] = useState([]);
  const { amount } = route.params;

  useEffect(() => {
    const fetchHoldings = async () => {
      try {
        const response = await fetch('http://192.168.4.24:5001/portfolio');
        const data = await response.json();
        setHoldings(data.Holdings);
      } catch (error) {
        console.error('Error fetching holdings:', error);
      }
    };

    fetchHoldings();
  }, []);

  const handlePlaceOrder = async () => {
    try {
      // Save the investment data
      await AsyncStorage.setItem('userData', JSON.stringify({
        isInvested: true,
        investedAmount: amount,
        holdings: holdings,
        email: route.params?.email || ''
      }));

      // Navigate to congratulation screen
      navigation.navigate('Congratulation', {
        amount,
        holdings,
      });
    } catch (error) {
      console.error('Error saving investment data:', error);
      Alert.alert('Error', 'Failed to process your order. Please try again.');
    }
  };

  const calculateAllocation = (percentage) => {
    return (parseFloat(percentage) / 100) * (amount * 0.9); // 90% of allocation amount
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
      </View>

      <View style={styles.amountContainer}>
        <Text style={styles.amountText}>${amount.toFixed(2)}</Text>
        <Text style={styles.subText}>Allocation amount</Text>
      </View>

      <View style={styles.portfolioHeader}>
        <Image 
          source={require('../../assets/alpha.png')} 
          style={styles.portfolioLogo}
        />
        <Text style={styles.portfolioName}>AlphaFlex Portfolio</Text>
      </View>

      <Text style={styles.sectionTitle}>Order list</Text>

      <ScrollView style={styles.holdingsList}>
        {holdings.map((holding, index) => (
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

      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.placeOrderButton}
          onPress={handlePlaceOrder}
        >
          <Text style={styles.buttonText}>Place Order</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  backButton: {
    padding: 10,
  },
  amountContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  amountText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#333',
  },
  subText: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  portfolioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  portfolioLogo: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
  portfolioName: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 20,
    marginBottom: 10,
  },
  holdingsList: {
    flex: 1,
    paddingHorizontal: 20,
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
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  placeOrderButton: {
    backgroundColor: '#000',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default OrderScreen;