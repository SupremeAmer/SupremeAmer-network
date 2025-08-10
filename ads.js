class AdService {
    constructor() {
        this.client = new Appwrite.Client()
            .setEndpoint('https://cloud.appwrite.io/v1')
            .setProject('supremeamer-app');
        
        this.database = new Appwrite.Database(this.client);
        this.adsCollection = 'ads';
        this.transactionsCollection = 'transactions';
    }
    
    async createAd(adData) {
        try {
            // Verify wallet connection
            if (!walletService.userAddress) {
                throw new Error('Wallet not connected');
            }
            
            // Calculate cost based on category and reach
            const costPerReach = (adData.category === 'crypto' || adData.category === 'referral') ? 0.1 : 0.092;
            const costBNB = adData.reach * costPerReach;
            
            // Send payment
            const paymentTx = await walletService.sendBNB(
                '0x742d35Cc6634C0532925a3b844Bc454e4438f44e', // Your BNB address
                costBNB
            );
            
            if (!paymentTx) throw new Error('Payment failed');
            
            // Create ad document
            const adDoc = {
                ...adData,
                creator: walletService.userAddress,
                status: 'active',
                cost: costBNB,
                participants: [],
                createdAt: new Date().toISOString()
            };
            
            const result = await this.database.createDocument(this.adsCollection, adDoc);
            
            // Record transaction
            await this.database.createDocument(this.transactionsCollection, {
                userId: walletService.userAddress,
                type: 'ad_creation',
                amount: -costBNB,
                currency: 'BNB',
                details: `Created ad: ${adData.title}`,
                status: 'completed'
            });
            
            return result.$id;
        } catch (error) {
            console.error('Ad creation error:', error);
            throw error;
        }
    }
    
    async getAds() {
        try {
            const ads = await this.database.listDocuments(this.adsCollection);
            return ads.documents;
        } catch (error) {
            console.error('Error fetching ads:', error);
            return [];
        }
    }
    
    async participateInAd(adId) {
        try {
            // Verify wallet connection
            if (!walletService.userAddress) {
                throw new Error('Wallet not connected');
            }
            
            // Get current user
            const user = await authService.account.get();
            
            // Record participation
            await this.database.createDocument(this.transactionsCollection, {
                userId: walletService.userAddress,
                type: 'ad_participation',
                adId,
                amount: 350,
                currency: 'SAT',
                status: 'pending',
                proof: '' // Would be filled after verification
            });
            
            // Reward user after verification (simulated here)
            setTimeout(async () => {
                // In a real app, this would be triggered after admin verification
                await this.database.updateDocument(this.transactionsCollection, tx.$id, {
                    status: 'completed'
                });
                
                // Update user's token balance
                const userDoc = await this.database.getDocument('users', user.$id);
                await this.database.updateDocument('users', user.$id, {
                    tokenBalance: userDoc.tokenBalance + 350
                });
            }, 15000); // Simulate 15 second verification delay
            
            return true;
        } catch (error) {
            console.error('Participation error:', error);
            throw error;
        }
    }
    
    async getAdCategories() {
        return [
            { id: 'crypto', name: 'Crypto', icon: 'fa-bitcoin', minReach: 20, pricePerReach: 0.1 },
            { id: 'facebook', name: 'Facebook', icon: 'fa-facebook', minReach: 50, pricePerReach: 0.092 },
            { id: 'instagram', name: 'Instagram', icon: 'fa-instagram', minReach: 50, pricePerReach: 0.092 },
            { id: 'twitter', name: 'Twitter', icon: 'fa-twitter', minReach: 50, pricePerReach: 0.092 },
            { id: 'telegram', name: 'Telegram', icon: 'fa-telegram', minReach: 50, pricePerReach: 0.092 },
            { id: 'youtube', name: 'YouTube', icon: 'fa-youtube', minReach: 50, pricePerReach: 0.092 },
            { id: 'discord', name: 'Discord', icon: 'fa-discord', minReach: 50, pricePerReach: 0.092 },
            { id: 'referral', name: 'Referral', icon: 'fa-user-plus', minReach: 20, pricePerReach: 0.1 }
        ];
    }
}

const adService = new AdService();
