# Personal Finance Manager

A comprehensive debt management application built with React and TypeScript, designed for deployment in Debian containers.

## Features

- **Debt Management**: Track loans, mortgages, credit cards, and other debts
- **Strategy Optimization**: Compare avalanche, snowball, and hybrid payoff strategies
- **Payment Simulation**: Visualize the impact of extra payments and lump sums
- **Progress Tracking**: Monitor debt reduction over time with interactive charts
- **Multi-Currency Support**: Handle different currencies (USD, EUR, NOK, GBP, CAD, AUD, JPY)

## Quick Deployment (Debian Container)

### Prerequisites
- Debian 11/12 container or VM
- Root access
- MariaDB server accessible at `10.150.50.7:3306`

### One-Command Deployment

```bash
# Make the deployment script executable and run it as root
chmod +x deploy.sh && ./deploy.sh
```

This script will:
- Install Node.js 20.x, PM2, TypeScript, and all dependencies
- Build backend to backend/dist and frontend to frontend/dist
- Set up PM2 process management with systemd service
- Configure daily backups with 7-day retention
- Create monitoring, update, and HTTP server scripts

### Manual Configuration

After deployment, configure your database connection:

```bash
# Edit the environment file
nano /opt/personal-finance/.env

# Update these values:
DB_HOST=10.150.50.7
DB_PORT=3306
DB_NAME=personal_finance
DB_USER=your_username
DB_PASSWORD=your_password

# Restart the application
systemctl restart personal-finance
```

## Access Your Application

Once deployed, you have two options to access your application:

**Option 1: Backend API Service**
- PM2-managed Node.js backend runs automatically via systemd
- Backend API available on port 3000

**Option 2: Frontend HTTP Server**
```bash
/opt/personal-finance/serve.sh
# Access frontend at http://YOUR_SERVER_IP:8080
```

## Management Commands

```bash
# Monitor application status (backend, PM2, logs)
/opt/personal-finance/monitor.sh

# Update application (backend + frontend)
/opt/personal-finance/update.sh

# View backend service logs
journalctl -u personal-finance -f

# PM2 process management
pm2 status
pm2 logs
pm2 restart personal-finance-backend

# Restart backend service
systemctl restart personal-finance

# Start frontend HTTP server
/opt/personal-finance/serve.sh
```

## Development

### Local Development Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Build backend only
npm run build:server
```

### Project Structure

```
├── src/                    # React frontend source
│   ├── components/         # React components
│   ├── hooks/             # Custom React hooks
│   ├── services/          # Frontend services
│   └── utils/             # Utility functions
├── server/                # Node.js backend source
│   ├── dbConnection.ts    # Database connection
│   └── debtFunctions.ts   # Debt-related functions
├── backend/dist/          # Built backend (TypeScript → JavaScript)
├── frontend/dist/         # Built frontend (React/Vite)
├── ecosystem.config.js    # PM2 configuration
├── deploy.sh              # Deployment script
└── README.md
```

## Process Management

The application uses PM2 for robust process management:

- **Auto-restart** on crashes
- **Memory monitoring** with restart at 1GB
- **Log management** with timestamps
- **Systemd integration** for system startup

## Database Schema

The application uses MariaDB with the following tables:

- `loans` - Main loan/debt data
- `scenarios` - Debt payoff scenarios (future use)
- `scheduled_payments` - Automated payment schedules (future use)
- `applied_strategies` - Active debt strategies (future use)

## Security Features

- Daily automated backups
- PM2 process management with systemd integration
- Environment variable protection
- Separate backend/frontend builds

## Backup and Recovery

Backups are automatically created daily at 2 AM and stored in `/opt/backups/personal-finance/`.

### Manual Backup
```bash
/usr/local/bin/backup-personal-finance.sh
```

### Restore from Backup
```bash
cd /opt/personal-finance
tar -xzf /opt/backups/personal-finance/app_backup_YYYYMMDD_HHMMSS.tar.gz
systemctl restart personal-finance
```

## Troubleshooting

### Check Service Status
```bash
systemctl status personal-finance
pm2 status
```

### View Logs
```bash
# Backend service logs
journalctl -u personal-finance -n 50

# PM2 application logs
pm2 logs personal-finance-backend
```

### Common Issues

1. **Backend Database Connection Failed**
   - Verify database credentials in `.env`
   - Check network connectivity to `10.150.50.7:3306`
   - Ensure MariaDB user has proper permissions

2. **Backend Won't Start**
   - Check Node.js version: `node --version` (should be 20.x)
   - Verify all dependencies: `npm install`
   - Check PM2 status: `pm2 status`
   - Check service logs: `journalctl -u personal-finance -f`

3. **Frontend Not Accessible**
   - Ensure serve.sh is running: `/opt/personal-finance/serve.sh`
   - Check if port 8080 is accessible
   - Verify frontend build exists: `ls /opt/personal-finance/frontend/dist/`

## Future Phases

This application is designed to support multiple financial management phases:

- ✅ **Phase 1**: Debt Management (Current)
- 🔄 **Phase 2**: Current Accounts
- 🔄 **Phase 3**: Savings Management
- 🔄 **Phase 4**: Investment Tracking
- 🔄 **Phase 5**: Assets & Liabilities

All phases will use the same database connection and deployment infrastructure.

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review application logs
3. Verify database connectivity
4. Ensure all services are running

## License

This project is for personal use and financial management.