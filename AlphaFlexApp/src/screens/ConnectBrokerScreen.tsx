import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ScrollView, TextInput, Modal, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const ConnectBrokerScreen = () => {
  const navigation = useNavigation();

  // State for search query
  const [searchQuery, setSearchQuery] = useState('');

  // State for flash message modal
  const [showModal, setShowModal] = useState(false);

  // Sample broker data
  const brokers = [
    { id: 1, name: "Robinhood", image: require('../../assets/robinhood-logo.png') },
    { id: 2, name: "I don't see my brokerage", image: require('../../assets/other-broker-logo.png') },
  ];

  // Filter brokers based on search query
  const filteredBrokers = brokers.filter(broker =>
    broker.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle "I don't see my brokerage" click
  const handleOtherBrokerClick = () => {
    setShowModal(true);
  };

  // Handle "What if I don't have a brokerage?" click
  const handleNoBrokerageClick = () => {
    Linking.openURL('https://robinhood.com/signup/?source=google_sem&utm_source=google&utm_campaign=8140492012&utm_content=84157057397&utm_term=658217162828__robinhood__e&utm_medium=cpc&gad_source=1&gclid=CjwKCAiA5eC9BhAuEiwA3CKwQuGJPY1ueCUMc2zR3KPG2c0F6HD8KNWWOxICSq4q4EGlRLUBwTU_whoCLyMQAvD_BwE');
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Header with Search Icon */}
        <View style={styles.headerContainer}>
          <Ionicons
            name="arrow-back"
            size={24}
            color="black"
            style={styles.backIcon}
            onPress={() => navigation.goBack()}
          />
          <Text style={styles.header}>Connect Your Broker</Text>
        </View>

        {/* Search Bar */}
        <TextInput
          style={styles.searchInput}
          placeholder="Search for your broker..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        {/* Broker Cards */}
        {filteredBrokers.map(broker => (
          <TouchableOpacity
            key={broker.id}
            style={styles.card}
            onPress={() => {
              if (broker.name === 'Robinhood') {
                navigation.navigate('AutopilotConnection');
              } else {
                handleOtherBrokerClick();
              }
            }}
          >
            <Image source={broker.image} style={styles.cardImage} />
            <View style={styles.cardContent}>
              <Text style={styles.cardName}>{broker.name}</Text>
            </View>
            <Text style={styles.arrow}>→</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Footer Text */}
      <Text style={styles.footerText} onPress={handleNoBrokerageClick}>
        What if I don't have a brokerage?
      </Text>

      {/* Flash Message Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowModal(false)}>
              <Ionicons name="close" size={24} color="black" />
            </TouchableOpacity>
            <Text style={styles.modalText}>Other brokerages are coming to our platform soon.</Text>
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
    padding: 20,
    justifyContent: 'center',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  backIcon: {
    position: 'absolute',
    left: 0,
    paddingRight: 10,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  searchInput: {
    backgroundColor: '#f1f1f1',
    width: '100%',
    height: 40,
    borderRadius: 8,
    paddingLeft: 10,
    marginBottom: 20,
    fontSize: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 20,
    elevation: 5,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    height: 120,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  cardImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 15,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
  },
  cardName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  arrow: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginLeft: 10,
  },
  footerText: {
    marginTop: 20,
    fontSize: 16,
    color: 'gray',
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  modalText: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 20,
  },
});

export default ConnectBrokerScreen;