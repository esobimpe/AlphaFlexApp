import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const AutopilotConnectionScreen = () => {
  const [showContent, setShowContent] = useState(false);
  const navigation = useNavigation();

  const logoLeftPosition = new Animated.Value(-120);
  const logoRightPosition = new Animated.Value(120);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(logoLeftPosition, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(logoRightPosition, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setTimeout(() => {
        setShowContent(true);
      }, 1000);
    });
  }, []);

  return (
    <View style={styles.container}>
      {!showContent && (
        <View style={styles.logoContainer}>
          <Animated.Image
            source={require('../../assets/logo.png')}
            style={[styles.logo, { transform: [{ translateX: logoLeftPosition }] }]}
          />
          <Animated.Image
            source={require('../../assets/robinhood-logo.png')}
            style={[styles.logo, { transform: [{ translateX: logoRightPosition }] }]}
          />
        </View>
      )}
      {showContent && (
        <View style={styles.content}>
          <Ionicons name="arrow-back" size={24} color="black" style={styles.backIcon} onPress={() => navigation.goBack()} />
          <View style={styles.overlappingLogoContainer}>
            <Image source={require('../../assets/robinhood-logo.png')} style={styles.overlappingLogo} />
            <Image source={require('../../assets/logo.png')} style={[styles.overlappingLogo, styles.overlappingLogoRight]} />
          </View>
          <Text style={styles.title}>AlphaFlex connects to Robinhood using{'\n'}<Text style={styles.emphasis}>Bank Level Security</Text></Text>
          <Text style={styles.description}>Here's how AlphaFlex uses this connection:</Text>
          <View style={styles.pointContainer}>
            <Image source={require('../../assets/icon.png')} style={styles.icon} />
            <View style={styles.pointContent}>
              <Text style={styles.point}>Brokerage API Access</Text>
              <Text style={styles.pointDescription}>Autopilot sends buy and sell notifications to your brokerage.</Text>
            </View>
          </View>
          <View style={styles.pointContainer}>
            <Image source={require('../../assets/icon.png')} style={styles.icon} />
            <View style={styles.pointContent}>
              <Text style={styles.point}>Basic Personal Information</Text>
              <Text style={styles.pointDescription}>We collect your full name, date of birth, address, and investing preferences.</Text>
            </View>
          </View>
          <View style={styles.pointContainer}>
            <Image source={require('../../assets/icon.png')} style={styles.icon} />
            <View style={styles.pointContent}>
              <Text style={styles.point}>Bank Level Security</Text>
              <Text style={styles.pointDescription}>AlphaFlex uses Bank Level Security to connect to Robinhood.</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('RobinhoodLogin')}>
            <Text style={styles.buttonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
  },
  logoContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  logo: {
    width: 100,
    height: 100,
    margin: 10,
  },
  content: {
    flex: 1,
    paddingTop: 40,
  },
  backIcon: {
    marginBottom: 20,
  },
  overlappingLogoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  overlappingLogo: {
    width: 50,
    height: 50,
  },
  overlappingLogoRight: {
    marginLeft: -10,
  },
  title: {
    fontSize: 18,
    marginBottom: 20,
  },
  emphasis: {
    fontWeight: 'bold',
  },
  description: {
    fontSize: 16,
    color: '#888',
    marginBottom: 20,
  },
  pointContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  icon: {
    width: 24,
    height: 24,
    marginRight: 10,
  },
  pointContent: {
    flex: 1,
  },
  point: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  pointDescription: {
    fontSize: 14,
  },
  button: {
    backgroundColor: '#000',
    paddingVertical: 15,
    borderRadius: 8,
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default AutopilotConnectionScreen;