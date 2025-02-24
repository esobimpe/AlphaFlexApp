import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

const AlphaFlexSafePage = () => {
  const safeHoldings = [
    { ticker: 'APD', name: 'Air Products and Chemicals Inc.', allocation: '15%' },
    { ticker: 'EOG', name: 'EOG Resources Inc.', allocation: '15%' },
    { ticker: 'CF', name: 'CF Industries Holdings Inc.', allocation: '14%' },
    { ticker: 'DKS', name: 'Dick\'s Sporting Goods Inc', allocation: '14%' },
    { ticker: 'KR', name: 'Kroger Company', allocation: '14%' },
    { ticker: 'RPRX', name: 'Royalty Pharma plc', allocation: '14%' },
    { ticker: 'TPR', name: 'Tapestry Inc.', allocation: '14%' },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.header}>AlphaFlex Safe</Text>

      <ScrollView>
        {safeHoldings.map((holding, index) => (
          <View key={index} style={styles.holdingItem}>
            <Text style={styles.holdingText}>{holding.ticker} - {holding.name}</Text>
            <Text style={styles.holdingPercentage}>{holding.allocation}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  holdingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  holdingText: {
    fontSize: 16,
    color: '#333',
  },
  holdingPercentage: {
    fontSize: 16,
    color: '#4CAF50',
  },
});

export default AlphaFlexSafePage;
