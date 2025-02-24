import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, KeyboardAvoidingView, Platform, Keyboard, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import BottomNav from '../components/BottomNav';

const AllocationScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [amount, setAmount] = useState('');
  const [availableBalance, setAvailableBalance] = useState(0);
  const [firstName, setFirstName] = useState('');
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const minimumAmount = 0.1;

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Get the robinhoodUser data from AsyncStorage
        const userData = await AsyncStorage.getItem('robinhoodUser');
        if (userData) {
          const parsedData = JSON.parse(userData);
          setAvailableBalance(parsedData.buyingPower || 0);
        }

        // Get user's first name
        const robinhoodUserStr = await AsyncStorage.getItem('robinhoodUser');
        if (robinhoodUserStr) {
          const robinhoodUser = JSON.parse(robinhoodUserStr);
          if (robinhoodUser.user && robinhoodUser.user.first_name) {
            setFirstName(robinhoodUser.user.first_name);
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        Alert.alert('Error', 'Failed to load user data');
      }
    };

    fetchUserData();

    const keyboardWillShow = Keyboard.addListener('keyboardWillShow', () => setKeyboardVisible(true));
    const keyboardWillHide = Keyboard.addListener('keyboardWillHide', () => setKeyboardVisible(false));

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  const isValidAmount = () => {
    const numAmount = parseFloat(amount);
    return numAmount >= minimumAmount && numAmount <= availableBalance;
  };

  const getMinimumText = () => {
    if (amount === '') {
      return `Minimum $0.1`;
    }
    if (parseFloat(amount) < minimumAmount) {
      return `Minimum $0.1`;
    }
    if (!isValidAmount()) {
      return 'Insufficient buying power';
    }
    return 'Allocation amount';
  };

  const handleReviewPress = async () => {
    if (isValidAmount()) {
      const investedAmount = parseFloat(amount);

      // Navigate to Order screen
      navigation.navigate('Order', {
        amount: investedAmount,
        portfolio: route.params?.portfolio,
        availableBalance: availableBalance,
      });
    }
  };

  return (
    <View style={styles.container}>
      {/* Header with back button and portfolio info */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>

          <View style={styles.portfolioContainer}>
            <Image
              source={require('../../assets/alpha.png')}
              style={styles.logo}
            />
            <Text style={styles.portfolioName}>AlphaFlex Portfolio</Text>
          </View>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.mainContent}>
        <Text style={styles.welcomeText}>Welcome, {firstName}</Text>

        <View style={styles.amountContainer}>
          <Text style={styles.dollarSign}>$</Text>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor="#999"
          />
        </View>

        <Text style={[
          styles.minimumText,
          (!isValidAmount() || parseFloat(amount) < minimumAmount) && amount !== '' && styles.errorText
        ]}>
          {getMinimumText()}
        </Text>
      </View>

      {/* Footer */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={[
          styles.footer,
          keyboardVisible && styles.footerWithKeyboard
        ]}
      >
        <Text style={styles.availableText}>
          You have ${availableBalance.toFixed(2)} available to invest in AlphaFlex Portfolio
        </Text>
        <TouchableOpacity
          style={[
            styles.reviewButton,
            !isValidAmount() && styles.disabledButton
          ]}
          onPress={handleReviewPress}
          disabled={!isValidAmount()}
        >
          <Text style={styles.reviewButtonText}>Review</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>

      <BottomNav />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  portfolioContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 40,
  },
  logo: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
    marginRight: 8,
  },
  portfolioName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
  },
  mainContent: {
    flex: 1,
    paddingTop: 40,
  },
  welcomeText: {
    fontSize: 34,
    fontWeight: '300',
    color: '#333',
    textAlign: 'center',
    marginBottom: 60,
    letterSpacing: 0.5,
  },
  amountContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  dollarSign: {
    fontSize: 40,
    fontWeight: '300',
    color: '#333',
    marginRight: -4,
  },
  amountInput: {
    fontSize: 72,
    fontWeight: '600',
    color: '#333',
    minWidth: 220,
    maxWidth: 300,
    textAlign: 'center',
    padding: 0,
    margin: 0,
  },
  minimumText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    marginBottom: 40,
  },
  errorText: {
    color: '#FF3B30',
  },
  footer: {
    position: 'absolute',
    bottom: 100, // Increased to make room for BottomNav
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  footerWithKeyboard: {
    position: 'relative',
    bottom: 0,
    borderTopWidth: 0,
  },
  availableText: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 20,
  },
  reviewButton: {
    backgroundColor: '#000',
    paddingVertical: 20,
    borderRadius: 4,
    alignItems: 'center',
    marginHorizontal: -20,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  reviewButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default AllocationScreen;