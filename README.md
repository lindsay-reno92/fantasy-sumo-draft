# Fantasy Sumo Draft

A fantasy sports application for sumo wrestling.

<!-- Deployment: Updated Vercel config for faster builds -->

## ✨ Features

- 🎯 **100-Point Draft System** - Strategic budget management
- 🎨 **Color-Coded Rankings** - Yellow, Blue, Green, White tiers
- 🤼 **42 Real Rikishi** - Current sumo wrestlers with real stats
- 📊 **Detailed Stats** - Tournament records, physical stats, popularity
- 🔧 **Admin Mode** - Adjust point values (password: "admin")
- 📱 **Responsive Design** - Works on all devices
- 🔒 **Draft Finalization** - Lock in your selections

## 🚀 Quick Start

### Local Development

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd fantasy-sumo-draft
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd client && npm install && cd ..
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000/api

## 🌐 Deploy to Vercel (Recommended)

### Method 1: GitHub Integration (Easiest)

1. **Push your code to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/fantasy-sumo-draft.git
   git push -u origin main
   ```

2. **Deploy on Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Vercel will automatically detect and deploy!

3. **Set Environment Variables** (optional)
   - In Vercel dashboard → Settings → Environment Variables
   - Add: `SESSION_SECRET` = `your-secret-key-here`

### Method 2: Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login and deploy**
   ```bash
   vercel login
   vercel
   ```

3. **Follow the prompts**
   - Choose your settings
   - Your app will be deployed instantly!

## 🏗️ Alternative Deployment Options

### Railway

1. Go to [railway.app](https://railway.app)
2. Connect your GitHub repo
3. Add environment variables if needed
4. Deploy automatically!

### Render

1. Go to [render.com](https://render.com)
2. Create a new "Web Service"
3. Connect your repository
4. Use these settings:
   - Build Command: `npm run build`
   - Start Command: `npm start`

### Netlify + Heroku

**Frontend (Netlify):**
1. Build the client: `cd client && npm run build`
2. Upload the `build` folder to Netlify

**Backend (Heroku):**
1. Create a Heroku app
2. Push your server code
3. Update your API URLs

## 📁 Project Structure

```
fantasy-sumo-draft/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── types.ts       # TypeScript types
│   │   └── App.css        # Styles
├── server/                 # Node.js backend
│   ├── routes/            # API routes
│   ├── database/          # SQLite database
│   └── index.js           # Express server
├── rikishi_data.csv       # Sumo wrestler data
├── vercel.json            # Vercel configuration
└── package.json           # Project dependencies
```

## 🎮 How to Use

1. **Enter Your Sumo Name** - No password needed!
2. **Browse Rikishi** - Organized by color-coded tiers
3. **Draft Wisely** - You have 100 points to spend
4. **View Details** - Click any rikishi for detailed stats
5. **Finalize** - Lock in your draft when satisfied
6. **Admin Mode** - Use password "admin" to edit values

## 🛠️ Tech Stack

- **Frontend:** React, TypeScript, CSS3
- **Backend:** Node.js, Express
- **Database:** SQLite
- **Deployment:** Vercel (recommended)
- **Data:** Real sumo wrestler statistics

## 🎯 Customization

### Update Rikishi Data

1. Edit `rikishi_data.csv` with new data
2. Redeploy the app
3. Database will automatically update

### Modify Point Values

- Use the admin panel (password: "admin")
- Or edit the CSV file directly

### Change Styling

- Edit `client/src/App.css`
- Customize colors, fonts, layout

## 📝 API Endpoints

- `POST /api/auth/login` - User login
- `GET /api/rikishi` - Get all rikishi
- `POST /api/draft/select/:id` - Draft a rikishi
- `DELETE /api/draft/deselect/:id` - Remove from draft
- `POST /api/draft/finalize` - Lock the draft
- `PUT /api/rikishi/:id/value` - Update point value (admin)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🎌 About Sumo

This app celebrates the ancient sport of sumo wrestling with real rikishi data, bringing the excitement of the dohyo to fantasy sports fans worldwide!

---

**Built with ❤️ for sumo fans everywhere** 🏟️ 