import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface InvestmentStatus {
  isInvested: boolean;
  investedAmount?: number;
  holdings?: any[];
  email?: string;
}

export const useInvestment = () => {
  const [investmentStatus, setInvestmentStatus] = useState<InvestmentStatus>({
    isInvested: false
  });
  const [loading, setLoading] = useState(true);

  const checkInvestmentStatus = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const parsedData = JSON.parse(userData);
        setInvestmentStatus({
          isInvested: parsedData.isInvested || false,
          investedAmount: parsedData.investedAmount,
          holdings: parsedData.holdings,
          email: parsedData.email
        });
      }
    } catch (error) {
      console.error('Error checking investment status:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateInvestment = async (newData: Partial<InvestmentStatus>) => {
    try {
      const currentData = await AsyncStorage.getItem('userData');
      const parsedCurrentData = currentData ? JSON.parse(currentData) : {};
      
      const updatedData = {
        ...parsedCurrentData,
        ...newData,
        isInvested: true
      };

      await AsyncStorage.setItem('userData', JSON.stringify(updatedData));
      setInvestmentStatus(updatedData);
      return true;
    } catch (error) {
      console.error('Error updating investment:', error);
      return false;
    }
  };

  const clearInvestment = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const parsedData = JSON.parse(userData);
        const updatedData = {
          email: parsedData.email,
          isInvested: false
        };
        await AsyncStorage.setItem('userData', JSON.stringify(updatedData));
        setInvestmentStatus(updatedData);
      }
      return true;
    } catch (error) {
      console.error('Error clearing investment:', error);
      return false;
    }
  };

  useEffect(() => {
    checkInvestmentStatus();
  }, []);

  return {
    investmentStatus,
    loading,
    updateInvestment,
    clearInvestment,
    checkInvestmentStatus
  };
};