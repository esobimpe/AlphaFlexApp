import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import Toast from 'react-native-toast-message';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ReactNativeBiometrics from 'react-native-biometrics';

const API_URL = 'http://192.168.4.24:5001';

const biometrics = new ReactNativeBiometrics({
  allowDeviceCredentials: true
});

const EmailVerificationScreen = () => {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [isEmailEntered, setIsEmailEntered] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkBiometricAuth();
  }, []);

  const checkBiometricAuth = async () => {
    try {
      const savedEmail = await AsyncStorage.getItem('biometricEmail');
      
      if (savedEmail) {
        const { available, biometryType } = await biometrics.isSensorAvailable();
        
        if (available) {
          const { success } = await biometrics.simplePrompt({
            promptMessage: 'Authenticate to login'
          });

          if (success) {
            setEmail(savedEmail);
            const investmentStatus = await checkInvestmentStatus(savedEmail);
            handleSuccessfulLogin(investmentStatus, savedEmail);
          }
        }
      }
    } catch (error) {
      console.error('Biometric auth error:', error);
    }
  };

  const checkInvestmentStatus = async (userEmail) => {
    try {
      console.log('Checking investment status for email:', userEmail);
      
      // First try to get data from file storage via API
      try {
        const response = await fetch(`${API_URL}/api/user/${userEmail}`);
        if (response.ok) {
          const userData = await response.json();
          console.log('API userData:', userData);
          
          if (userData && userData.isInvested && userData.totalInvested > 0 && !userData.isSoldOut) {
            console.log('User is invested according to API');
            return {
              isInvested: true,
              isSoldOut: false,
              totalInvested: userData.totalInvested,
              holdings: userData.holdings || [],
              availableBalance: userData.availableBalance || 2000.53
            };
          }
        }
      } catch (error) {
        console.error('Error fetching from file storage:', error);
      }
      
      // If API check fails, check AsyncStorage
      const usersData = await AsyncStorage.getItem('usersData');
      const users = usersData ? JSON.parse(usersData) : {};
      const robinhoodUserStr = await AsyncStorage.getItem('robinhoodUser');
      const robinhoodUser = robinhoodUserStr ? JSON.parse(robinhoodUserStr) : null;
      
      console.log('AsyncStorage userData:', users[userEmail]);
      
      if (users[userEmail]) {
        const userData = users[userEmail];
        
        // Check if user has active investments
        if (userData.isInvested && userData.totalInvested > 0 && !userData.isSoldOut) {
          console.log('User is invested according to AsyncStorage');
          return {
            isInvested: true,
            isSoldOut: false,
            totalInvested: userData.totalInvested,
            holdings: userData.holdings || [],
            availableBalance: robinhoodUser ? robinhoodUser.buyingPower : userData.availableBalance
          };
        }
        
        console.log('User exists but is not invested');
        return {
          isInvested: false,
          isSoldOut: userData.isSoldOut || false,
          availableBalance: robinhoodUser ? robinhoodUser.buyingPower : userData.availableBalance || 2000.53,
          totalInvested: 0,
          holdings: []
        };
      }

      console.log('New user - no existing data found');
      return { 
        isInvested: false,
        isSoldOut: false,
        availableBalance: robinhoodUser ? robinhoodUser.buyingPower : 2000.53,
        totalInvested: 0,
        holdings: []
      };
    } catch (error) {
      console.error('Error checking investment status:', error);
      return { 
        isInvested: false,
        isSoldOut: false,
        availableBalance: 2000.53,
        totalInvested: 0,
        holdings: []
      };
    }
  };

  const setupBiometricAuth = async (userEmail) => {
    try {
      const { available, biometryType } = await biometrics.isSensorAvailable();
      
      if (!available) {
        return;
      }

      Alert.alert(
        'Enable Biometric Login',
        `Would you like to enable ${biometryType === 'FaceID' ? 'Face ID' : 'Touch ID'} for faster login next time?`,
        [
          {
            text: 'No Thanks',
            style: 'cancel'
          },
          {
            text: 'Enable',
            onPress: async () => {
              try {
                const { success } = await biometrics.simplePrompt({
                  promptMessage: 'Authenticate to enable biometric login'
                });

                if (success) {
                  await AsyncStorage.setItem('biometricEmail', userEmail);
                  Toast.show({ 
                    type: 'success', 
                    text1: `${biometryType === 'FaceID' ? 'Face ID' : 'Touch ID'} enabled!` 
                  });
                }
              } catch (error) {
                console.error('Error enabling biometrics:', error);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error setting up biometrics:', error);
    }
  };

  const handleSuccessfulLogin = async (investmentStatus, userEmail) => {
    try {
      console.log('Handling successful login with status:', investmentStatus);
      
      // Save current user email
      await AsyncStorage.setItem('currentUserEmail', userEmail);

      // Update API storage
      try {
        const response = await fetch(`${API_URL}/api/user/update`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: userEmail,
            userData: {
              isInvested: investmentStatus.isInvested,
              isSoldOut: investmentStatus.isSoldOut,
              totalInvested: investmentStatus.totalInvested,
              holdings: investmentStatus.holdings,
              availableBalance: investmentStatus.availableBalance,
              lastUpdated: new Date().toISOString()
            }
          })
        });
        console.log('API update response:', response.ok);
      } catch (error) {
        console.error('Error updating file storage:', error);
      }

      // Update AsyncStorage
      const usersData = await AsyncStorage.getItem('usersData') || '{}';
      const users = JSON.parse(usersData);
      
      users[userEmail] = {
        isInvested: investmentStatus.isInvested,
        isSoldOut: investmentStatus.isSoldOut,
        totalInvested: investmentStatus.totalInvested,
        holdings: investmentStatus.holdings,
        availableBalance: investmentStatus.availableBalance
      };
      
      await AsyncStorage.setItem('usersData', JSON.stringify(users));
      
      console.log('Navigation check - isInvested:', investmentStatus.isInvested, 'isSoldOut:', investmentStatus.isSoldOut);

      // Navigation logic
      if (investmentStatus.isInvested && !investmentStatus.isSoldOut) {
        console.log('Navigating to Congratulation screen');
        navigation.reset({
          index: 0,
          routes: [{ 
            name: 'Congratulation',
            params: {
              amount: investmentStatus.totalInvested,
              holdings: investmentStatus.holdings,
              availableBalance: investmentStatus.availableBalance,
              fromVerification: true,
              totalInvested: investmentStatus.totalInvested
            }
          }],
        });
      } else {
        console.log('Navigating to PortfolioList screen');
        navigation.reset({
          index: 0,
          routes: [{ name: 'PortfolioList' }]
        });
      }
    } catch (error) {
      console.error('Error in handleSuccessfulLogin:', error);
      Alert.alert('Error', 'Failed to process login. Please try again.');
    }
  };

  const handleSendCode = async () => {
    if (!email.includes('@')) {
      Toast.show({ type: 'error', text1: 'Please enter a valid email' });
      return;
    }

    try {
      setLoading(true);
      console.log('Sending verification code to:', email);
      
      const response = await fetch(`${API_URL}/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      setLoading(false);

      if (response.ok) {
        setIsEmailEntered(true);
        Toast.show({ type: 'success', text1: 'Verification code sent' });
      } else {
        Toast.show({ type: 'error', text1: data.message });
      }
    } catch (error) {
      setLoading(false);
      console.error('Error sending code:', error);
      Toast.show({ type: 'error', text1: 'Something went wrong!' });
    }
  };

  const handleVerifyCode = async () => {
    if (code.length !== 5) {
      Toast.show({ type: 'error', text1: 'Enter a valid 5-digit code' });
      return;
    }

    try {
      setLoading(true);
      console.log('Verifying code for:', email);
      
      const response = await fetch(`${API_URL}/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });

      const data = await response.json();

      if (response.ok) {
        const investmentStatus = await checkInvestmentStatus(email);
        setLoading(false);
        Toast.show({ type: 'success', text1: 'Verification successful!' });

        await setupBiometricAuth(email);
        await handleSuccessfulLogin(investmentStatus, email);
      } else {
        setLoading(false);
        Toast.show({ type: 'error', text1: data.message || 'Something went wrong!' });
      }
    } catch (error) {
      setLoading(false);
      console.error('Error during verification:', error);
      Toast.show({ type: 'error', text1: 'Something went wrong!' });
    }
  };

  return (
    <View style={styles.container}>
      <Toast />
      {!isEmailEntered ? (
        <>
          <Text style={styles.welcomeText}>Enter your email to verify</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <TouchableOpacity 
            style={[styles.button, loading && styles.disabledButton]} 
            onPress={handleSendCode} 
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Next</Text>
            )}
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.welcomeText}>Enter the 5-digit code</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter 5-digit code"
            keyboardType="numeric"
            value={code}
            onChangeText={setCode}
            maxLength={5}
          />
          <TouchableOpacity 
            style={[styles.button, loading && styles.disabledButton]} 
            onPress={handleVerifyCode} 
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Verify</Text>
            )}
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  welcomeText: {
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: 'bold',
  },
  input: {
    width: '80%',
    padding: 12,
    borderBottomWidth: 2,
    marginBottom: 25,
    fontSize: 16,
    borderColor: '#ccc',
  },
  button: {
    backgroundColor: 'black',
    paddingVertical: 18,
    paddingHorizontal: 60,
    borderRadius: 10,
    marginTop: 20,
    minWidth: 200,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#666',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
});

export default EmailVerificationScreen;