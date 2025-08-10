class AuthService {
    constructor() {
        this.client = new Appwrite.Client()
            .setEndpoint('https://cloud.appwrite.io/v1')
            .setProject('supremeamer-app');
        this.account = new Appwrite.Account(this.client);
        this.database = new Appwrite.Database(this.client);
        this.initAuthForms();
    }

    initAuthForms() {
        document.getElementById('auth-forms').innerHTML = `
            <div id="login-form">
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" id="login-email" class="form-control" placeholder="your@email.com">
                </div>
                <div class="form-group">
                    <label>Password</label>
                    <input type="password" id="login-password" class="form-control" placeholder="••••••••">
                </div>
                <button id="login-btn" class="btn btn-primary">Login</button>
                <p class="auth-switch">New user? <a href="#" id="show-register">Register</a></p>
            </div>
            <div id="register-form" class="hidden">
                <div class="form-group">
                    <label>Name</label>
                    <input type="text" id="register-name" class="form-control" placeholder="Your Name">
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" id="register-email" class="form-control" placeholder="your@email.com">
                </div>
                <div class="form-group">
                    <label>Password</label>
                    <input type="password" id="register-password" class="form-control" placeholder="••••••••">
                </div>
                <div class="form-group">
                    <label>Referral Code (optional)</label>
                    <input type="text" id="register-referral" class="form-control" placeholder="SUP123">
                </div>
                <button id="register-btn" class="btn btn-primary">Register</button>
                <p class="auth-switch">Have an account? <a href="#" id="show-login">Login</a></p>
            </div>
        `;

        // Form switching
        document.getElementById('show-register').addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('login-form').classList.add('hidden');
            document.getElementById('register-form').classList.remove('hidden');
        });

        document.getElementById('show-login').addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('register-form').classList.add('hidden');
            document.getElementById('login-form').classList.remove('hidden');
        });

        // Auth handlers
        document.getElementById('login-btn').addEventListener('click', this.handleLogin.bind(this));
        document.getElementById('register-btn').addEventListener('click', this.handleRegister.bind(this));
    }

    async handleLogin() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            await this.account.createEmailSession(email, password);
            const user = await this.account.get();
            
            // Show app content
            document.getElementById('auth-modal').style.display = 'none';
            document.getElementById('app-container').classList.remove('hidden');
            
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
            const userDoc = {
                name,
                email,
                tokenBalance: 0,
                referralCount: 0,
                referralEarnings: 0,
                miningPackage: 'none',
                referralCode: this.generateReferralCode()
            };

            await this.database.createDocument('users', userDoc);
            
            // 3. Process referral if exists
            if (referralCode) {
                await this.processReferral(referralCode);
            }
            
            // 4. Login automatically
            return this.handleLogin();
        } catch (error) {
            alert('Registration failed: ' + error.message);
            return null;
        }
    }

    generateReferralCode() {
        return 'SUP' + Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    async processReferral(referralCode) {
        try {
            // Find referrer
            const referrers = await this.database.listDocuments('users', [
                `referralCode=${referralCode}`
            ]);

            if (referrers.documents.length > 0) {
                const referrer = referrers.documents[0];
                const currentUser = await this.account.get();
                
                // Update referrer's stats
                await this.database.updateDocument('users', referrer.$id, {
                    referralCount: referrer.referralCount + 1,
                    referralEarnings: referrer.referralEarnings + 1000
                });
                
                // Create referral record
                await this.database.createDocument('referrals', {
                    referrer: referrer.$id,
                    referred: currentUser.$id,
                    amount: 1000,
                    status: 'pending'
                });
            }
        } catch (error) {
            console.error('Referral processing error:', error);
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