import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Image, 
  Alert, 
  ActivityIndicator,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RobinhoodLoginScreen = () => {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showMFAPrompt, setShowMFAPrompt] = useState(false);
  const [mfaCode, setMfaCode] = useState('');

  useEffect(() => {
    checkExistingAuth();
  }, []);

  const checkExistingAuth = async () => {
    try {
      const currentUserEmail = await AsyncStorage.getItem('currentUserEmail');
      const robinhoodAuthData = await AsyncStorage.getItem('robinhoodAuthData');
      
      if (robinhoodAuthData && currentUserEmail) {
        const parsedAuthData = JSON.parse(robinhoodAuthData);
        if (parsedAuthData.email === currentUserEmail) {
          const investmentStatus = await checkInvestmentStatus(currentUserEmail);
          
          // If user has active investments, go to Congratulation
          if (investmentStatus.isInvested && !investmentStatus.isSoldOut) {
            navigation.replace('Congratulation', {
              amount: 0,
              holdings: investmentStatus.holdings,
              availableBalance: investmentStatus.availableBalance,
              fromVerification: true,
              totalInvested: investmentStatus.totalInvested
            });
          } else {
            // If user has sold out or never invested, stay on Robinhood login
            // Don't navigate away
            console.log('User needs to reinvest');
          }
        }
      }
    } catch (error) {
      console.error('Error checking existing auth:', error);
    }
  };

  const checkInvestmentStatus = async (userEmail) => {
    try {
      console.log('Checking investment status for:', userEmail);
      
      const usersData = await AsyncStorage.getItem('usersData');
      const users = usersData ? JSON.parse(usersData) : {};
      
      if (users[userEmail]) {
        const userData = users[userEmail];
        
        // Return both investment status and sold-out status
        return {
          isInvested: userData.isInvested && userData.totalInvested > 0,
          isSoldOut: userData.isSoldOut || false,
          totalInvested: userData.totalInvested || 0,
          holdings: userData.holdings || [],
          availableBalance: userData.availableBalance || 2000.53
        };
      }

      console.log('No investment found for this email');
      return { 
        isInvested: false,
        isSoldOut: false,
        totalInvested: 0,
        holdings: [],
        availableBalance: 2000.53
      };
    } catch (error) {
      console.error('Error checking investment status:', error);
      return { 
        isInvested: false,
        isSoldOut: false,
        totalInvested: 0,
        holdings: [],
        availableBalance: 2000.53
      };
    }
  };

  const handleAuthentication = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    const currentUserEmail = await AsyncStorage.getItem('currentUserEmail');
    if (email.toLowerCase() !== currentUserEmail.toLowerCase()) {
      Alert.alert('Error', 'Email must match your verified email address');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://192.168.4.24:5001/api/robinhood/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: email,
          password: password
        })
      });

      const data = await response.json();

      if (data.error) {
        Alert.alert('Error', data.error);
        setLoading(false);
        return;
      }

      if (data.status === 'awaiting_mfa') {
        setShowMFAPrompt(true);
        setLoading(false);
        return;
      }

      if (!data.success) {
        throw new Error(data.error || 'Authentication failed');
      }

      await handleLoginSuccess(data);

    } catch (error) {
      console.error('Authentication error:', error);
      Alert.alert('Error', error.message || 'Authentication failed. Please try again.');
      setLoading(false);
    }
  };

  const handleMFASubmit = async () => {
    if (!mfaCode) {
      Alert.alert('Error', 'Please enter the verification code');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://192.168.4.24:5001/api/robinhood/auth/mfa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: email,
          mfaCode: mfaCode
        })
      });

      const data = await response.json();
      console.log('MFA response:', data);

      if (!data.success) {
        throw new Error(data.error || 'MFA verification failed');
      }

      await handleLoginSuccess(data);

    } catch (error) {
      console.error('MFA error:', error);
      Alert.alert('Error', error.message || 'MFA verification failed. Please try again.');
      setMfaCode('');
      setLoading(false);
    }
  };

  const handleLoginSuccess = async (data) => {
    try {
      // Store Robinhood authentication data
      const authData = {
        email: data.user.email,
        lastLoginTime: new Date().toISOString()
      };
      await AsyncStorage.setItem('robinhoodAuthData', JSON.stringify(authData));

      // Create new user data
      const robinhoodUser = {
        user: {
          email: data.user.email,
          first_name: data.user.first_name,
          last_name: data.user.last_name
        },
        buyingPower: data.buying_power,
        cashAvailable: data.cash_available,
        lastLoginTime: new Date().toISOString()
      };

      await AsyncStorage.setItem('robinhoodUser', JSON.stringify(robinhoodUser));
      
      // Update user data in storage
      const usersData = await AsyncStorage.getItem('usersData');
      const users = usersData ? JSON.parse(usersData) : {};

      // Check if user exists and maintain their investment status
      const existingUser = users[data.user.email] || {};
      users[data.user.email] = {
        ...existingUser,
        lastLoginTime: new Date().toISOString(),
        buyingPower: data.buying_power,
        cashAvailable: data.cash_available,
        // Maintain existing investment flags if they exist
        isInvested: existingUser.isInvested || false,
        isSoldOut: existingUser.isSoldOut || false,
        totalInvested: existingUser.totalInvested || 0,
        holdings: existingUser.holdings || []
      };
      
      await AsyncStorage.setItem('usersData', JSON.stringify(users));

      // Reset MFA state
      setShowMFAPrompt(false);
      setMfaCode('');

      // Navigate to appropriate screen
      navigation.navigate('Allocation', {
        portfolio: {
          name: 'AlphaFlex Portfolio',
          image: require('../../assets/alpha.png'),
        },
        availableBalance: data.buying_power,
        firstName: data.user.first_name
      });

    } catch (error) {
      console.error('Error in handleLoginSuccess:', error);
      Alert.alert('Error', 'Failed to process login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Ionicons
        name="arrow-back"
        size={24}
        color="black"
        style={styles.backIcon}
        onPress={() => navigation.goBack()}
      />

      <Image
        source={require('../../assets/robinhood-logo.png')}
        style={styles.logo}
      />

      <Text style={styles.title}>Robinhood Login</Text>

      <TextInput 
        style={styles.input}
        placeholder="Email/Username"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        editable={!loading}
      />

      <TextInput 
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        editable={!loading}
      />

      <TouchableOpacity 
        style={[styles.button, (!email || !password || loading) && styles.disabledButton]}
        onPress={handleAuthentication}
        disabled={!email || !password || loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Login</Text>
        )}
      </TouchableOpacity>

      {/* MFA Prompt Modal */}
      <Modal
        visible={showMFAPrompt}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enter Verification Code</Text>
            <Text style={styles.modalDescription}>
              Please enter the verification code sent to your phone
            </Text>

            <TextInput 
              style={[styles.input, styles.mfaInput]}
              placeholder="Enter code"
              value={mfaCode}
              onChangeText={setMfaCode}
              keyboardType="numeric"
              maxLength={6}
              editable={!loading}
              autoFocus={true}
            />

            <TouchableOpacity 
              style={[styles.button, (!mfaCode || loading) && styles.disabledButton]}
              onPress={handleMFASubmit}
              disabled={!mfaCode || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Submit</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => {
                setShowMFAPrompt(false);
                setMfaCode('');
                setLoading(false);
              }}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  backIcon: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 1,
    padding: 10,
  },
  logo: {
    width: 150,
    height: 50,
    resizeMode: 'contain',
    alignSelf: 'center',
    marginTop: 60,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 20,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  mfaInput: {
    textAlign: 'center',
    letterSpacing: 8,
    fontSize: 20,
  },
  button: {
    backgroundColor: '#000',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    width: '90%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  modalDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  cancelButton: {
    marginTop: 15,
    padding: 10,
  },
  cancelButtonText: {
    color: '#007AFF',
    fontSize: 16,
  }
});

export default RobinhoodLoginScreen;