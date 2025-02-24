const fs = require('fs').promises;
const crypto = require('crypto');
const path = require('path');
require('dotenv').config();

// Configuration
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const PORTFOLIO_FILE = path.join(DATA_DIR, 'portfolio.json');
const PERFORMANCE_FILE = path.join(DATA_DIR, 'performance.json');

// Create a 32-byte key from the environment variable
const createKey = (envKey) => {
  // Hash the key to ensure it's always 32 bytes
  return crypto.createHash('sha256').update(String(envKey)).digest();
};

// Get encryption key from environment and convert to proper length
const ENCRYPTION_KEY = createKey(process.env.ENCRYPTION_KEY);
const IV_LENGTH = 16;

class StorageManager {
  constructor() {
    if (!process.env.ENCRYPTION_KEY) {
      console.error('Missing ENCRYPTION_KEY in environment variables');
      console.log('Available environment variables:', Object.keys(process.env));
      throw new Error('ENCRYPTION_KEY environment variable is required');
    }
    
    // Add new file paths
    this.ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
    this.SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
    
    console.log('Storage Manager initialized successfully');
    this.initializeStorage();
  }

  async initializeStorage() {
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      
      // Initialize all files if they don't exist
      await this.initializeFileIfNotExists(USERS_FILE, { users: {} });
      await this.initializeFileIfNotExists(PORTFOLIO_FILE, { portfolio: null, lastUpdated: null });
      await this.initializeFileIfNotExists(PERFORMANCE_FILE, { performance: null, lastUpdated: null });
      await this.initializeFileIfNotExists(this.ORDERS_FILE, { orders: {} });
      await this.initializeFileIfNotExists(this.SESSIONS_FILE, { sessions: {} });
      
      console.log('Storage system initialized successfully');
    } catch (error) {
      console.error('Error initializing storage:', error);
      throw error;
    }
  }

  async initializeFileIfNotExists(filePath, defaultContent) {
    try {
      await fs.access(filePath);
    } catch {
      await fs.writeFile(filePath, this.encrypt(JSON.stringify(defaultContent)));
    }
  }

  encrypt(text) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  }

  decrypt(text) {
    try {
      const [ivHex, encryptedHex] = text.split(':');
      const iv = Buffer.from(ivHex, 'hex');
      const encrypted = Buffer.from(encryptedHex, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      return decrypted.toString();
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  async readEncryptedFile(filePath) {
    try {
      const encryptedData = await fs.readFile(filePath, 'utf8');
      const decryptedData = this.decrypt(encryptedData);
      return JSON.parse(decryptedData);
    } catch (error) {
      console.error(`Error reading ${path.basename(filePath)}:`, error);
      throw error;
    }
  }

  async writeEncryptedFile(filePath, data) {
    try {
      const encryptedData = this.encrypt(JSON.stringify(data));
      await fs.writeFile(filePath, encryptedData);
    } catch (error) {
      console.error(`Error writing to ${path.basename(filePath)}:`, error);
      throw error;
    }
  }

  // User data methods
  async getUserData(email) {
    try {
      const data = await this.readEncryptedFile(USERS_FILE);
      return data.users[email] || null;
    } catch (error) {
      console.error(`Error fetching user data for ${email}:`, error);
      return null;
    }
  }

  async updateUserData(email, userData) {
    try {
      const data = await this.readEncryptedFile(USERS_FILE);
      data.users[email] = {
        ...data.users[email],
        ...userData,
        lastUpdated: new Date().toISOString()
      };
      await this.writeEncryptedFile(USERS_FILE, data);
      console.log(`Updated user data for ${email}`);
      return data.users[email];
    } catch (error) {
      console.error(`Error updating user data for ${email}:`, error);
      throw error;
    }
  }

  // Portfolio methods
  async updatePortfolio(portfolioData) {
    try {
      const data = {
        portfolio: portfolioData,
        lastUpdated: new Date().toISOString()
      };
      await this.writeEncryptedFile(PORTFOLIO_FILE, data);
      console.log('Portfolio data updated successfully');
    } catch (error) {
      console.error('Error updating portfolio:', error);
      throw error;
    }
  }

  async getPortfolio() {
    try {
      const data = await this.readEncryptedFile(PORTFOLIO_FILE);
      return data.portfolio;
    } catch (error) {
      console.error('Error fetching portfolio:', error);
      return null;
    }
  }

  // Performance methods
  async updatePerformance(performanceData) {
    try {
      const data = {
        performance: performanceData,
        lastUpdated: new Date().toISOString()
      };
      await this.writeEncryptedFile(PERFORMANCE_FILE, data);
      console.log('Performance data updated successfully');
    } catch (error) {
      console.error('Error updating performance:', error);
      throw error;
    }
  }

  async getPerformance() {
    try {
      const data = await this.readEncryptedFile(PERFORMANCE_FILE);
      return data.performance;
    } catch (error) {
      console.error('Error fetching performance:', error);
      return null;
    }
  }

  // Order management methods
  async saveOrder(email, orderData) {
    try {
      const data = await this.readEncryptedFile(this.ORDERS_FILE);
      
      if (!data.orders[email]) {
        data.orders[email] = [];
      }

      const order = {
        ...orderData,
        orderId: `order_${Date.now()}`,
        timestamp: new Date().toISOString(),
        status: 'pending'
      };

      data.orders[email].unshift(order); // Add to beginning of array
      await this.writeEncryptedFile(this.ORDERS_FILE, data);

      // Update user data with new order
      const userData = await this.getUserData(email);
      if (userData) {
        if (!userData.orders) {
          userData.orders = [];
        }
        userData.orders.unshift(order.orderId);
        await this.updateUserData(email, userData);
      }

      return order;
    } catch (error) {
      console.error('Error saving order:', error);
      throw error;
    }
  }

  async getOrders(email) {
    try {
      const data = await this.readEncryptedFile(this.ORDERS_FILE);
      return data.orders[email] || [];
    } catch (error) {
      console.error('Error fetching orders:', error);
      return [];
    }
  }

  async updateOrderStatus(email, orderId, status, details = {}) {
    try {
      const data = await this.readEncryptedFile(this.ORDERS_FILE);
      
      if (!data.orders[email]) {
        throw new Error('No orders found for user');
      }

      const orderIndex = data.orders[email].findIndex(o => o.orderId === orderId);
      if (orderIndex === -1) {
        throw new Error('Order not found');
      }

      data.orders[email][orderIndex] = {
        ...data.orders[email][orderIndex],
        status,
        ...details,
        lastUpdated: new Date().toISOString()
      };

      await this.writeEncryptedFile(this.ORDERS_FILE, data);
      return data.orders[email][orderIndex];
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  }

  // Session management
  async saveSession(email, sessionData) {
    try {
      const data = await this.readEncryptedFile(this.SESSIONS_FILE);
      
      data.sessions[email] = {
        ...sessionData,
        lastUpdated: new Date().toISOString()
      };

      await this.writeEncryptedFile(this.SESSIONS_FILE, data);
      return data.sessions[email];
    } catch (error) {
      console.error('Error saving session:', error);
      throw error;
    }
  }

  async getSession(email) {
    try {
      const data = await this.readEncryptedFile(this.SESSIONS_FILE);
      return data.sessions[email] || null;
    } catch (error) {
      console.error('Error fetching session:', error);
      return null;
    }
  }

  async clearSession(email) {
    try {
      const data = await this.readEncryptedFile(this.SESSIONS_FILE);
      delete data.sessions[email];
      await this.writeEncryptedFile(this.SESSIONS_FILE, data);
    } catch (error) {
      console.error('Error clearing session:', error);
      throw error;
    }
  }

  // Sell order methods
  async saveSellOrder(email, sellOrderData) {
    try {
      const data = await this.readEncryptedFile(this.ORDERS_FILE);
      
      if (!data.orders[email]) {
        data.orders[email] = [];
      }

      const sellOrder = {
        ...sellOrderData,
        orderId: `sell_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'sell',
        status: 'pending'
      };

      data.orders[email].unshift(sellOrder);
      await this.writeEncryptedFile(this.ORDERS_FILE, data);

      // Update user data
      const userData = await this.getUserData(email);
      if (userData) {
        userData.lastSellOrder = sellOrder.orderId;
        userData.isSoldOut = true;
        userData.totalInvested = 0;
        userData.holdings = [];
        await this.updateUserData(email, userData);
      }

      return sellOrder;
    } catch (error) {
      console.error('Error saving sell order:', error);
      throw error;
    }
  }

  // Order details method
  async getOrderDetails(email, orderId) {
    try {
      const orders = await this.getOrders(email);
      return orders.find(order => order.orderId === orderId) || null;
    } catch (error) {
      console.error('Error fetching order details:', error);
      return null;
    }
  }
}

// Export the storage manager instance
const storageManager = new StorageManager();
module.exports = storageManager;