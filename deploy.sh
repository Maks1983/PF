#!/bin/bash

# Personal Finance Manager - Debian Container Deployment Script
# This script sets up everything needed to run the application

set -e  # Exit on any error

echo "🚀 Starting Personal Finance Manager deployment..."

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
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root for security reasons"
   print_status "Please run as a regular user with sudo privileges"
   exit 1
fi

# Update system packages
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install required system dependencies
print_status "Installing system dependencies..."
sudo apt install -y \
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
    ufw \
    fail2ban

# Install Node.js 20.x (LTS)
print_status "Installing Node.js 20.x..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
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
    sudo npm install -g pm2
    # Setup PM2 to start on boot
    sudo pm2 startup systemd -u $USER --hp $HOME
else
    print_warning "PM2 already installed: $(pm2 --version)"
fi

# Create application directory
APP_DIR="/opt/personal-finance"
print_status "Creating application directory: $APP_DIR"
sudo mkdir -p $APP_DIR
sudo chown $USER:$USER $APP_DIR

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

# Build the application
print_status "Building the application..."
npm run build

# Install and configure Nginx
print_status "Installing and configuring Nginx..."
sudo apt install -y nginx

# Create Nginx configuration
sudo tee /etc/nginx/sites-available/personal-finance > /dev/null <<EOF
server {
    listen 80;
    listen [::]:80;
    
    server_name _;
    root $APP_DIR/dist;
    index index.html;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript;
    
    # Handle client-side routing
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Security: Hide sensitive files
    location ~ /\. {
        deny all;
    }
    
    location ~ \.(env|log)$ {
        deny all;
    }
}
EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/personal-finance /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
print_status "Testing Nginx configuration..."
sudo nginx -t

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Configure firewall
print_status "Configuring firewall..."
sudo ufw --force enable
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw allow 3306  # MariaDB port (if database is on same server)

# Configure fail2ban
print_status "Configuring fail2ban..."
sudo systemctl start fail2ban
sudo systemctl enable fail2ban

# Create systemd service for the application (if needed for server-side functions)
print_status "Creating systemd service..."
sudo tee /etc/systemd/system/personal-finance.service > /dev/null <<EOF
[Unit]
Description=Personal Finance Manager
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
ExecStart=/usr/bin/node server/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd and start service
sudo systemctl daemon-reload
sudo systemctl enable personal-finance
sudo systemctl start personal-finance

# Create backup script
print_status "Creating backup script..."
sudo tee /usr/local/bin/backup-personal-finance.sh > /dev/null <<'EOF'
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

sudo chmod +x /usr/local/bin/backup-personal-finance.sh

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

# Build application
npm run build

# Restart services
sudo systemctl restart personal-finance
sudo systemctl reload nginx

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
echo "Nginx: $(systemctl is-active nginx)"
echo "Personal Finance App: $(systemctl is-active personal-finance)"
echo "Fail2ban: $(systemctl is-active fail2ban)"
echo ""

echo "🌐 Network:"
echo "Nginx processes: $(pgrep nginx | wc -l)"
echo "Active connections: $(ss -tuln | grep :80 | wc -l)"
echo ""

echo "📝 Recent logs (last 10 lines):"
sudo journalctl -u personal-finance -n 10 --no-pager
EOF

chmod +x $APP_DIR/monitor.sh

# Final status check
print_status "Performing final status check..."
sleep 5

# Check services
NGINX_STATUS=$(systemctl is-active nginx)
APP_STATUS=$(systemctl is-active personal-finance)

print_success "=== Deployment Summary ==="
print_success "Application directory: $APP_DIR"
print_success "Nginx status: $NGINX_STATUS"
print_success "Application service status: $APP_STATUS"
print_success "Firewall configured and enabled"
print_success "Daily backups scheduled"
print_success ""

# Get server IP
SERVER_IP=$(hostname -I | awk '{print $1}')
print_success "🎉 Deployment completed successfully!"
print_success ""
print_success "Access your application at:"
print_success "  http://$SERVER_IP"
print_success "  http://localhost (if accessing locally)"
print_success ""
print_success "Useful commands:"
print_success "  Monitor status: $APP_DIR/monitor.sh"
print_success "  Update app: $APP_DIR/update.sh"
print_success "  View logs: sudo journalctl -u personal-finance -f"
print_success "  Restart app: sudo systemctl restart personal-finance"
print_success "  Restart nginx: sudo systemctl restart nginx"
print_success ""

if [ ! -f .env ]; then
    print_warning "⚠️  Don't forget to configure your .env file with database credentials!"
    print_warning "   Edit: $APP_DIR/.env"
    print_warning "   Then restart: sudo systemctl restart personal-finance"
fi

print_success "🔒 Security features enabled:"
print_success "  - UFW firewall configured"
print_success "  - Fail2ban intrusion prevention"
print_success "  - Nginx security headers"
print_success "  - Daily automated backups"