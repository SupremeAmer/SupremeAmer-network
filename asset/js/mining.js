class MiningService {
    constructor() {
        this.client = new Appwrite.Client()
            .setEndpoint('https://cloud.appwrite.io/v1')
            .setProject('supremeamer-app');
        this.database = new Appwrite.Database(this.client);
    }
    
    async getMiningPackages() {
        return [
            {
                id: 'starter',
                name: 'Starter Package',
                cost: 5,
                rate: 30,
                duration: 45,
                description: 'Great for beginners'
            },
            {
                id: 'pro',
                name: 'Pro Package',
                cost: 10,
                rate: 100,
                duration: 72,
                description: 'Best value'
            },
            {
                id: 'premium',
                name: 'Premium Package',
                cost: 20,
                rate: 200,
                duration: 145,
                description: 'Maximum earnings'
            }
        ];
    }
    
    async upgradeMiningPackage(packageId) {
        try {
            if (!walletService.connected) {
                throw new Error('Wallet not connected');
            }
            
            const packages = await this.getMiningPackages();
            const selectedPackage = packages.find(pkg => pkg.id === packageId);
            
            if (!selectedPackage) {
                throw new Error('Invalid package');
            }
            
            // Send BNB payment
            const paymentTx = await walletService.sendBNB(
                '0x742d35Cc6634C0532925a3b844Bc454e4438f44e', // Your BNB address
                selectedPackage.cost
            );
            
            if (!paymentTx) throw new Error('Payment failed');
            
            // Calculate end time
            const endTime = new Date();
            endTime.setDate(endTime.getDate() + selectedPackage.duration);
            
            // Get current user
            const user = await authService.account.get();
            
            // Update user document
            await this.database.updateDocument('users', user.$id, {
                miningPackage: packageId,
                miningStartTime: new Date().toISOString(),
                miningEndTime: endTime.toISOString()
            });
            
            // Record transaction
            await this.database.createDocument('transactions', {
                userId: walletService.userAddress,
                type: 'mining_upgrade',
                amount: -selectedPackage.cost,
                currency: 'BNB',
                details: `Upgraded to ${selectedPackage.name}`,
                status: 'completed'
            });
            
            return true;
        } catch (error) {
            console.error('Mining upgrade error:', error);
            throw error;
        }
    }
    
    async getCurrentMiningStats(userId) {
        try {
            const userDoc = await this.database.getDocument('users', userId);
            
            if (!userDoc.miningPackage || new Date(userDoc.miningEndTime) < new Date()) {
                return null; // No active mining package
            }
            
            const packages = await this.getMiningPackages();
            const currentPackage = packages.find(pkg => pkg.id === userDoc.miningPackage);
            
            return {
                package: currentPackage,
                startTime: userDoc.miningStartTime,
                endTime: userDoc.miningEndTime,
                estimatedEarnings: this.calculateEarnings(currentPackage, userDoc.miningStartTime)
            };
        } catch (error) {
            console.error('Error getting mining stats:', error);
            return null;
        }
    }
    
    calculateEarnings(pkg, startTime) {
        const hoursElapsed = (new Date() - new Date(startTime)) / (1000 * 60 * 60);
        return Math.floor(hoursElapsed * pkg.rate);
    }
}

const miningService = new MiningService();