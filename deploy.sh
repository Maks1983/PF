#!/bin/bash

# Personal Finance Manager - Debian Container Deployment Script
# Focused deployment without Nginx or firewall

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root in Debian containers"
   print_status "Please run: su - root, then execute this script"
   exit 1
fi

print_status "🚀 Starting Personal Finance Manager deployment..."

# Update system packages
print_status "Updating system packages..."
apt update && apt upgrade -y

# Install required system dependencies
print_status "Installing system dependencies..."
apt install -y \
    curl \
    wget \
    git \
    build-essential \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release \
    unzip \
    vim \
    htop \
    net-tools \
    python3

# Install Node.js 20.x (LTS)
print_status "Installing Node.js 20.x..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
else
    print_warning "Node.js already installed: $(node --version)"
fi

# Verify Node.js and npm installation
NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
print_success "Node.js version: $NODE_VERSION"
print_success "npm version: $NPM_VERSION"

# Install PM2 globally for process management
print_status "Installing PM2 process manager..."
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
else
    print_warning "PM2 already installed: $(pm2 --version)"
fi

# Install TypeScript globally
print_status "Installing TypeScript..."
npm install -g typescript

# Create application directory
APP_DIR="/opt/personal-finance"
print_status "Creating application directory: $APP_DIR"
mkdir -p $APP_DIR

# Copy application files
print_status "Copying application files..."
cp -r . $APP_DIR/
cd $APP_DIR

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    print_status "Creating .env file from template..."
    cp .env.example .env
    print_warning "Please edit .env file with your database credentials:"
    print_warning "  DB_HOST=10.150.50.7"
    print_warning "  DB_USER=your_username"
    print_warning "  DB_PASSWORD=your_password"
    print_warning "  DB_NAME=personal_finance"
fi

# Install Node.js dependencies
print_status "Installing Node.js dependencies..."
npm install

# Build the backend
print_status "Building backend..."
mkdir -p backend/dist
npm run build:server

# Build the frontend
print_status "Building frontend..."
mkdir -p frontend/dist
npm run build
# Copy frontend build to frontend/dist
cp -r dist/* frontend/dist/

# Create PM2 ecosystem file
print_status "Creating PM2 ecosystem configuration..."
tee ecosystem.config.js > /dev/null <<'EOF'
module.exports = {
  apps: [{
    name: 'personal-finance-backend',
    script: './backend/dist/server/index.js',
    cwd: '/opt/personal-finance',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/personal-finance/error.log',
    out_file: '/var/log/personal-finance/out.log',
    log_file: '/var/log/personal-finance/combined.log',
    time: true
  }]
};
EOF

# Create log directory
mkdir -p /var/log/personal-finance

# Create systemd service for PM2
print_status "Creating systemd service..."
tee /etc/systemd/system/personal-finance.service > /dev/null <<EOF
[Unit]
Description=Personal Finance Manager
After=network.target

[Service]
Type=forking
User=root
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
ExecStart=/usr/bin/pm2 start ecosystem.config.js --no-daemon
ExecReload=/usr/bin/pm2 reload ecosystem.config.js
ExecStop=/usr/bin/pm2 stop ecosystem.config.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd and start service
systemctl daemon-reload
systemctl enable personal-finance
systemctl start personal-finance

# Create backup script
print_status "Creating backup script..."
tee /usr/local/bin/backup-personal-finance.sh > /dev/null <<'EOF'
#!/bin/bash
# Personal Finance Manager Backup Script

BACKUP_DIR="/opt/backups/personal-finance"
DATE=$(date +%Y%m%d_%H%M%S)
APP_DIR="/opt/personal-finance"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup application files
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz -C $APP_DIR .

# Keep only last 7 days of backups
find $BACKUP_DIR -name "app_backup_*.tar.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/app_backup_$DATE.tar.gz"
EOF

chmod +x /usr/local/bin/backup-personal-finance.sh

# Create daily backup cron job
print_status "Setting up daily backups..."
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-personal-finance.sh") | crontab -

# Create update script
print_status "Creating update script..."
tee $APP_DIR/update.sh > /dev/null <<'EOF'
#!/bin/bash
# Personal Finance Manager Update Script

set -e

APP_DIR="/opt/personal-finance"
cd $APP_DIR

echo "🔄 Updating Personal Finance Manager..."

# Pull latest changes (if using git)
if [ -d .git ]; then
    git pull origin main
fi

# Install/update dependencies
npm install

# Build backend
npm run build:server

# Build frontend
npm run build
cp -r dist/* frontend/dist/

# Restart services
systemctl restart personal-finance

echo "✅ Update completed successfully!"
EOF

chmod +x $APP_DIR/update.sh

# Create monitoring script
print_status "Creating monitoring script..."
tee $APP_DIR/monitor.sh > /dev/null <<'EOF'
#!/bin/bash
# Personal Finance Manager Monitoring Script

echo "=== Personal Finance Manager Status ==="
echo ""

echo "📊 System Resources:"
echo "CPU Usage: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)%"
echo "Memory Usage: $(free | grep Mem | awk '{printf("%.1f%%", $3/$2 * 100.0)}')"
echo "Disk Usage: $(df -h / | awk 'NR==2{printf "%s", $5}')"
echo ""

echo "🔧 Services Status:"
echo "Personal Finance Backend: $(systemctl is-active personal-finance)"
echo ""

echo "📈 PM2 Status:"
pm2 status
echo ""

echo "🌐 Network:"
echo "Backend listening on port 3000"
echo ""

echo "📝 Recent logs (last 10 lines):"
journalctl -u personal-finance -n 10 --no-pager
EOF

chmod +x $APP_DIR/monitor.sh

# Create simple HTTP server script for frontend
print_status "Creating frontend HTTP server script..."
tee $APP_DIR/serve.sh > /dev/null <<'EOF'
#!/bin/bash
# Simple HTTP server for frontend access

APP_DIR="/opt/personal-finance"
cd $APP_DIR/frontend/dist

# Get server IP
SERVER_IP=$(hostname -I | awk '{print $1}')

echo "🌐 Starting frontend HTTP server on port 8080..."
echo "Access your application at: http://$SERVER_IP:8080"
echo "Press Ctrl+C to stop"

python3 -m http.server 8080 --bind 0.0.0.0
EOF

chmod +x $APP_DIR/serve.sh

# Final status check
print_status "Performing final status check..."
sleep 5

# Check services
BACKEND_STATUS=$(systemctl is-active personal-finance)

print_success "=== Deployment Summary ==="
print_success "Application directory: $APP_DIR"
print_success "Backend service status: $BACKEND_STATUS"
print_success "PM2 process manager: $(pm2 --version)"
print_success "Daily backups scheduled"
print_success ""

# Get server IP
SERVER_IP=$(hostname -I | awk '{print $1}')
print_success "🎉 Deployment completed successfully!"
print_success ""
print_success "Backend API:"
print_success "  Service: systemctl start/stop/restart personal-finance"
print_success "  Logs: journalctl -u personal-finance -f"
print_success "  PM2: pm2 status, pm2 logs"
print_success ""
print_success "Frontend Access:"
print_success "  HTTP Server: $APP_DIR/serve.sh"
print_success "  URL: http://$SERVER_IP:8080"
print_success ""
print_success "Management:"
print_success "  Monitor: $APP_DIR/monitor.sh"
print_success "  Update: $APP_DIR/update.sh"
print_success "  Backup: /usr/local/bin/backup-personal-finance.sh"
print_success ""

if [ ! -f .env ]; then
    print_warning "⚠️  Don't forget to configure your .env file with database credentials!"
    print_warning "   Edit: $APP_DIR/.env"
    print_warning "   Then restart: systemctl restart personal-finance"
fi

print_success "🔒 Features included:"
print_success "  - PM2 process management with auto-restart"
print_success "  - Systemd service integration"
print_success "  - Daily automated backups (7-day retention)"
print_success "  - Monitoring and update scripts"
print_success "  - Separate backend/frontend builds"