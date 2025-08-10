class WalletService {
    constructor() {
        this.web3 = null;
        this.contract = null;
        this.userAddress = null;
        this.connected = false;
        
        // Initialize with your contract ABI and address
        this.contractABI = []; // Your SupremeAmer Token ABI
        this.contractAddress = '0x...'; // Your token contract address
        
        this.initEventListeners();
    }
    
    initEventListeners() {
        document.getElementById('connect-wallet').addEventListener('click', this.connect.bind(this));
        
        // Listen for account changes
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length === 0) {
                    this.disconnect();
                } else {
                    this.userAddress = accounts[0];
                    this.updateUI();
                }
            });
        }
    }
    
    async connect() {
        if (typeof window.ethereum !== 'undefined') {
            try {
                // Request account access
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                this.userAddress = accounts[0];
                
                // Initialize Web3
                this.web3 = new Web3(window.ethereum);
                
                // Initialize contract
                this.contract = new this.web3.eth.Contract(this.contractABI, this.contractAddress);
                
                this.connected = true;
                this.updateUI();
                
                return true;
            } catch (error) {
                console.error('Wallet connection error:', error);
                return false;
            }
        } else {
            alert('Please install MetaMask or another Ethereum wallet!');
            return false;
        }
    }
    
    async updateUI() {
        if (!this.userAddress) return;
        
        // Update wallet address display
        document.getElementById('wallet-address').textContent = 
            `${this.userAddress.substring(0, 6)}...${this.userAddress.substring(this.userAddress.length - 4)}`;
        
        // Update balances
        await this.updateBnbBalance();
        await this.updateTokenBalance();
    }
    
    async updateBnbBalance() {
        const balance = await this.web3.eth.getBalance(this.userAddress);
        const bnbBalance = this.web3.utils.fromWei(balance, 'ether');
        document.getElementById('bnb-balance').textContent = `${parseFloat(bnbBalance).toFixed(4)} BNB`;
    }
    
    async updateTokenBalance() {
        const balance = await this.contract.methods.balanceOf(this.userAddress).call();
        return this.web3.utils.fromWei(balance, 'ether');
    }
    
    async sendBNB(toAddress, amount) {
        const weiAmount = this.web3.utils.toWei(amount.toString(), 'ether');
        const tx = await this.web3.eth.sendTransaction({
            from: this.userAddress,
            to: toAddress,
            value: weiAmount
        });
        return tx.transactionHash;
    }
    
    async transferTokens(toAddress, amount) {
        const weiAmount = this.web3.utils.toWei(amount.toString(), 'ether');
        const tx = await this.contract.methods.transfer(toAddress, weiAmount)
            .send({ from: this.userAddress });
        return tx.transactionHash;
    }
    
    disconnect() {
        this.connected = false;
        this.userAddress = null;
        document.getElementById('wallet-address').textContent = 'Not connected';
        document.getElementById('bnb-balance').textContent = '0.00 BNB';
    }
}

const walletService = new WalletService();