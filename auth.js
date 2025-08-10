class AuthService {
    constructor() {
        this.client = new Appwrite.Client()
            .setEndpoint('https://cloud.appwrite.io/v1')
            .setProject('supremeamer-app');
        
        this.account = new Appwrite.Account(this.client);
        
        // DOM elements
        this.authModal = document.getElementById('auth-modal');
        this.loginForm = document.getElementById('login-form');
        this.registerForm = document.getElementById('register-form');
        this.appContainer = document.getElementById('app-container');
        
        this.initEventListeners();
        this.checkAuthState();
    }
    
    initEventListeners() {
        document.getElementById('login-btn').addEventListener('click', this.handleLogin.bind(this));
        document.getElementById('register-btn').addEventListener('click', this.handleRegister.bind(this));
        document.getElementById('show-register').addEventListener('click', (e) => {
            e.preventDefault();
            this.loginForm.style.display = 'none';
            this.registerForm.style.display = 'block';
        });
        document.getElementById('show-login').addEventListener('click', (e) => {
            e.preventDefault();
            this.registerForm.style.display = 'none';
            this.loginForm.style.display = 'block';
        });
    }
    
    async checkAuthState() {
        try {
            const user = await this.account.get();
            this.authModal.style.display = 'none';
            this.appContainer.style.display = 'block';
            return user;
        } catch (error) {
            this.authModal.style.display = 'flex';
            this.appContainer.style.display = 'none';
            return null;
        }
    }
    
    async handleLogin() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        try {
            await this.account.createEmailSession(email, password);
            const user = await this.checkAuthState();
            return user;
        } catch (error) {
            alert('Login failed: ' + error.message);
            return null;
        }
    }
    
    async handleRegister() {
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const referralCode = document.getElementById('register-referral').value;
        
        try {
            // 1. Create account
            await this.account.create(email, password, name);
            
            // 2. Create user document
            const database = new Appwrite.Database(this.client);
            await database.createDocument('users', {
                name,
                email,
                tokenBalance: 0,
                referralCount: 0,
                referralEarnings: 0,
                miningPackage: 'none',
                referralCode: this.generateReferralCode()
            }, ['*'], []);
            
            // 3. Process referral if exists
            if (referralCode) {
                await this.processReferral(referralCode);
            }
            
            // 4. Login automatically
            return await this.handleLogin();
        } catch (error) {
            alert('Registration failed: ' + error.message);
            return null;
        }
    }
    
    generateReferralCode() {
        return 'SUP' + Math.random().toString(36).substring(2, 8).toUpperCase();
    }
    
    async processReferral(referralCode) {
        const database = new Appwrite.Database(this.client);
        
        // 1. Find referrer
        const referrers = await database.listDocuments('users', [
            Appwrite.Query.equal('referralCode', referralCode)
        ]);
        
        if (referrers.documents.length > 0) {
            const referrer = referrers.documents[0];
            
            // 2. Update referrer's stats
            await database.updateDocument('users', referrer.$id, {
                referralCount: referrer.referralCount + 1,
                referralEarnings: referrer.referralEarnings + 1000
            });
            
            // 3. Create referral record
            await database.createDocument('referrals', {
                referrer: referrer.$id,
                referred: (await this.account.get()).$id,
                amount: 1000,
                status: 'pending'
            });
        }
    }
    
    async logout() {
        try {
            await this.account.deleteSession('current');
            window.location.reload();
        } catch (error) {
            console.error('Logout error:', error);
        }
    }
}

const authService = new AuthService();
