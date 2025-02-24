import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const WelcomeScreen = () => {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      {/* Logo */}
      <Image source={require('../../assets/logo.png')} style={styles.logo} />

      {/* Title */}
      <Text style={styles.title}>
        Invest like a
        <Text style={styles.titleBold}> Strategist</Text>
      </Text>

      {/* Subtitle */}
      <Text style={styles.subtitle}>
        Precision-driven growth with built-in protection.
      </Text>

      {/* Portfolio Image */}
      <Image
        source={require('../../assets/portfolio2.png')}
        style={styles.portfolioImage}
      />

      {/* Get Started Button */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('EmailVerification')}
      >
        <Text style={styles.buttonText}>Get Started</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 80, // Keeps everything aligned correctly
  },
  logo: {
    width: 60,
    height: 60,
    marginBottom: 15,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 50,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  titleBold: {
    fontWeight: 'bold',
    color: 'black',
  },
  subtitle: {
    fontSize: 18,
    color: 'gray',
    textAlign: 'center',
    marginBottom: 30,
  },
  portfolioImage: {
    width: '100%',
    height: '50%',
    resizeMode: 'contain',
    marginBottom: 40,
  },
  button: {
    backgroundColor: 'black',
    paddingVertical: 20,
    paddingHorizontal: 80, // Increased padding to make it wider
    width: '90%', // Ensures the button fills most of the screen width
    alignItems: 'center', // Center the text inside
    borderRadius: 10,
    position: 'absolute',
    bottom: 40, // Keeps it at the bottom
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 20,
  },
});

export default WelcomeScreen;
