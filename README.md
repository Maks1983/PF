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
- User with sudo privileges
- MariaDB server accessible at `10.150.50.7:3306`

### One-Command Deployment

```bash
# Make the deployment script executable and run it
chmod +x deploy.sh && ./deploy.sh
```

This script will:
- Install Node.js 20.x, Nginx, and all dependencies
- Configure firewall and security settings
- Set up the application with systemd service
- Configure daily backups
- Start the web server

### Manual Configuration

After deployment, configure your database connection:

```bash
# Edit the environment file
sudo nano /opt/personal-finance/.env

# Update these values:
DB_HOST=10.150.50.7
DB_PORT=3306
DB_NAME=personal_finance
DB_USER=your_username
DB_PASSWORD=your_password

# Restart the application
sudo systemctl restart personal-finance
```

## Access Your Application

Once deployed, access your application at:
- `http://YOUR_SERVER_IP`
- `http://localhost` (if accessing locally)

## Management Commands

```bash
# Monitor application status
/opt/personal-finance/monitor.sh

# Update application
/opt/personal-finance/update.sh

# View application logs
sudo journalctl -u personal-finance -f

# Restart services
sudo systemctl restart personal-finance
sudo systemctl restart nginx
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
```

### Project Structure

```
├── src/                    # React frontend
│   ├── components/         # React components
│   ├── hooks/             # Custom React hooks
│   ├── services/          # Frontend services
│   └── utils/             # Utility functions
├── server/                # Node.js backend (future use)
│   ├── dbConnection.ts    # Database connection
│   └── debtFunctions.ts   # Debt-related functions
├── deploy.sh              # Deployment script
└── README.md
```

## Database Schema

The application uses MariaDB with the following tables:

- `loans` - Main loan/debt data
- `scenarios` - Debt payoff scenarios (future use)
- `scheduled_payments` - Automated payment schedules (future use)
- `applied_strategies` - Active debt strategies (future use)

## Security Features

- UFW firewall configuration
- Fail2ban intrusion prevention
- Nginx security headers
- Daily automated backups
- Environment variable protection

## Backup and Recovery

Backups are automatically created daily at 2 AM and stored in `/opt/backups/personal-finance/`.

### Manual Backup
```bash
/usr/local/bin/backup-personal-finance.sh
```

### Restore from Backup
```bash
cd /opt/personal-finance
sudo tar -xzf /opt/backups/personal-finance/app_backup_YYYYMMDD_HHMMSS.tar.gz
sudo systemctl restart personal-finance nginx
```

## Troubleshooting

### Check Service Status
```bash
sudo systemctl status personal-finance
sudo systemctl status nginx
```

### View Logs
```bash
# Application logs
sudo journalctl -u personal-finance -n 50

# Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### Common Issues

1. **Database Connection Failed**
   - Verify database credentials in `.env`
   - Check network connectivity to `10.150.50.7:3306`
   - Ensure MariaDB user has proper permissions

2. **Application Won't Start**
   - Check Node.js version: `node --version` (should be 20.x)
   - Verify all dependencies: `npm install`
   - Check application logs: `sudo journalctl -u personal-finance -f`

3. **Nginx 502 Error**
   - Ensure application service is running: `sudo systemctl start personal-finance`
   - Check if port 3000 is available: `netstat -tlnp | grep 3000`

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