# SOC Attack Simulator

A production-ready security operations center (SOC) platform that simulates real-world attack detection workflows. Teams use it to demonstrate brute-force and XSS detection, test alert responses, and train on SOC monitoring practices.

**Live Demo:** [View on Render](#render-deployment)

## What It Does

**Attack Simulation:**
- Simulate brute-force login attempts from different IP addresses
- Test XSS payload detection with script-tag patterns
- Observe real-time alert generation and response suggestions

**Detection & Alerting:**
- Detects brute force: ≥5 failed logins from the same IP → High severity alert
- Detects XSS: payloads containing `<script>` tags → Medium severity alert
- Automatically generates actionable alerts with suggested responses
- Stores alerts in memory or MongoDB for persistence

**Dashboard Operations:**
- Live alert table with Type, Severity, Timestamp, Suggested Action
- Filter alerts by severity (Low, Medium, High)
- Search alerts by attack type or response action
- Export alerts to CSV (filtered or all)
- Clear alerts with confirmation modal
- Responsive design for desktop and mobile

## Quick Start

```bash
git clone https://github.com/Pragatingle1234/soc-attack-simulator.git
cd soc-attack-simulator
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

## Key Features

- Attack simulation forms for brute-force and XSS testing
- Real-time detection engine with intelligent alerting
- Interactive dashboard with filtering, search, and export
- Production middleware: Helmet, CORS, compression, rate limiting
- Optional MongoDB persistence or in-memory fallback
- Docker and Render deployment support

## Attack Demo

### Brute Force (5 attempts trigger alert)
1. Go to "Login Attack Simulation"
2. Enter username, password (wrong), and IP
3. Click "Send Login Attempt" 5 times
4. Observe High severity "Brute Force" alert

### XSS Payload Detection
1. Go to "XSS Payload Simulation"
2. Paste: `<script>alert('xss')</script>`
3. Click "Test XSS Input"
4. Observe Medium severity "XSS" alert

## Architecture

```
Frontend (React + Vite)
         ↓ HTTP/REST
Backend (Express.js)
         ↓ Optional
    MongoDB
```

**Detection Pipeline:**
1. User submits attack simulation
2. Backend validates and sanitizes input
3. Detection engines check for patterns
4. Alerts generated with type, severity, suggestion
5. Alerts stored (memory or MongoDB)
6. Dashboard fetches and displays alerts

## Deployment

### Local Development
```bash
npm install
npm run dev
```

### Production Build
```bash
npm install
npm start
```

### Docker
```bash
docker build -t soc-attack-simulator .
docker run -p 5000:5000 --env-file .env soc-attack-simulator
```

### Render (Recommended)
This repo includes `render.yaml` for one-click deployment:
1. Connect repository to Render
2. Render auto-detects configuration
3. Add `MONGODB_URI` for persistent alerts
4. Deploy!

## API Endpoints

- `POST /api/login` - Simulate login attempt
- `POST /api/xss-test` - Test XSS detection
- `GET /api/alerts` - Retrieve alerts
- `DELETE /api/alerts` - Clear alerts
- `GET /api/health` - Health check

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite |
| Backend | Express.js, Node.js |
| Security | Helmet, CORS, Rate Limit |
| Persistence | MongoDB (optional) |
| Deployment | Docker, Render |

## Use Cases

- **Security Training**: Teach attack detection workflows
- **SOC Demo**: Showcase detection capabilities
- **Incident Response**: Practice alert handling
- **Product Demo**: Show security features
- **Education**: Learn attack detection patterns

## License

MIT - Use freely for educational and commercial purposes

## Disclaimer

This is an educational simulation tool, not a production SOC platform. Use for learning and demonstrations only.
