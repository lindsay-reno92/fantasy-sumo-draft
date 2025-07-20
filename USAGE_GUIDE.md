# Fantasy Sumo League - Usage Guide 🏟️

## Getting Started

Your Fantasy Sumo League app is now running! Here's how to use it:

### 📍 Access URLs
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000

### 🚀 First Steps

1. **Open your browser** and go to http://localhost:3000
2. **Create an account** by clicking "Sign Up" and entering your details
3. **Create your first league** or join an existing one with a league code

## 🎮 How to Play

### Creating a League
1. Click "Create League" on your dashboard
2. Enter a league name and set max teams (2-20)
3. Optionally set a draft date
4. Share the generated 6-character code with friends!

### Joining a League  
1. Click "Join League"
2. Enter the 6-character league code from a friend
3. Choose your team name
4. Start drafting wrestlers!

### Building Your Team
1. Click "Enter League" → "Manage Your Team"
2. Click "Draft Wrestler" to see available wrestlers
3. You can draft up to 5 wrestlers per team
4. Consider different ranks and win percentages
5. Release wrestlers if needed to make room for better ones

## 🏆 Scoring System

- **Win**: 3 points per victory
- **Loss**: 0 points
- **Tournament Champion**: 10 bonus points
- **Perfect Record**: 5 bonus points

## 📋 Wrestler Ranks (Highest to Lowest)
- **Yokozuna** 🥇 - Grand Champion
- **Ozeki** 🥈 - Champion
- **Sekiwake** 🥉 - Junior Champion  
- **Komusubi** 🏅 - Small Champion
- **Maegashira** 🎖️ - Front of the Pack

## 🛠️ Admin Features

### Adding Match Results
You can add match results via API to simulate tournament outcomes:

```bash
curl -X POST http://localhost:5000/api/wrestlers/match-result \
  -H "Content-Type: application/json" \
  -d '{
    "wrestlerId": 1,
    "tournament": "November 2024",
    "day": 1,
    "opponent": "Takakeisho",
    "result": "win"
  }'
```

## 🔧 Development Commands

```bash
# Start both servers
npm run dev

# Start only backend
npm run server

# Start only frontend
npm run client

# Install all dependencies
npm run install-all
```

## 📱 Features

✅ User registration and authentication  
✅ League creation and management  
✅ Team drafting system  
✅ Real-time leaderboards  
✅ Wrestler statistics  
✅ Responsive design  
✅ Beautiful modern UI  
✅ Match result tracking  

## 🐛 Troubleshooting

### Common Issues

1. **"Network error"** - Make sure both servers are running (`npm run dev`)
2. **Port conflicts** - Backend runs on :5000, frontend on :3000
3. **Database issues** - Database is auto-created in `/database/fantasy_sumo.db`

### Sample Data
The app comes with 15 real sumo wrestlers already loaded:
- Terunofuji (Yokozuna)
- Takakeisho, Kiribayama (Ozeki) 
- Daieisho, Wakamotoharu, Kotozakura (Sekiwake)
- And 9 Maegashira wrestlers

## 🎯 Next Steps

Want to expand the app? Consider adding:
- Tournament brackets
- Push notifications  
- Mobile app version
- Advanced statistics
- Social features
- Real-time match updates

---

**Enjoy your Fantasy Sumo League!** 🤼‍♂️

Have fun competing with friends and may the best sumo manager win! 🏆 