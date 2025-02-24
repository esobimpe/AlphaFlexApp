import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserData {
  email: string;
  isInvested: boolean;
  investedAmount?: number;
  holdings?: any[];
}

export const saveUserData = async (data: UserData) => {
  try {
    await AsyncStorage.setItem('userData', JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Error saving user data:', error);
    return false;
  }
};

export const getUserData = async (): Promise<UserData | null> => {
  try {
    const data = await AsyncStorage.getItem('userData');
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
};

export const updateUserInvestment = async (amount: number, holdings: any[]) => {
  try {
    const userData = await getUserData();
    if (userData) {
      const updatedData = {
        ...userData,
        isInvested: true,
        investedAmount: amount,
        holdings,
      };
      await saveUserData(updatedData);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error updating user investment:', error);
    return false;
  }
};

export const clearUserInvestment = async () => {
  try {
    const userData = await getUserData();
    if (userData) {
      const updatedData = {
        ...userData,
        isInvested: false,
        investedAmount: undefined,
        holdings: undefined,
      };
      await saveUserData(updatedData);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error clearing user investment:', error);
    return false;
  }
};