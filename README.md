# PricePilot 🛒💰

A community-driven price comparison app that helps people save money by sharing product prices across different stores.

## ✨ Features

### Core Features
- 📱 **Barcode Scanning** - Quickly find products by scanning barcodes
- 💵 **Price Tracking** - Track and compare prices across multiple stores
- 📊 **Price History** - View price trends over time
- 🗺️ **Store Locator** - Find nearby stores with the best prices
- 📝 **Shopping Lists** - Create and manage shopping lists

### Community Features (NEW!)
- 👥 **User Attribution** - See who added or edited each product
- 👍👎 **Like/Dislike System** - Vote on products, stores, and prices
- 📸 **Photo Upload** - Take photos with automatic compression
- 📝 **Edit History** - Full tracking of all changes with timestamps
- 🔄 **GitHub Database** - Use GitHub as a backend for shared data

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/PricePilot.git
cd PricePilot

# Install dependencies
npm install
####

# Run development server
npm run dev
```

### Configuration (Optional)

For GitHub database integration:

1. Copy `.env.example` to `.env`
2. Add your GitHub credentials
3. See [SETUP.md](./SETUP.md) for detailed instructions

Without GitHub configuration, the app uses localStorage automatically.

## 📖 Documentation

- [Setup Guide](./SETUP.md) - Detailed setup and configuration
- [Data Directory](./data/README.md) - Database structure and schema

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite
- **UI Components**: Radix UI, Tailwind CSS
- **State Management**: TanStack Query
- **Routing**: React Router
- **Database**: GitHub API + localStorage fallback
- **Charts**: Recharts
- **Maps**: React Leaflet
- **Barcode**: html5-qrcode

## 📱 How to Use

### Adding Products

1. Scan a barcode or search for a product
2. If not found, add it to the community database
3. Take a photo (automatically compressed)
4. Enter price and store information
5. Submit to help the community!

### Comparing Prices

1. Search for any product
2. View prices from different stores
3. See price history and trends
4. Find the best deal near you

### Editing Information

1. Click on any product or store card
2. Make your edits
3. Changes are tracked in history
4. Help keep information accurate!

### Community Interaction

1. Like products you recommend
2. Dislike incorrect or outdated information
3. View who contributed what
4. Build a trusted community database

## 🎯 Project Goals

- **Save Money** - Help people find the best prices
- **Community-Driven** - Powered by user contributions
- **Transparent** - Full edit history and attribution
- **Accessible** - Works on any device with a browser
- **Open Source** - Free and open for everyone

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Add Products** - Scan and add products you find
2. **Update Prices** - Keep prices current
3. **Report Issues** - Found a bug? Let us know
4. **Improve Code** - Submit pull requests
5. **Share Ideas** - Suggest new features

## 📄 License

MIT License - feel free to use this project for any purpose.

## 🙏 Acknowledgments

- Built with React and modern web technologies
- UI components from Radix UI and shadcn/ui
- Icons from Lucide React
- Community-driven data model

## 📞 Support

- 📧 Email: support@pricepilot.app
- 🐛 Issues: GitHub Issues
- 💬 Discussions: GitHub Discussions

---

**Made with ❤️ for the community**

Help others save money by contributing to PricePilot!
