import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import BottomNav from '../components/BottomNav';

const PortfolioListScreen = () => {
  const navigation = useNavigation();
  const [performanceData, setPerformanceData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPerformance = async () => {
      try {
        const response = await fetch('http://192.168.4.24:5001/performance');
        const data = await response.json();
        if (data?.performance?.data) {
          const oneYearReturn = data.performance.data[5];
          setPerformanceData(oneYearReturn);
        }
      } catch (error) {
        console.error('Error fetching performance:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPerformance();
  }, []);

  const portfolio = { 
    id: 2, 
    name: "AlphaFlex Portfolio", 
    returnPercentage: performanceData ? `+${performanceData}%` : "+0%",
    image: require('../../assets/alpha.png'),
    description: "Designed for investors seeking higher growth potential with a balanced approach to risk."
  };

  const renderReturn = () => {
    if (isLoading) {
      return <ActivityIndicator size="small" color="#4CAF50" />;
    }
    return (
      <View style={styles.returnContainer}>
        <Text style={styles.cardReturn}>{portfolio.returnPercentage}</Text>
        <Text style={styles.returnSubtitle}>1Y backtested return</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.contentContainer}>
        <Text style={styles.header}>Choose Your Portfolio</Text>

        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('PortfolioDetails', { portfolio })}
        >
          <Image 
            source={portfolio.image} 
            style={styles.backgroundImage} 
            blurRadius={5} 
          />

          <View style={styles.cardOverlay}>
            <Image 
              source={portfolio.image} 
              style={styles.portfolioImage} 
            />
            
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardName}>{portfolio.name}</Text>
              {renderReturn()}
              <Text style={styles.cardDescription}>
                {portfolio.description}
              </Text>
            </View>

            <TouchableOpacity 
              style={styles.investButton}
              onPress={() => navigation.navigate('PortfolioDetails', { portfolio })}
            >
              <Text style={styles.investButtonText}>Explore Portfolio</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </View>
      <BottomNav />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  contentContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    paddingBottom: 120, // Added padding for bottom nav
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 30,
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    height: 500,
    marginBottom: 60, // Added margin for bottom nav
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.3,
  },
  cardOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  portfolioImage: {
    width: 200,
    height: 200,
    borderRadius: 20,
    marginBottom: 30,
  },
  cardTextContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  cardName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  returnContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  cardReturn: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 4,
  },
  returnSubtitle: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  cardDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginHorizontal: 20,
  },
  investButton: {
    backgroundColor: '#000',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 10,
  },
  investButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default PortfolioListScreen;