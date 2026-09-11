# Cloud Deployment and Multi-Device Sync Guide: Command Planner V9

A complete, production-grade guide to deploying Command Planner V9 to the cloud, synchronizing data across your phone, tablet, and computers, and locking access so that only you can use it.

---

## Table of Contents

- [1. Architecture: Private Cloud Sync Model](#1-architecture-private-cloud-sync-model)
- [2. Securing Your App: Zero-Trust Access Control](#2-securing-your-app-zero-trust-access-control)
- [3. Deployment Method A (Recommended for Maximum Privacy): Tailscale Private Mesh](#3-deployment-method-a-recommended-for-maximum-privacy-tailscale-private-mesh)
  - [Why Tailscale Is Ideal for Personal Productivity](#why-tailscale-is-ideal-for-personal-productivity)
  - [Step 1: Set Up Cloud Host (VPS or Home Server)](#step-1-set-up-cloud-host-vps-or-home-server)
  - [Step 2: Run Command Planner via Docker or Systemd](#step-2-run-command-planner-via-docker-or-systemd)
  - [Step 3: Connect Your Phone and Devices](#step-3-connect-your-phone-and-devices)
- [4. Deployment Method B (Access Anywhere with Custom Domain): Cloudflare Zero Trust Tunnel](#4-deployment-method-b-access-anywhere-with-custom-domain-cloudflare-zero-trust-tunnel)
  - [How Cloudflare Access Protects Your App](#how-cloudflare-access-protects-your-app)
  - [Step 1: Deploy on Any Cloud VPS or PaaS](#step-1-deploy-on-any-cloud-vps-or-paas)
  - [Step 2: Create a Cloudflare Tunnel](#step-2-create-a-cloudflare-tunnel)
  - [Step 3: Add Cloudflare Access Email / Passkey Protection](#step-3-add-cloudflare-access-email--passkey-protection)
- [5. Deployment Method C (Quick Cloud Platform): Render or Railway](#5-deployment-method-c-quick-cloud-platform-render-or-railway)
  - [Dockerfile for Full-Stack Cloud Deployment](#dockerfile-for-full-stack-cloud-deployment)
  - [Persistent Volume Setup for SQLite](#persistent-volume-setup-for-sqlite)
- [6. Application-Layer Security: Adding an API Key Middleware](#6-application-layer-security-adding-an-api-key-middleware)
- [7. Installing on Mobile Devices (iOS & Android PWA)](#7-installing-on-mobile-devices-ios--android-pwa)
  - [Installing on iPhone / iPad (Safari)](#installing-on-iphone--ipad-safari)
  - [Installing on Android (Chrome)](#installing-on-android-chrome)
- [8. Automated Cloud Backup Strategy](#8-automated-cloud-backup-strategy)
- [9. Multi-Device Sync Verification Checklist](#9-multi-device-sync-verification-checklist)

---

## 1. Architecture: Private Cloud Sync Model

When Command Planner V9 is deployed in client-server mode, the cloud server acts as the single source of truth for your academic and personal productivity data:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              YOUR PRIVATE CLOUD                             │
│                  (VPS, Cloud Container, or Home Mini-PC)                    │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                    FastAPI Backend (Port 8000)                        │  │
│  │  • Serves 13 REST API Endpoints                                       │  │
│  │  • Serves Precompiled React 19 Frontend Static Assets                 │  │
│  └──────────────────────────────────┬────────────────────────────────────┘  │
│                                     │                                       │
│                                     ▼                                       │
│                          SQLite 3 Database (WAL Mode)                       │
│                        /data/planner.db (Persistent)                        │
└─────────────────────────────────────▲───────────────────────────────────────┘
                                      │
               Encrypted Tunnel (WireGuard / HTTPS / Zero Trust)
                                      │
     ┌────────────────────────────────┼────────────────────────────────┐
     ▼                                ▼                                ▼
┌──────────────┐              ┌──────────────┐              ┌──────────────────┐
│ iPhone / iPad│              │Android Phone │              │ Laptop / Desktop │
│ (Safari PWA) │              │ (Chrome PWA) │              │ (Any Browser)    │
│              │              │              │              │                  │
│ Full-Screen  │              │ Full-Screen  │              │ Full Dashboard   │
│ Touch UI     │              │ Touch UI     │              │ Keyboard Ctrl+K  │
└──────────────┘              └──────────────┘              └──────────────────┘
```

### How Synchronization Works
1. **Instant Updates**: Whenever you create a task, check off a syllabus topic, or record a Pomodoro interval on your phone, an HTTP request updates `planner.db` on your cloud server immediately.
2. **Instant Reflection**: When you open your laptop or tablet, it queries the same cloud server. You see the exact same tasks, test countdowns, and notes.
3. **No Third-Party Cloud Leaks**: You do not store your data in Google, Notion, or proprietary cloud silos. The server and the database belong 100% to you.

---

## 2. Securing Your App: Zero-Trust Access Control

Because Command Planner V9 contains your personal exams, coursework, and schedule, **it must never be left publicly open to the internet**.

You have two industry-standard ways to ensure only you can access it:

1. **Network-Level Perimeter (Tailscale)**: The server has no public IP or open internet ports. Only devices authenticated into your private Tailscale network can reach the server.
2. **Identity-Level Perimeter (Cloudflare Zero Trust)**: The app has a web address (e.g. `planner.yourname.com`), but Cloudflare intercepts all visitors and requires your personal email OTP (one-time code) or Passkey / Face ID before granting access.

---

## 3. Deployment Method A (Recommended for Maximum Privacy): Tailscale Private Mesh

Tailscale creates a secure, encrypted peer-to-peer mesh network (powered by WireGuard) between your cloud server, phone, and computers.

### Why Tailscale Is Ideal for Personal Productivity
- **Zero Open Ports**: Your firewall blocks all incoming traffic from the public internet. Port scanners and automated internet bots cannot see your server.
- **Zero Login Screens to Type on Mobile**: As long as your phone is running the Tailscale app, your browser can immediately open `http://planner:8000`.
- **Completely Free**: Tailscale is free for personal use up to 100 devices.

---

### Step 1: Set Up Cloud Host (VPS or Home Server)

You can use any affordable cloud VPS (such as a $4/month server on Hetzner, DigitalOcean, Linode, or OVH) running Ubuntu 22.04 or Debian 12. Alternatively, you can use a spare mini-PC or Raspberry Pi at home.

Install Tailscale on the server:
```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```
Follow the URL printed in the terminal to authenticate the server into your Tailscale account.

Note the server's Tailscale MagicDNS name (for example: `planner-server.your-tailnet.ts.net`) or Tailscale IP (e.g. `100.85.20.14`).

---

### Step 2: Run Command Planner via Docker or Systemd

#### Option 1: Using Docker (Cleanest)

Create a `docker-compose.yml` file on your server:

```yaml
version: '3.8'

services:
  command-planner:
    build: .
    container_name: command-planner
    restart: unless-stopped
    ports:
      - "127.0.0.1:8000:8000"
    volumes:
      - ./data:/app/data
    environment:
      - DB_DIR=/app/data
```

#### Option 2: Running Directly with Systemd

Clone your repository and set up the environment:
```bash
git clone https://github.com/Rajratna-D/Command-Planner-V9.git
cd Command-Planner-V9

# Backend environment
python3 -m venv .venv
source .venv/bin/activate
pip install fastapi uvicorn sqlalchemy pydantic

# Build frontend
cd frontend
npm install
npm run build
cd ..
```

Create a systemd service file at `/etc/systemd/system/planner.service`:

```ini
[Unit]
Description=Command Planner V9 Full-Stack Service
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/Command-Planner-V9
ExecStart=/home/ubuntu/Command-Planner-V9/.venv/bin/uvicorn backend.main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now planner
```

---

### Step 3: Connect Your Phone and Devices

1. Download the **Tailscale** app on your iPhone (App Store) or Android (Google Play).
2. Sign in with the exact same account you used on the server.
3. Turn on the VPN switch in the Tailscale app.
4. Open your phone's browser and go to:
   `http://planner-server:8000` (or `http://100.x.y.z:8000`)
5. The application loads instantly. Any change you make is saved directly to the server.

---

## 4. Deployment Method B (Access Anywhere with Custom Domain): Cloudflare Zero Trust Tunnel

If you want to access your planner from any computer without installing Tailscale first, use a Cloudflare Tunnel protected by Cloudflare Access.

### How Cloudflare Access Protects Your App
1. You bind your app to a private tunnel: `https://planner.yourdomain.com`.
2. When anyone navigates to that URL, Cloudflare blocks them with an authentication screen.
3. You enter your personal email address. Cloudflare sends a 6-digit one-time PIN (or prompts for your device's biometric Passkey).
4. Only your specified email address is authorized. Anyone else is denied entry.

---

### Step 1: Deploy on Any Cloud VPS or PaaS

Ensure your application is running on port 8000 on your server.

### Step 2: Create a Cloudflare Tunnel

1. Log into your free [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Navigate to **Zero Trust** -> **Networks** -> **Tunnels**.
3. Click **Create Tunnel**, choose **Cloudflared**, and give it a name (e.g. `planner-tunnel`).
4. Install the cloudflared connector on your server following the one-line command provided by Cloudflare:
   ```bash
   sudo cloudflared service install <YOUR_TUNNEL_TOKEN>
   ```
5. In the Cloudflare Tunnel UI, set up a **Public Hostname**:
   - Subdomain: `planner`
   - Domain: `yourdomain.com`
   - Type: `HTTP`
   - URL: `localhost:8000`

Now, `https://planner.yourdomain.com` routes securely to your local FastAPI app over an outbound encrypted tunnel. You do not need to open any incoming firewall ports!

---

### Step 3: Add Cloudflare Access Email / Passkey Protection

1. In the Cloudflare Zero Trust dashboard, go to **Access** -> **Applications**.
2. Click **Add an Application** -> **Self-hosted**.
3. Set Application Name: `Command Planner V9`.
4. Domain: `planner.yourdomain.com`.
5. Under **Policies**, create an Allow policy:
   - Action: `Allow`
   - Rule type: `Include`
   - Selector: `Emails`
   - Value: `your-personal-email@gmail.com`
6. Click **Save**.

Now, nobody in the world can view your app without your email verification or biometric Passkey.

---

## 5. Deployment Method C (Quick Cloud Platform): Render or Railway

If you prefer not to manage a virtual private server, you can deploy using platforms like Render or Railway with Docker.

### Dockerfile for Full-Stack Cloud Deployment

Create a `Dockerfile` in the root of your project:

```dockerfile
# Stage 1: Build Frontend Assets
FROM node:20-alpine AS frontend-builder
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Production Python Backend
FROM python:3.11-slim
WORKDIR /app

# Install dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ ./backend

# Copy compiled frontend assets from Stage 1
COPY --from=frontend-builder /frontend/dist ./frontend/dist

# Expose port
EXPOSE 8000

# Set environment variable for persistent storage
ENV DB_DIR=/data
VOLUME ["/data"]

# Launch application
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Persistent Volume Setup for SQLite

When deploying to Render or Railway:
1. Attach a **Persistent Disk / Volume** mounted to `/data`.
2. Configure `backend/database.py` to read `DB_DIR`:

```python
import os

DB_DIR = os.getenv("DB_DIR", os.path.dirname(os.path.abspath(__file__)))
os.makedirs(DB_DIR, exist_ok=True)
DB_PATH = os.path.join(DB_DIR, "planner.db")
DATABASE_URL = f"sqlite:///{DB_PATH}"
```

This guarantees that restarting the container never deletes your tasks, notes, or test schedules.

---

## 6. Application-Layer Security: Adding an API Key Middleware

If you deploy to a public cloud without Tailscale or Cloudflare Access, you can add a simple, highly effective API key middleware directly inside FastAPI.

Add this middleware to `backend/main.py`:

```python
import os
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse

APP_SECRET_KEY = os.getenv("APP_SECRET_KEY", "your-custom-private-key-12345")

@app.middleware("http")
async def verify_private_access(request: Request, call_next):
    # Allow static assets and health check
    if request.url.path.startswith("/assets") or request.url.path == "/health":
        return await call_next(request)
    
    # Check query param, header, or cookie
    api_key = (
        request.headers.get("X-API-Key")
        or request.query_params.get("key")
        or request.cookies.get("cp_key")
    )
    
    if api_key != APP_SECRET_KEY:
        # Prompt for key if visiting root in browser
        if request.url.path == "/" and request.query_params.get("key") is None:
            return JSONResponse(
                status_code=401,
                content={"error": "Unauthorized. Please provide ?key=YOUR_SECRET_KEY"}
            )
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    response = await call_next(request)
    # Set cookie on successful authentication
    response.set_cookie("cp_key", APP_SECRET_KEY, max_age=60*60*24*30, httponly=True)
    return response
```

With this middleware, visiting `https://your-app.onrender.com/?key=your-custom-private-key-12345` once stores an encrypted authentication cookie in your mobile or desktop browser for 30 days.

---

## 7. Installing on Mobile Devices (iOS & Android PWA)

Command Planner V9 is designed responsively. When added to your home screen, it hides browser navigation bars and functions like a native mobile application.

### Installing on iPhone / iPad (Safari)

1. Connect to your private URL (via Tailscale or Cloudflare Access) in **Safari**.
2. Tap the **Share** button (the square with an arrow pointing up).
3. Scroll down and tap **Add to Home Screen**.
4. Name it **Command Planner** and tap **Add**.
5. Launch the app from your home screen icon. It will open in full-screen standalone mode.

### Installing on Android (Chrome)

1. Open your private URL in **Google Chrome**.
2. Tap the **three-dot menu** in the top-right corner.
3. Tap **Install app** or **Add to Home Screen**.
4. Tap **Install**.
5. The application will be added to your app drawer and home screen.

---

## 8. Automated Cloud Backup Strategy

Because your cloud server holds your single source of truth, automated daily backups ensure you never lose data even if a server crashes.

Create a lightweight daily backup cron job on your server:

```bash
# Open crontab editor
crontab -e
```

Add this line to back up the database daily at 3:00 AM and keep the last 30 daily snapshots:

```bash
0 3 * * * sqlite3 /data/planner.db ".backup '/data/backups/planner_backup_$(date +\%Y\%m\%d).db'" && find /data/backups -name "planner_backup_*.db" -mtime +30 -delete
```

This uses SQLite's built-in online backup API, which safely copies the database even while reads and writes are active without locking the file.

---

## 9. Multi-Device Sync Verification Checklist

Before relying on your cloud deployment for daily planning:

- [ ] **Access Protection**: Try opening your planner URL in an incognito window without authentication. Confirm that access is blocked.
- [ ] **Mobile Touch Test**: Open the dashboard on your phone. Confirm that tabs, task completion toggles, and Pomodoro controls respond smoothly to touch gestures.
- [ ] **Real-Time Sync Test**:
  1. Open the app on your computer.
  2. Open the app on your phone.
  3. Create a task on your phone.
  4. Refresh your computer screen and confirm the new task appears immediately.
- [ ] **Data Durability**: Restart your cloud container or reboot the server. Confirm that all records and test dates remain intact.
- [ ] **Offline Resilience**: Turn on Airplane mode on your phone. Verify that existing cached tasks remain viewable without crashing.
