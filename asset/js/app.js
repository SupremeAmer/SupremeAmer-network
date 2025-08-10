class SupremeAmerApp {
    constructor() {
        this.currentPage = 'dashboard';
        this.init();
    }
    
    async init() {
        // Check authentication state
        const user = await authService.checkAuthState();
        
        if (user) {
            // Initialize wallet connection if available
            if (window.ethereum && window.ethereum.selectedAddress) {
                await walletService.connect();
            }
            
            // Load initial page
            this.loadPage(this.currentPage);
            
            // Initialize event listeners
            this.initEventListeners();
            
            // Initialize PWA
            this.initPWA();
        }
    }
    
    initEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                this.currentPage = item.dataset.page;
                this.loadPage(this.currentPage);
                
                // Update active state
                document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
            });
        });
    }
    
    async loadPage(page) {
        const mainContent = document.getElementById('main-content');
        
        switch(page) {
            case 'dashboard':
                mainContent.innerHTML = await this.getDashboardHTML();
                break;
            case 'earn':
                mainContent.innerHTML = await this.getEarnHTML();
                break;
            case 'market':
                mainContent.innerHTML = await this.getMarketHTML();
                break;
            case 'mining':
                mainContent.innerHTML = await this.getMiningHTML();
                break;
        }
    }
    
    async getDashboardHTML() {
        // Load user data
        const user = await authService.account.get();
        const userDoc = await authService.database.getDocument('users', user.$id);
        
        // Load recent ads
        const ads = await adService.getAds();
        const recentAds = ads.slice(0, 3);
        
        return `
            <div class="dashboard">
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title"><i class="fas fa-user"></i> User Profile</h2>
                    </div>
                    <div class="user-profile">
                        <div class="user-avatar">
                            <i class="fas fa-user-astronaut"></i>
                        </div>
                        <div class="user-info">
                            <h2>${userDoc.name}</h2>
                            <p>${userDoc.status || 'Basic Member'} | Level ${userDoc.level || 1}</p>
                            <p>Joined: ${new Date(userDoc.$createdAt).toLocaleDateString()}</p>
                        </div>
                    </div>
                    <div class="stats">
                        <div class="stat-card">
                            <div class="stat-label">SupremeAmer Balance</div>
                            <div class="stat-value">${userDoc.tokenBalance || 0}</div>
                            <div class="stat-label">Tokens</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Total Earnings</div>
                            <div class="stat-value">${userDoc.totalEarnings || 0}</div>
                            <div class="stat-label">Tokens</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Referrals</div>
                            <div class="stat-value">${userDoc.referralCount || 0}</div>
                            <div class="stat-label">Users</div>
                        </div>
                    </div>
                </div>
                
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title"><i class="fas fa-chart-line"></i> Quick Actions</h2>
                    </div>
                    <div class="actions-grid">
                        <button class="btn btn-primary" id="add-funds-btn">
                            <i class="fas fa-plus-circle"></i> Add Funds
                        </button>
                        <button class="btn btn-success" id="cash-out-btn">
                            <i class="fas fa-wallet"></i> Cash Out Tokens
                        </button>
                        <button class="btn btn-accent" id="history-btn">
                            <i class="fas fa-history"></i> Transaction History
                        </button>
                    </div>
                </div>
            </div>
            
            <h2 class="section-title"><i class="fas fa-ad"></i> Recent Advertisements</h2>
            <div class="ads-grid" id="recent-ads">
                ${recentAds.length > 0 ? 
                    recentAds.map(ad => this.getAdCardHTML(ad)).join('') :
                    '<div class="no-ads">No advertisements available yet</div>'
                }
            </div>
        `;
    }
    
    getAdCardHTML(ad) {
        return `
            <div class="ad-card">
                <div class="ad-image" style="background:linear-gradient(45deg, ${this.getCategoryColor(ad.category)}, ${this.getCategoryColor(ad.category, true)})">
                    <div class="ad-category">${ad.category.charAt(0).toUpperCase() + ad.category.slice(1)}</div>
                </div>
                <div class="ad-content">
                    <h3 class="ad-title">${ad.title}</h3>
                    <div class="ad-meta">
                        <span><i class="fas fa-user"></i> ${ad.creator.substring(0, 6)}...${ad.creator.substring(ad.creator.length - 4)}</span>
                        <span class="ad-reach"><i class="fas fa-bullseye"></i> ${ad.reach} Reaches</span>
                    </div>
                    <p>${ad.description.substring(0, 100)}${ad.description.length > 100 ? '...' : ''}</p>
                    <div class="ad-actions">
                        <button class="btn btn-primary participate-btn" data-ad-id="${ad.$id}">Participate</button>
                    </div>
                </div>
            </div>
        `;
    }
    
    getCategoryColor(category, secondary = false) {
        const colors = {
            crypto: ['#3498db', '#9b59b6'],
            facebook: ['#3b5998', '#8b9dc3'],
            instagram: ['#405de6', '#5851db'],
            twitter: ['#1da1f2', '#1a91da'],
            telegram: ['#0088cc', '#00aced'],
            youtube: ['#ff0000', '#e52d27'],
            discord: ['#7289da', '#5865F2'],
            referral: ['#2ecc71', '#27ae60']
        };
        
        return colors[category] ? 
            (secondary ? colors[category][1] : colors[category][0]) : 
            (secondary ? '#9b59b6' : '#3498db');
    }
    
    initPWA() {
        let deferredPrompt;
        
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            
            // Show install button
            const installBtn = document.createElement('button');
            installBtn.id = 'install-btn';
            installBtn.className = 'btn btn-success';
            installBtn.innerHTML = '<i class="fas fa-download"></i> Install App';
            document.body.appendChild(installBtn);
            
            installBtn.addEventListener('click', () => {
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then((choiceResult) => {
                    if (choiceResult.outcome === 'accepted') {
                        console.log('User accepted install');
                    }
                    deferredPrompt = null;
                });
            });
        });

        window.addEventListener('appinstalled', () => {
            console.log('PWA was installed');
            const installBtn = document.getElementById('install-btn');
            if (installBtn) installBtn.remove();
        });
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new SupremeAmerApp();
});