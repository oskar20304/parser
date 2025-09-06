class StockTwitsScraper {
    constructor() {
        this.currentPage = 1;
        this.pageSize = 100;
        this.currentSymbolFilter = '';
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadSymbols();
        this.loadScrapingStatus();
        this.loadData();
        this.loadLogs();
        
        setInterval(() => this.loadScrapingStatus(), 5000);
    }

    bindEvents() {
        // New simplified interface events
        document.getElementById('addSymbolBtn').addEventListener('click', () => this.handleAddSymbol());
        document.getElementById('symbolInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleAddSymbol();
        });
        document.getElementById('checkAllBtn').addEventListener('click', () => this.checkAllSymbols());
        
        // Existing events
        document.getElementById('startBtn').addEventListener('click', () => this.startScraping());
        document.getElementById('stopBtn').addEventListener('click', () => this.stopScraping());
        
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });
        
        document.getElementById('symbolFilter').addEventListener('change', (e) => {
            this.currentSymbolFilter = e.target.value;
            this.currentPage = 1;
            this.loadData();
        });
        
        document.getElementById('refreshData').addEventListener('click', () => this.loadData());
        document.getElementById('refreshLogs').addEventListener('click', () => this.loadLogs());
        
        document.getElementById('prevPage').addEventListener('click', () => this.prevPage());
        document.getElementById('nextPage').addEventListener('click', () => this.nextPage());
        
        document.querySelector('.close').addEventListener('click', () => this.closeModal());
        document.getElementById('modalCancel').addEventListener('click', () => this.closeModal());
    }

    async handleAddSymbol() {
        const input = document.getElementById('symbolInput');
        const symbol = input.value.trim().toUpperCase();
        
        if (!symbol) {
            this.showNotification('Please enter a symbol', 'error');
            return;
        }

        const data = {
            symbol: symbol,
            selector: 'watchers', // Default to watchers
            schedule: '*/15 * * * *' // Default schedule
        };

        try {
            const response = await fetch('/api/symbols', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                this.showNotification(`Symbol ${symbol} added successfully`, 'success');
                input.value = '';
                this.loadSymbols();
            } else {
                const error = await response.json();
                this.showNotification(error.error || 'Failed to add symbol', 'error');
            }
        } catch (error) {
            this.showNotification('Network error', 'error');
        }
    }

    async loadSymbols() {
        try {
            const response = await fetch('/api/symbols');
            const symbols = await response.json();
            
            this.renderSymbolsGrid(symbols);
            this.updateSymbolFilter(symbols);
        } catch (error) {
            console.error('Failed to load symbols:', error);
        }
    }

    renderSymbolsGrid(symbols) {
        const container = document.getElementById('symbolsList');
        container.innerHTML = '';

        if (symbols.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #7f8c8d;">No symbols added yet. Add CLSK and HIVE to get started!</p>';
            return;
        }

        symbols.forEach(symbol => {
            const card = document.createElement('div');
            card.className = 'symbol-card';
            card.innerHTML = `
                <button class="delete-btn" onclick="scraper.deleteSymbol(${symbol.id}, '${symbol.symbol}')" title="Delete">×</button>
                <div class="symbol-title">${symbol.symbol}</div>
                <div class="symbol-info">Added: ${new Date(symbol.created_at).toLocaleDateString()}</div>
                <div class="symbol-actions">
                    <button class="btn btn-small btn-primary" onclick="scraper.checkSingleSymbol('${symbol.symbol}')">Check Now</button>
                </div>
            `;
            container.appendChild(card);
        });
    }

    updateSymbolFilter(symbols) {
        const select = document.getElementById('symbolFilter');
        const currentValue = select.value;
        
        select.innerHTML = '<option value="">All Symbols</option>';
        
        const uniqueSymbols = [...new Set(symbols.map(s => s.symbol))];
        uniqueSymbols.forEach(symbol => {
            const option = document.createElement('option');
            option.value = symbol;
            option.textContent = symbol;
            if (symbol === currentValue) option.selected = true;
            select.appendChild(option);
        });
    }

    async deleteSymbol(id, symbol) {
        const confirmed = await this.showConfirmModal(
            'Delete Symbol',
            `Are you sure you want to delete ${symbol}? This will also delete all scraped data for this symbol.`
        );

        if (confirmed) {
            try {
                const response = await fetch(`/api/symbols/${id}`, { method: 'DELETE' });
                
                if (response.ok) {
                    this.showNotification('Symbol deleted successfully', 'success');
                    this.loadSymbols();
                } else {
                    const error = await response.json();
                    this.showNotification(error.error || 'Failed to delete symbol', 'error');
                }
            } catch (error) {
                this.showNotification('Network error', 'error');
            }
        }
    }

    async checkSingleSymbol(symbol) {
        const statusDiv = document.getElementById('checkStatus');
        statusDiv.innerHTML = `<div class="check-result">
            <div class="result-symbol">Checking ${symbol}...</div>
        </div>`;

        try {
            const response = await fetch(`/api/scrape/manual/${symbol}`, { method: 'POST' });
            const result = await response.json();
            
            if (response.ok) {
                // Get the latest data for this symbol
                const dataResponse = await fetch(`/api/data/${symbol}?limit=1`);
                const data = await dataResponse.json();
                
                if (data.length > 0 && data[0].metadata) {
                    const metadata = JSON.parse(data[0].metadata);
                    const resultHtml = `
                        <div class="check-result success">
                            <div class="result-symbol">${symbol} ✓</div>
                            <div class="result-data">Watchers: ${metadata.watchers || 'N/A'}</div>
                            <div class="result-data">Price: ${metadata.price || 'N/A'}</div>
                        </div>
                    `;
                    statusDiv.innerHTML = resultHtml;
                    this.showNotification(`${symbol} checked successfully`, 'success');
                } else {
                    statusDiv.innerHTML = `
                        <div class="check-result error">
                            <div class="result-symbol">${symbol} ⚠️</div>
                            <div>No data received</div>
                        </div>
                    `;
                }
                
                if (this.currentSymbolFilter === symbol || this.currentSymbolFilter === '') {
                    this.loadData();
                }
            } else {
                statusDiv.innerHTML = `
                    <div class="check-result error">
                        <div class="result-symbol">${symbol} ❌</div>
                        <div>Error: ${result.error}</div>
                    </div>
                `;
                this.showNotification(`Failed to check ${symbol}`, 'error');
            }
        } catch (error) {
            statusDiv.innerHTML = `
                <div class="check-result error">
                    <div class="result-symbol">${symbol} ❌</div>
                    <div>Network error</div>
                </div>
            `;
            this.showNotification('Network error', 'error');
        }
    }

    async checkAllSymbols() {
        const btn = document.getElementById('checkAllBtn');
        const btnText = btn.querySelector('.btn-text');
        const btnLoading = btn.querySelector('.btn-loading');
        const statusDiv = document.getElementById('checkStatus');
        
        // Get all symbols first
        const response = await fetch('/api/symbols');
        const symbols = await response.json();
        
        if (symbols.length === 0) {
            this.showNotification('No symbols to check. Add some symbols first.', 'error');
            return;
        }
        
        // Show loading state
        btn.disabled = true;
        btnText.style.display = 'none';
        btnLoading.style.display = 'inline';
        statusDiv.innerHTML = '<div>Checking all symbols...</div>';
        
        const results = [];
        
        for (const symbol of symbols) {
            statusDiv.innerHTML = `<div>Checking ${symbol.symbol}...</div>`;
            
            try {
                const scrapeResponse = await fetch(`/api/scrape/manual/${symbol.symbol}`, { method: 'POST' });
                
                if (scrapeResponse.ok) {
                    // Wait a moment then get the data
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    const dataResponse = await fetch(`/api/data/${symbol.symbol}?limit=1`);
                    const data = await dataResponse.json();
                    
                    if (data.length > 0 && data[0].metadata) {
                        const metadata = JSON.parse(data[0].metadata);
                        results.push({
                            symbol: symbol.symbol,
                            success: true,
                            watchers: metadata.watchers || 'N/A',
                            price: metadata.price || 'N/A'
                        });
                    } else {
                        results.push({
                            symbol: symbol.symbol,
                            success: false,
                            error: 'No data received'
                        });
                    }
                } else {
                    const error = await scrapeResponse.json();
                    results.push({
                        symbol: symbol.symbol,
                        success: false,
                        error: error.error || 'Failed to scrape'
                    });
                }
            } catch (error) {
                results.push({
                    symbol: symbol.symbol,
                    success: false,
                    error: 'Network error'
                });
            }
        }
        
        // Display results
        let resultsHtml = '<h4>Check Results:</h4>';
        results.forEach(result => {
            if (result.success) {
                resultsHtml += `
                    <div class="check-result success">
                        <div class="result-symbol">${result.symbol} ✓</div>
                        <div class="result-data">Watchers: ${result.watchers}</div>
                        <div class="result-data">Price: ${result.price}</div>
                    </div>
                `;
            } else {
                resultsHtml += `
                    <div class="check-result error">
                        <div class="result-symbol">${result.symbol} ❌</div>
                        <div>Error: ${result.error}</div>
                    </div>
                `;
            }
        });
        
        statusDiv.innerHTML = resultsHtml;
        
        // Reset button state
        btn.disabled = false;
        btnText.style.display = 'inline';
        btnLoading.style.display = 'none';
        
        const successCount = results.filter(r => r.success).length;
        this.showNotification(`Checked ${symbols.length} symbols. ${successCount} successful.`, successCount > 0 ? 'success' : 'error');
    }

    async startScraping() {
        try {
            const response = await fetch('/api/scraping/start', { method: 'POST' });
            if (response.ok) {
                this.showNotification('Scraping started', 'success');
                this.loadScrapingStatus();
            }
        } catch (error) {
            this.showNotification('Failed to start scraping', 'error');
        }
    }

    async stopScraping() {
        try {
            const response = await fetch('/api/scraping/stop', { method: 'POST' });
            if (response.ok) {
                this.showNotification('Scraping stopped', 'success');
                this.loadScrapingStatus();
            }
        } catch (error) {
            this.showNotification('Failed to stop scraping', 'error');
        }
    }

    async loadScrapingStatus() {
        try {
            const response = await fetch('/api/scraping/status');
            const status = await response.json();
            
            const statusText = document.getElementById('statusText');
            const indicatorDot = document.getElementById('indicatorDot');
            const startBtn = document.getElementById('startBtn');
            const stopBtn = document.getElementById('stopBtn');
            
            if (status.active) {
                statusText.textContent = `Running (${status.scheduledJobs.length} jobs)`;
                indicatorDot.classList.add('active');
                startBtn.disabled = true;
                stopBtn.disabled = false;
            } else {
                statusText.textContent = 'Stopped';
                indicatorDot.classList.remove('active');
                startBtn.disabled = false;
                stopBtn.disabled = true;
            }
        } catch (error) {
            console.error('Failed to load scraping status:', error);
        }
    }

    async loadData() {
        try {
            const url = `/api/data${this.currentSymbolFilter ? '/' + this.currentSymbolFilter : ''}?limit=${this.pageSize}&offset=${(this.currentPage - 1) * this.pageSize}`;
            const response = await fetch(url);
            const data = await response.json();
            
            this.renderDataTable(data);
            this.updatePagination(data.length);
        } catch (error) {
            console.error('Failed to load data:', error);
        }
    }

    renderDataTable(data) {
        const tbody = document.querySelector('#dataTable tbody');
        tbody.innerHTML = '';

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="loading">No data available</td></tr>';
            return;
        }

        data.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${item.symbol}</strong></td>
                <td class="content-preview" title="${this.escapeHtml(item.content)}">${this.escapeHtml(item.content)}</td>
                <td>${this.escapeHtml(item.author || 'N/A')}</td>
                <td>${this.escapeHtml(item.timestamp || 'N/A')}</td>
                <td>${item.likes || 0}</td>
                <td>${new Date(item.scraped_at).toLocaleString()}</td>
            `;
            tbody.appendChild(row);
        });
    }

    async loadLogs() {
        try {
            const response = await fetch('/api/logs');
            const logs = await response.json();
            
            this.renderLogsTable(logs);
        } catch (error) {
            console.error('Failed to load logs:', error);
        }
    }

    renderLogsTable(logs) {
        const tbody = document.querySelector('#logsTable tbody');
        tbody.innerHTML = '';

        if (logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="loading">No logs available</td></tr>';
            return;
        }

        logs.forEach(log => {
            const row = document.createElement('tr');
            const statusClass = log.status === 'success' ? 'status-success' : 'status-error';
            
            row.innerHTML = `
                <td><strong>${log.symbol}</strong></td>
                <td class="${statusClass}">${log.status.toUpperCase()}</td>
                <td>${this.escapeHtml(log.message || '')}</td>
                <td>${new Date(log.created_at).toLocaleString()}</td>
            `;
            tbody.appendChild(row);
        });
    }

    switchTab(tabName) {
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(tabName).classList.add('active');
        
        if (tabName === 'data') {
            this.loadData();
        } else if (tabName === 'logs') {
            this.loadLogs();
        }
    }

    prevPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.loadData();
        }
    }

    nextPage() {
        this.currentPage++;
        this.loadData();
    }

    updatePagination(dataLength) {
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');
        const pageInfo = document.getElementById('pageInfo');
        
        prevBtn.disabled = this.currentPage === 1;
        nextBtn.disabled = dataLength < this.pageSize;
        pageInfo.textContent = `Page ${this.currentPage}`;
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 20px',
            borderRadius: '4px',
            color: 'white',
            fontWeight: '500',
            zIndex: '1001',
            transition: 'all 0.3s'
        });
        
        const colors = {
            success: '#27ae60',
            error: '#e74c3c',
            info: '#3498db'
        };
        
        notification.style.backgroundColor = colors[type] || colors.info;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    showConfirmModal(title, message) {
        return new Promise((resolve) => {
            const modal = document.getElementById('modal');
            const modalTitle = document.getElementById('modalTitle');
            const modalBody = document.getElementById('modalBody');
            const confirmBtn = document.getElementById('modalConfirm');
            
            modalTitle.textContent = title;
            modalBody.textContent = message;
            modal.style.display = 'block';
            
            const handleConfirm = () => {
                modal.style.display = 'none';
                cleanup();
                resolve(true);
            };
            
            const handleCancel = () => {
                modal.style.display = 'none';
                cleanup();
                resolve(false);
            };
            
            const cleanup = () => {
                confirmBtn.removeEventListener('click', handleConfirm);
                document.getElementById('modalCancel').removeEventListener('click', handleCancel);
            };
            
            confirmBtn.addEventListener('click', handleConfirm);
            document.getElementById('modalCancel').addEventListener('click', handleCancel);
        });
    }

    closeModal() {
        document.getElementById('modal').style.display = 'none';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

const scraper = new StockTwitsScraper();