//const robin_stocks = require('robin_stocks');
const { spawn } = require('child_process');
const path = require('path');
const storageManager = require('../storage-manager');

class OrderMonitor {
    constructor() {
        this.monitoringIntervals = new Map(); // Store monitoring intervals by orderId
        this.maxRetries = 3;
        this.checkInterval = 30000; // 30 seconds
        this.maxMonitoringTime = 30 * 60 * 1000; // 30 minutes
    }

    async startMonitoring(email, orderId, orderType = 'buy') {
        console.log(`Starting monitoring for order ${orderId}`);
        
        let retryCount = 0;
        let startTime = Date.now();

        const checkStatus = async () => {
            try {
                const orderDetails = await this.checkOrderStatus(email, orderId);
                
                if (!orderDetails) {
                    throw new Error('Failed to fetch order details');
                }

                console.log(`Order ${orderId} status: ${orderDetails.state}`);

                switch (orderDetails.state.toLowerCase()) {
                    case 'filled':
                        await this.handleFilledOrder(email, orderId, orderDetails);
                        this.stopMonitoring(orderId);
                        break;

                    case 'cancelled':
                    case 'failed':
                        if (retryCount < this.maxRetries) {
                            await this.retryOrder(email, orderId, orderType);
                            retryCount++;
                        } else {
                            await this.handleFailedOrder(email, orderId, orderDetails);
                            this.stopMonitoring(orderId);
                        }
                        break;

                    case 'pending':
                        // Check if we've exceeded max monitoring time
                        if (Date.now() - startTime > this.maxMonitoringTime) {
                            await this.handleTimeoutOrder(email, orderId);
                            this.stopMonitoring(orderId);
                        }
                        break;

                    case 'partially_filled':
                        await this.handlePartialFill(email, orderId, orderDetails);
                        break;
                }

            } catch (error) {
                console.error(`Error monitoring order ${orderId}:`, error);
                await storageManager.updateOrderStatus(email, orderId, 'error', {
                    error: error.message,
                    lastChecked: new Date().toISOString()
                });
            }
        };

        // Start monitoring interval
        const intervalId = setInterval(checkStatus, this.checkInterval);
        this.monitoringIntervals.set(orderId, intervalId);

        // Do initial check immediately
        await checkStatus();
    }

    stopMonitoring(orderId) {
        const intervalId = this.monitoringIntervals.get(orderId);
        if (intervalId) {
            clearInterval(intervalId);
            this.monitoringIntervals.delete(orderId);
            console.log(`Stopped monitoring order ${orderId}`);
        }
    }

    async checkOrderStatus(email, orderId) {
        try {
            // Run Python script to check order status
            const scriptPath = path.join(__dirname, 'robinhood_order.py');
            const result = await this.runPythonScript(scriptPath, ['check', orderId]);
            
            // Update order status in storage
            await storageManager.updateOrderStatus(email, orderId, result.state, {
                lastChecked: new Date().toISOString(),
                details: result
            });

            return result;
        } catch (error) {
            console.error(`Error checking order status for ${orderId}:`, error);
            throw error;
        }
    }

    async handleFilledOrder(email, orderId, orderDetails) {
        try {
            // Update order status
            await storageManager.updateOrderStatus(email, orderId, 'filled', {
                fillPrice: orderDetails.average_price,
                filledQuantity: orderDetails.filled_quantity,
                fillDate: new Date().toISOString(),
                details: orderDetails
            });

            // Update user's holdings or handle sell completion
            const userData = await storageManager.getUserData(email);
            if (orderDetails.side === 'buy') {
                // Update holdings for buy order
                if (!userData.holdings) userData.holdings = [];
                const holdingIndex = userData.holdings.findIndex(h => h.symbol === orderDetails.symbol);
                
                if (holdingIndex >= 0) {
                    userData.holdings[holdingIndex].quantity += parseFloat(orderDetails.filled_quantity);
                } else {
                    userData.holdings.push({
                        symbol: orderDetails.symbol,
                        quantity: parseFloat(orderDetails.filled_quantity)
                    });
                }
            }

            await storageManager.updateUserData(email, userData);

        } catch (error) {
            console.error(`Error handling filled order ${orderId}:`, error);
            throw error;
        }
    }

    async handlePartialFill(email, orderId, orderDetails) {
        try {
            const partialFill = {
                quantity: orderDetails.filled_quantity,
                price: orderDetails.average_price,
                timestamp: new Date().toISOString()
            };

            await storageManager.updateOrderStatus(email, orderId, 'partially_filled', {
                partialFill,
                details: orderDetails
            });
        } catch (error) {
            console.error(`Error handling partial fill for order ${orderId}:`, error);
            throw error;
        }
    }

    async handleFailedOrder(email, orderId, orderDetails) {
        try {
            await storageManager.updateOrderStatus(email, orderId, 'failed', {
                reason: orderDetails.reject_reason || 'Unknown',
                lastAttempt: new Date().toISOString(),
                details: orderDetails
            });
        } catch (error) {
            console.error(`Error handling failed order ${orderId}:`, error);
            throw error;
        }
    }

    async handleTimeoutOrder(email, orderId) {
        try {
            await storageManager.updateOrderStatus(email, orderId, 'timeout', {
                reason: 'Exceeded maximum monitoring time',
                lastChecked: new Date().toISOString()
            });
        } catch (error) {
            console.error(`Error handling timeout for order ${orderId}:`, error);
            throw error;
        }
    }

    async retryOrder(email, orderId, orderType) {
        try {
            const originalOrder = await storageManager.getOrderDetails(email, orderId);
            if (!originalOrder) throw new Error('Original order not found');

            // Run Python script to retry order
            const scriptPath = path.join(__dirname, 'robinhood_order.py');
            const result = await this.runPythonScript(scriptPath, [
                orderType,
                JSON.stringify(originalOrder)
            ]);

            if (result.success) {
                await storageManager.updateOrderStatus(email, orderId, 'retrying', {
                    retryCount: (originalOrder.retryCount || 0) + 1,
                    lastRetry: new Date().toISOString(),
                    newOrderId: result.orderId
                });
            } else {
                throw new Error(result.error || 'Retry failed');
            }
        } catch (error) {
            console.error(`Error retrying order ${orderId}:`, error);
            throw error;
        }
    }

    runPythonScript(scriptPath, args) {
        return new Promise((resolve, reject) => {
            const pythonProcess = spawn('python3', [scriptPath, ...args]);
            let dataString = '';
            let errorString = '';

            pythonProcess.stdout.on('data', (data) => {
                dataString += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
                errorString += data.toString();
            });

            pythonProcess.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(`Process exited with code ${code}: ${errorString}`));
                    return;
                }

                try {
                    const result = JSON.parse(dataString);
                    resolve(result);
                } catch (error) {
                    reject(new Error(`Failed to parse Python output: ${error}`));
                }
            });
        });
    }
}

module.exports = new OrderMonitor();