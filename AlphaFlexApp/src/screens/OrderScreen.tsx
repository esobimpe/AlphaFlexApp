import React, { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Image, 
  Platform,
  Alert,
  Modal,
  Animated,
  Dimensions,
  Easing
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

const OrderScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [holdings, setHoldings] = useState([]);
  const { amount } = route.params;
  const [showAnimation, setShowAnimation] = useState(false);
  const [allItemsProcessed, setAllItemsProcessed] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  
  // Use ref to track animation state
  const currentItemIndexRef = useRef(-1);
  const animationIsRunningRef = useRef(false);
  
  // Animation values
  const fadeIn = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const checkmarkScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;
  
  // Card animation values
  const cardScale = useRef(new Animated.Value(0.95)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  
  // These will be populated once we have the holdings data
  const stockOpacity = useRef([]);
  const stockScale = useRef([]);
  const stockCheckmark = useRef([]);
  
  // Confetti animation values
  const confettiValues = useRef(
    Array(30).fill(0).map(() => ({
      x: Math.random() * width,
      y: new Animated.Value(-20),
      rotate: new Animated.Value(0),
      size: Math.random() * 8 + 5,
      color: [
        '#00E0FF', '#5D00FF', '#FF00E0', '#FF5D00', '#00FF85', 
        '#FFD500', '#FF0054', '#00FF33'
      ][Math.floor(Math.random() * 8)]
    }))
  ).current;
  
  // Use a ref to control animation abort
  const shouldAbortAnimation = useRef(false);

  useEffect(() => {
    const fetchHoldings = async () => {
      try {
        const response = await fetch('http://192.168.4.24:5001/portfolio');
        const data = await response.json();
        
        // Update holdings state
        setHoldings(data.Holdings);
        
        // Initialize animation values for each holding
        stockOpacity.current = data.Holdings.map(() => new Animated.Value(0));
        stockScale.current = data.Holdings.map(() => new Animated.Value(0.95));
        stockCheckmark.current = data.Holdings.map(() => new Animated.Value(0));
      } catch (error) {
        console.error('Error fetching holdings:', error);
      }
    };

    fetchHoldings();
    
    // Clean up animations when component unmounts
    return () => {
      shouldAbortAnimation.current = true;
      animationIsRunningRef.current = false;
    };
  }, []);

  // Reset animation values when animation modal becomes visible
  useEffect(() => {
    if (showAnimation && holdings.length > 0) {
      // Reset animation abort flag
      shouldAbortAnimation.current = false;
      
      // Reset animation state
      currentItemIndexRef.current = -1;
      setAllItemsProcessed(false);
      setShowCelebration(false);
      animationIsRunningRef.current = true;
      
      // Reset all animation values
      stockOpacity.current.forEach(anim => anim.setValue(0));
      stockScale.current.forEach(anim => anim.setValue(0.95));
      stockCheckmark.current.forEach(anim => anim.setValue(0));
      progress.setValue(0);
      checkmarkScale.setValue(0);
      fadeIn.setValue(0);
      successOpacity.setValue(0);
      cardScale.setValue(0.95);
      cardOpacity.setValue(0);
      confettiValues.forEach(confetti => confetti.y.setValue(-20));
      confettiValues.forEach(confetti => confetti.rotate.setValue(0));
      
      // Fade in the modal and card
      Animated.parallel([
        Animated.timing(fadeIn, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(cardScale, {
          toValue: 1,
          duration: 700,
          easing: Easing.out(Easing.back()),
          useNativeDriver: true,
        })
      ]).start(() => {
        // Start the animation sequence after fade in
        startAnimationSequence();
      });
    }
    
    // Clean up animations when modal closes
    if (!showAnimation) {
      shouldAbortAnimation.current = true;
      animationIsRunningRef.current = false;
    }
  }, [showAnimation, holdings]);

  // Create interpolated progress width
  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, width - 80]
  });

  // Animation sequence handler
  const startAnimationSequence = () => {
    // Run the full animation sequence asynchronously
    const runAnimationSequence = async () => {
      if (!animationIsRunningRef.current) return;
      
      // Animate each stock one by one
      for (let i = 0; i < holdings.length; i++) {
        if (shouldAbortAnimation.current || !animationIsRunningRef.current) break;
        
        currentItemIndexRef.current = i;
        
        // Update progress bar
        Animated.timing(progress, {
          toValue: (i + 1) / holdings.length,
          duration: 300,
          useNativeDriver: false,
        }).start();
        
        // Animate stock item appearance
        await new Promise(resolve => {
          Animated.parallel([
            Animated.timing(stockOpacity.current[i], {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(stockScale.current[i], {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            })
          ]).start(() => {
            // Show checkmark after stock appears
            setTimeout(() => {
              Animated.timing(stockCheckmark.current[i], {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
              }).start(() => {
                setTimeout(resolve, 150);
              });
            }, 200);
          });
        });
      }
      
      // Show completion animation if not aborted
      if (!shouldAbortAnimation.current && animationIsRunningRef.current) {
        setAllItemsProcessed(true);
        
        await new Promise(resolve => {
          Animated.sequence([
            // Animate final checkmark
            Animated.timing(checkmarkScale, {
              toValue: 1,
              duration: 600,
              easing: Easing.elastic(1.2),
              useNativeDriver: true,
            }),
            // Show success message
            Animated.timing(successOpacity, {
              toValue: 1,
              duration: 500,
              useNativeDriver: true,
            })
          ]).start(() => {
            setTimeout(resolve, 800);
          });
        });
        
        // Show celebration animation
        if (animationIsRunningRef.current) {
          setShowCelebration(true);
          
          // Animate confetti falling
          confettiValues.forEach((confetti, i) => {
            Animated.parallel([
              Animated.timing(confetti.y, {
                toValue: height + 100,
                duration: 2000 + Math.random() * 1000,
                useNativeDriver: true,
              }),
              Animated.timing(confetti.rotate, {
                toValue: (Math.random() > 0.5 ? 360 : -360),
                duration: 2000 + Math.random() * 1000,
                useNativeDriver: true,
              })
            ]).start();
          });
          
          // Navigate to congratulation after celebration
          setTimeout(() => {
            if (animationIsRunningRef.current) {
              handleAnimationComplete();
            }
          }, 1500);
        }
      }
    };
    
    // Start the animation sequence
    runAnimationSequence().catch(error => {
      console.error('Animation sequence error:', error);
      // Ensure we navigate even if there's an error
      handleAnimationComplete(); 
    });
  };

  const handlePlaceOrder = () => {
    // Show animation modal
    setShowAnimation(true);
  };

  const handleAnimationComplete = async () => {
    // Prevent multiple calls
    if (!animationIsRunningRef.current) return;
    
    // Abort any ongoing animations
    shouldAbortAnimation.current = true;
    animationIsRunningRef.current = false;
    
    // Hide animation modal
    setShowAnimation(false);
    
    try {
      // Save investment data
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

      <ScrollView style={styles.holdingsList} showsVerticalScrollIndicator={false}>
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

      {/* Modern Animation Modal */}
      <Modal visible={showAnimation} transparent animationType="none">
        <Animated.View style={[styles.modalContainer, { opacity: fadeIn }]}>
          <View style={styles.contentContainer}>
            {/* Card with animation content */}
            <Animated.View style={[
              styles.card,
              {
                opacity: cardOpacity,
                transform: [{ scale: cardScale }]
              }
            ]}>
              {/* Header */}
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Processing Order</Text>
              </View>
              
              {/* Progress bar */}
              <View style={styles.progressContainer}>
                <Animated.View 
                  style={[
                    styles.progressBar, 
                    { width: progressWidth }
                  ]} 
                />
              </View>
              
              {/* Stocks list */}
              <ScrollView 
                style={styles.stocksList} 
                showsVerticalScrollIndicator={false}
                scrollEnabled={false}
              >
                {holdings.map((holding, index) => (
                  <Animated.View
                    key={`stock-${index}`}
                    style={[
                      styles.stockRow,
                      {
                        opacity: stockOpacity.current[index],
                        transform: [{ scale: stockScale.current[index] }]
                      }
                    ]}
                  >
                    <View style={styles.stockInfo}>
                      <Text style={styles.stockRowName}>{holding.Stock}</Text>
                      <Text style={styles.stockRowAllocation}>
                        {holding['Stock Allocation Weight (%)']}% · ${calculateAllocation(holding['Stock Allocation Weight (%)']).toFixed(2)}
                      </Text>
                    </View>
                    <Animated.View style={[
                      styles.stockCheckmark,
                      { opacity: stockCheckmark.current[index] }
                    ]}>
                      <Ionicons name="checkmark-circle" size={22} color="#00C851" />
                    </Animated.View>
                  </Animated.View>
                ))}
              </ScrollView>
              
              {/* Completion UI */}
              {allItemsProcessed && (
                <View style={styles.completionContainer}>
                  <Animated.View style={[
                    styles.checkCircle,
                    {
                      transform: [{ scale: checkmarkScale }]
                    }
                  ]}>
                    <Ionicons name="checkmark" size={40} color="#FFF" />
                  </Animated.View>
                  
                  <Animated.Text style={[
                    styles.successText,
                    { opacity: successOpacity }
                  ]}>
                    Order Complete!
                  </Animated.Text>
                </View>
              )}
            </Animated.View>
            
            {/* Confetti celebration */}
            {showCelebration && confettiValues.map((confetti, index) => (
              <Animated.View
                key={`confetti-${index}`}
                style={[
                  styles.confetti,
                  {
                    left: confetti.x,
                    width: confetti.size,
                    height: confetti.size * 2,
                    backgroundColor: confetti.color,
                    transform: [
                      { translateY: confetti.y },
                      { rotate: confetti.rotate.interpolate({
                        inputRange: [0, 360],
                        outputRange: ['0deg', '360deg']
                      }) }
                    ]
                  }
                ]}
              />
            ))}
          </View>
        </Animated.View>
      </Modal>
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
  
  // Modern Animation modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    width: width,
    height: height,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  card: {
    width: width - 40,
    maxHeight: height - 200,
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    paddingBottom: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  cardHeader: {
    padding: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  progressContainer: {
    height: 8,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#00C851',
    borderRadius: 4,
  },
  stocksList: {
    marginTop: 15,
    maxHeight: height - 400,
    marginHorizontal: 20,
  },
  stockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  stockInfo: {
    flex: 1,
  },
  stockRowName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  stockRowAllocation: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
  stockCheckmark: {
    width: 26,
    height: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completionContainer: {
    alignItems: 'center',
    paddingVertical: 25,
  },
  checkCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#00C851',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  successText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#333',
  },
  confetti: {
    position: 'absolute',
    borderRadius: 3,
  },
});

export default OrderScreen;