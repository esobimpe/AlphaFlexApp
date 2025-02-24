import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  Image, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Linking, 
  Dimensions, 
  PanResponder, 
  ActivityIndicator 
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BottomNav from '../components/BottomNav';

const API_URL = 'http://192.168.4.24:5001';
const screenWidth = Dimensions.get('window').width;

const PortfolioDetailsScreen = ({ route, navigation }) => {
  const { portfolio } = route.params;
  const [holdings, setHoldings] = useState(null);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipData, setTooltipData] = useState(null);
  const [performanceData, setPerformanceData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserEmail, setCurrentUserEmail] = useState(null);
  const [userData, setUserData] = useState(null);
  const chartRef = useRef(null);

  // Define the static holdings data
  const holdingsData = {
    AlphaFlexSafe: [
      { name: 'APD - Air Products and Chemicals', shares: 15 },
      { name: 'EOG - EOG Resources', shares: 15 },
      { name: 'CF - CF Industries', shares: 14 },
      { name: 'DKS - Dick\'s Sporting Goods', shares: 14 },
      { name: 'KR - Kroger Company', shares: 14 },
      { name: 'RPRX - Royalty Pharma', shares: 14 },
      { name: 'TPR - Tapestry Inc.', shares: 14 },
    ],
    AlphaFlexPortfolio: [
      { name: 'AlphaFlex Growth', percentage: '50' },
      { name: 'AlphaFlex Safe', percentage: '50' },
    ]
  };

  // Fetch current user email
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const email = await AsyncStorage.getItem('currentUserEmail');
        console.log('Current user email:', email);
        setCurrentUserEmail(email);
      } catch (error) {
        console.error('Error getting current user:', error);
      }
    };
    getCurrentUser();
  }, []);

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      if (!currentUserEmail) return;

      try {
        // Try file storage first
        console.log('Fetching user data from file storage...');
        const response = await fetch(`${API_URL}/api/user/${currentUserEmail}`);
        
        if (response.ok) {
          const fileData = await response.json();
          console.log('User data from file storage:', fileData);
          setUserData(fileData);
          return;
        }

        // Fall back to AsyncStorage
        console.log('Falling back to AsyncStorage for user data...');
        const storedData = await AsyncStorage.getItem('usersData');
        if (storedData) {
          const parsedData = JSON.parse(storedData);
          console.log('User data from AsyncStorage:', parsedData[currentUserEmail]);
          setUserData(parsedData[currentUserEmail]);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, [currentUserEmail]);

  // Fetch holdings data
  useEffect(() => {
    const fetchHoldings = async () => {
      if (portfolio.name === "AlphaFlex Portfolio") {
        try {
          // Try file storage first
          console.log('Fetching portfolio data from file storage...');
          const response = await fetch(`${API_URL}/portfolio`);
          
          if (response.ok) {
            const data = await response.json();
            console.log('Portfolio data from file:', data);
            
            if (data?.Holdings?.length > 0) {
              setHoldings(data.Holdings);
              return;
            }
          }

          // Fall back to Python script direct execution
          console.log('Falling back to direct portfolio fetch...');
          const fallbackResponse = await fetch(`${API_URL}/portfolio`);
          const fallbackData = await fallbackResponse.json();
          
          if (fallbackData?.Holdings) {
            console.log('Setting holdings from fallback:', fallbackData.Holdings);
            setHoldings(fallbackData.Holdings);
          }
        } catch (error) {
          console.error('Error fetching holdings:', error);
        }
      }
    };

    fetchHoldings();
  }, [portfolio.name]);

  // Fetch performance data
  useEffect(() => {
    const fetchPerformance = async () => {
      setIsLoading(true);
      try {
        // Try file storage first
        console.log('Fetching performance data from file storage...');
        const response = await fetch(`${API_URL}/performance`);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Performance data from file:', data);
          
          if (data?.performance?.labels && data?.performance?.data) {
            setPerformanceData({
              labels: data.performance.labels,
              datasets: [{
                data: data.performance.data,
                strokeWidth: 2,
              }]
            });
            setIsLoading(false);
            return;
          }
        }

        // Fall back to direct performance fetch
        console.log('Falling back to direct performance fetch...');
        const fallbackResponse = await fetch(`${API_URL}/performance`);
        const fallbackData = await fallbackResponse.json();
        
        if (fallbackData?.performance?.labels && fallbackData?.performance?.data) {
          setPerformanceData({
            labels: fallbackData.performance.labels,
            datasets: [{
              data: fallbackData.performance.data,
              strokeWidth: 2,
            }]
          });
        }
      } catch (error) {
        console.error('Error fetching performance:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPerformance();
  }, []);

  // Pan Responder setup
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt, gestureState) => {
        if (!performanceData) return;
        
        const touchX = gestureState.x0;
        const dataPointIndex = Math.floor(
          (touchX / screenWidth) * performanceData.labels.length
        );
        
        if (dataPointIndex >= 0 && dataPointIndex < performanceData.labels.length) {
          setTooltipData({
            label: performanceData.labels[dataPointIndex],
            value: performanceData.datasets[0].data[dataPointIndex]
          });
          setTooltipVisible(true);
        }
      },
      onPanResponderRelease: () => {
        setTooltipVisible(false);
      }
    })
  ).current;

  const handleStockAnalysis = () => {
    Linking.openURL('https://www.consx.io/consxforindividuals');
  };

  const getHoldingsDisplay = () => {
    console.log('Rendering holdings for portfolio:', portfolio.name);
    console.log('Current holdings data:', holdings);

    if (portfolio.name === "AlphaFlex Portfolio" && holdings) {
      return holdings.map((holding, index) => (
        <View key={index} style={styles.holdingItem}>
          <TouchableOpacity onPress={handleStockAnalysis}>
            <Text style={[styles.holdingText, styles.clickableText]}>{holding.Stock}</Text>
          </TouchableOpacity>
          <Text style={styles.holdingPercentage}>{holding['Stock Allocation Weight (%)']}%</Text>
        </View>
      ));
    } else if (portfolio.name === "AlphaFlex Safe") {
      return holdingsData.AlphaFlexSafe.map((holding, index) => (
        <View key={index} style={styles.holdingItem}>
          <TouchableOpacity onPress={handleStockAnalysis}>
            <Text style={[styles.holdingText, styles.clickableText]}>{holding.name}</Text>
          </TouchableOpacity>
          <Text style={styles.holdingPercentage}>{holding.shares}%</Text>
        </View>
      ));
    } else if (portfolio.name === "AlphaFlex") {
      return holdingsData.AlphaFlexPortfolio.map((holding, index) => (
        <View key={index} style={styles.holdingItem}>
          <TouchableOpacity onPress={handleStockAnalysis}>
            <Text style={[styles.holdingText, styles.clickableText]}>{holding.name}</Text>
          </TouchableOpacity>
          <Text style={styles.holdingPercentage}>{holding.percentage}%</Text>
        </View>
      ));
    }
    return null;
  };

  const renderPerformanceSection = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      );
    }

    if (!performanceData) return null;

    return (
      <>
        <View style={styles.chartContainer} {...panResponder.panHandlers}>
          <LineChart
            ref={chartRef}
            data={performanceData}
            width={screenWidth}
            height={180}
            chartConfig={{
              backgroundColor: 'transparent',
              backgroundGradientFrom: 'transparent',
              backgroundGradientTo: 'transparent',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(0, 255, 0, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, 0)`,
              style: { borderRadius: 0 },
              propsForDots: { r: '0', strokeWidth: '0' },
              propsForLabels: { fontSize: 0 },
              withVerticalLines: false,
              withHorizontalLines: false,
              withInnerLines: false,
              withOuterLines: false,
              withVerticalLabels: false,
              withHorizontalLabels: false,
            }}
            bezier
            style={styles.chart}
            withVerticalLabels={false}
            withHorizontalLabels={false}
            fromZero={true}
            transparent={true}
            segments={4}
            formatXLabel={() => ''}
            horizontalLabelRotation={0}
            paddingRight={0}
            getDotProps={() => ({ r: 0, strokeWidth: 0 })}
          />
          
          {tooltipVisible && tooltipData && (
            <View style={styles.tooltipContainer}>
              <Text style={styles.tooltipText}>
                {tooltipData.label}: {tooltipData.value}%
              </Text>
            </View>
          )}
        </View>

        <View style={styles.performanceContainer}>
          <View style={styles.performanceNumbers}>
            {performanceData.labels.map((label, index) => (
              <View key={label} style={styles.performanceItem}>
                <Text style={styles.performanceLabel}>{label}</Text>
                <Text style={styles.performanceValue}>
                  {performanceData.datasets[0].data[index]}%
                </Text>
              </View>
            ))}
          </View>
          <Text style={styles.performanceSubtitle}>
            Real time backtested result as of {new Date().toLocaleDateString()}
          </Text>
        </View>
      </>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.imageContainer}>
          <Image source={portfolio.image} style={styles.portfolioImage} />
          <Text style={styles.portfolioName}>{portfolio.name}</Text>
        </View>

        {renderPerformanceSection()}

        <Text style={styles.sectionTitle}>Stats</Text>
        <View style={styles.statsContainer}>
          <View style={styles.dividerVertical} />
          <View style={styles.statsItem}>
            <Text style={styles.statsLabel}>Avg Delay</Text>
            <Text style={styles.statsValue}>Weekly</Text>
          </View>
          <View style={styles.dividerVertical} />
          <View style={styles.statsItem}>
            <Text style={styles.statsLabel}>Risk Level</Text>
            <Text style={styles.statsValue}>Moderate</Text>
          </View>
          <View style={styles.dividerVertical} />
        </View>

        <Text style={styles.subSectionTitle}>Current Holdings</Text>
        {getHoldingsDisplay()}

        {/* White Paper */}
        <Text style={styles.sectionTitle}>How do we get these positions?</Text>
        <TouchableOpacity onPress={() => Linking.openURL('https://www.consx.io/_files/ugd/41a1e4_6747e66fb8b847839f7200b79bbbf30c.pdf')}>
          <Text style={styles.linkText}>Read our white paper</Text>
        </TouchableOpacity>

        {/* Modern Divider Line */}
        <View style={styles.divider}></View>

        {/* Disclosure Section */}
        <Text style={styles.sectionTitle}>Disclosure</Text>
        <Text style={styles.disclosureText}>
          <Text style={styles.boldText}>Important Information</Text>{'\n'}
          The information provided on this website and the AlphaFlex platform is for informational purposes only. AlphaFlex is a product powered by ConsX Financial Technologies ("ConsX"), and AlphaFlex does not offer investment advice.{'\n\n'}

          <Text style={styles.boldText}>Investment Advice</Text>{'\n'}
          AlphaFlex itself does not provide investment advice.{'\n\n'}

          <Text style={styles.boldText}>Investment Risks</Text>{'\n'}
          Investing in securities involves significant risk, including the potential loss of principal. Past performance is not indicative of future results, and there are no guarantees that any investment strategy or portfolio will achieve its objectives or specific outcomes. You should carefully evaluate your financial situation, risk tolerance, and investment goals before making any financial decisions. Only invest funds you can afford to lose without impacting your financial stability.{'\n\n'}

          <Text style={styles.boldText}>Consult with Professionals</Text>{'\n'}
          You should consult with a qualified financial advisor, tax professional, or attorney to assess your financial situation and understand any potential legal or tax implications before making investment decisions. AlphaFlex and ConsX do not provide legal or tax advice.{'\n\n'}

          <Text style={styles.boldText}>Limitation of Liability</Text>{'\n'}
          AlphaFlex, ConsX, and their respective affiliates disclaim all liability for any losses or damages arising from reliance on the information provided on this platform or through related services.{'\n\n'}

          <Text style={styles.boldText}>No Guarantees</Text>{'\n'}
          No representation is made that any investment strategy, portfolio, or financial product available through AlphaFlex will deliver specific results or be suitable for any individual.{'\n\n'}

          <Text style={styles.boldText}>Disclosure of Affiliations</Text>{'\n'}
          AlphaFlex may have partnerships or affiliations with other financial institutions or service providers, which could influence the content presented or recommendations provided.
        </Text>
      </ScrollView>
      
      {/* Invest Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.investButton} onPress={() => navigation.navigate('ConnectBroker')}>
          <Text style={styles.investButtonText}>Invest in {portfolio.name}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fff', 
    padding: 20 
  },
  scrollContainer: { 
    paddingBottom: 20 
  },
  imageContainer: { 
    position: 'relative', 
    marginBottom: 20 
  },
  portfolioImage: { 
    width: '100%', 
    height: 250, 
    borderRadius: 10 
  },
  portfolioName: { 
    position: 'absolute', 
    bottom: 10, 
    left: 10, 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#fff' 
  },
  loadingContainer: {
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartContainer: {
    marginVertical: 20,
    width: '100%',
    position: 'relative',
  },
  chart: {
    paddingRight: 0,
    marginRight: 0,
    width: '100%',
  },
  tooltipContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  tooltipText: {
    backgroundColor: 'white',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  performanceContainer: {
    alignItems: 'center',
    width: '100%',
  },
  performanceNumbers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 10,
    marginTop: 10,
  },
  performanceItem: {
    alignItems: 'center',
  },
  performanceLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  performanceValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  performanceSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  sectionTitle: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    marginTop: 20, 
    marginBottom: 10, 
    color: '#333' 
  },
  statsContainer: { 
    flexDirection: 'row', 
    marginBottom: 20, 
    justifyContent: 'space-around' 
  },
  statsItem: { 
    alignItems: 'center', 
    padding: 10 
  },
  statsLabel: { 
    fontSize: 16, 
    color: '#555' 
  },
  statsValue: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#333' 
  },
  dividerVertical: { 
    width: 1, 
    backgroundColor: '#ccc' 
  },
  subSectionTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    marginTop: 10, 
    marginBottom: 5, 
    color: '#333' 
  },
  holdingItem: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    paddingVertical: 10, 
    borderBottomWidth: 1, 
    borderBottomColor: '#ccc' 
  },
  holdingText: { 
    fontSize: 16, 
    color: '#333' 
  },
  holdingPercentage: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#4CAF50' 
  },
  linkText: { 
    fontSize: 16, 
    color: '#007BFF', 
    textDecorationLine: 'underline' 
  },
  divider: { 
    height: 1, 
    backgroundColor: '#E0E0E0', 
    marginVertical: 20 
  },
  disclosureText: { 
    fontSize: 14, 
    color: '#666', 
    lineHeight: 20 
  },
  boldText: { 
    fontWeight: 'bold', 
    color: '#333' 
  },
  investButton: {
    backgroundColor: 'black',
    paddingVertical: 20,
    paddingHorizontal: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    width: '100%',
    marginBottom: 20,
  },
  buttonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  investButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  clickableText: {
    textDecorationLine: 'underline',
    color: '#007BFF',
  }
});

export default PortfolioDetailsScreen;