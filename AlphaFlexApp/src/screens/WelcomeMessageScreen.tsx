import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Toast from 'react-native-toast-message';

const WelcomeMessageScreen = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <Toast />
      
      {/* Green Checkmark with Black Checkmark Inside */}
      <View style={styles.checkmarkContainer}>
        <View style={styles.checkmark}>
          <View style={styles.checkmarkLine}></View>
        </View>
      </View>

      {/* Welcome Message */}
      <Text style={styles.welcomeMessage}>Welcome to AlphaFlex by ConsX</Text>
      <Text style={styles.subtitle}>We're excited to have you join the most exciting way to invest.</Text>
      
      {/* Continue Button */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('PortfolioList')}
      >
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingTop: 20 // To add some space for the checkmark at the top
  },
  checkmarkContainer: {
    position: 'absolute',
    top: '30%', // Adjusted to center it more in the middle of the screen
    left: '50%',
    transform: [{ translateX: -35 }], // Center it horizontally
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    width: 70, // Size of the circle
    height: 70, // Size of the circle
    borderRadius: 35,  // Circle shape
    backgroundColor: 'green',  // Green color for the checkmark circle
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkLine: {
    width: 40, // Width of the "checkmark" line
    height: 5, // Height of the "checkmark" line
    backgroundColor: 'black',  // Black color for the line
    transform: [{ rotate: '45deg' }], // Rotate the line to form the "checkmark"
  },
  welcomeMessage: {
    fontSize: 20, 
    fontWeight: 'bold', 
    marginBottom: 10,
    textAlign: 'center', // Centered text
  },
  subtitle: {
    fontSize: 16, 
    textAlign: 'center', 
    marginBottom: 20,
  },
  button: {
    backgroundColor: 'black', 
    paddingVertical: 20, // Make the button bigger
    paddingHorizontal: 60,
    borderRadius: 10,
    position: 'absolute',
    bottom: 40, // Position at the bottom of the screen
  },
  buttonText: {
    color: 'white', 
    fontWeight: 'bold',
    fontSize: 20, // Larger text for the button
  },
});

export default WelcomeMessageScreen;
