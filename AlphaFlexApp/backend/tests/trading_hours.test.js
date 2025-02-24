describe('Trading Hours Check', () => {
    let RealDate;
    
    beforeAll(() => {
      RealDate = Date;
    });
  
    afterAll(() => {
      global.Date = RealDate;
    });
  
    const mockDate = (isoDate) => {
      const fixedDate = new RealDate(isoDate);
      global.Date = class extends RealDate {
        constructor() {
          super();
          return fixedDate;
        }
  
        static now() {
          return fixedDate.getTime();
        }
      };
    };
  
    const checkTradingHours = () => {
      const now = new Date();
      const utcHour = now.getUTCHours();
      const utcMinute = now.getUTCMinutes();
      const day = now.getUTCDay();
      
      // Trading hours in UTC (14:30 - 21:00 UTC, which is 9:30 AM - 4:00 PM EDT)
      const marketOpen = 14;  // 9:30 AM EDT
      const marketClose = 20; // 4:00 PM EDT
      
      // Check if it's a weekday
      if (day === 0 || day === 6) {
        return false;
      }
      
      // Check market hours
      if (utcHour < marketOpen || utcHour > marketClose) {
        return false;
      }
      
      // If it's the closing hour, check minutes
      if (utcHour === marketClose && utcMinute > 30) {
        return false;
      }
      
      return true;
    };
  
    test('should return false on weekends', () => {
      // Sunday
      mockDate('2024-02-25T15:00:00Z');
      expect(checkTradingHours()).toBe(false);
  
      // Saturday
      mockDate('2024-02-24T15:00:00Z');
      expect(checkTradingHours()).toBe(false);
    });
  
    test('should return true during trading hours on weekdays', () => {
      // Monday 10:00 AM EDT (14:00 UTC)
      mockDate('2024-02-26T15:00:00Z');
      expect(checkTradingHours()).toBe(true);
    });
  
    test('should return false before market open', () => {
      // Monday 8:00 AM EDT (12:00 UTC)
      mockDate('2024-02-26T12:00:00Z');
      expect(checkTradingHours()).toBe(false);
    });
  
    test('should return false after market close', () => {
      // Monday 4:30 PM EDT (20:30 UTC)
      mockDate('2024-02-26T20:31:00Z');
      expect(checkTradingHours()).toBe(false);
    });
  });