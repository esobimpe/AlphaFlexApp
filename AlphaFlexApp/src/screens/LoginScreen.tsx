import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import Toast from 'react-native-toast-message';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');

  const handleLogin = () => {
    if (code === '12345') {
      navigation.navigate('PortfolioList');
    } else {
      Toast.show({ type: 'error', text1: 'Invalid Code' });
    }
  };

  return (
    <View style={styles.container}>
      <Toast />
      <Text style={styles.welcomeText}>Welcome to AlphaFlex by ConsX</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Enter 5-digit code"
        keyboardType="numeric"
        value={code}
        onChangeText={setCode}
      />
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Next</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  welcomeText: { fontSize: 18, textAlign: 'center', marginBottom: 10 },
  input: { width: '80%', padding: 10, borderBottomWidth: 1, marginBottom: 15 },
  button: { backgroundColor: 'black', padding: 15, borderRadius: 10 },
  buttonText: { color: 'white' },
});

export default LoginScreen;
