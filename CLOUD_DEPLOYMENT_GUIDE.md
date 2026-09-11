# Cloud Deployment and Multi-Device Sync Guide: Command Planner V9

A comprehensive, production-grade guide to deploying Command Planner V9 to the cloud, synchronizing data across your phone, tablet, and computers, locking access so that only you can use it, and avoiding common deployment pitfalls.

---

## Table of Contents

- [1. Architecture: Private Cloud Sync Model](#1-architecture-private-cloud-sync-model)
- [2. In-App Authentication: Adding a Single-User Login for Yourself](#2-in-app-authentication-adding-a-single-user-login-for-yourself)
  - [Is It Good to Add In-App Auth Just for Yourself?](#is-it-good-to-add-in-app-auth-just-for-yourself)
  - [Complete Single-User Auth Implementation Blueprint](#complete-single-user-auth-implementation-blueprint)
  - [Frontend Login Screen Component (LoginModal.tsx)](#3-frontend-login-screen-component-frontendsrccomponentsauthloginmodaltsx)
  - [In-App Auth vs Network Auth (Tailscale / Cloudflare Access)](#in-app-auth-vs-network-auth-tailscale--cloudflare-access)
- [3. Five Deployment Options Compared](#3-five-deployment-options-compared)
  - [Option 1: Tailscale Private Mesh (Zero Public Exposure)](#option-1-tailscale-private-mesh-zero-public-exposure)
  - [Option 2: Cloudflare Zero Trust Tunnel (Free Domain + Passkey/OTP)](#option-2-cloudflare-zero-trust-tunnel-free-domain--passkeyotp)
  - [Option 3: VPS + Docker + Caddy (Automated HTTPS on Cheap VPS)](#option-3-vps--docker--caddy-automated-https-on-cheap-vps)
  - [Option 4: Fly.io (Global Edge Container with Persistent NVMe Volume)](#option-4-flyio-global-edge-container-with-persistent-nvme-volume)
  - [Option 5: Home Mini-PC / Raspberry Pi (Zero Monthly Cloud Costs)](#option-5-home-mini-pc--raspberry-pi-zero-monthly-cloud-costs)
- [4. Eight Critical Deployment Mistakes and How to Avoid Them](#4-eight-critical-deployment-mistakes-and-how-to-avoid-them)
  - [Mistake 1: Ephemeral Container Storage (Database Reset on Redeploy)](#mistake-1-ephemeral-container-storage-database-reset-on-redeploy)
  - [Mistake 2: Storing SQLite on Network Drives (WAL Corruption)](#mistake-2-storing-sqlite-on-network-drives-wal-corruption)
  - [Mistake 3: Exposing Port 8000 to Public Internet Without Auth](#mistake-3-exposing-port-8000-to-public-internet-without-auth)
  - [Mistake 4: Running Unencrypted HTTP on Public Networks](#mistake-4-running-unencrypted-http-on-public-networks)
  - [Mistake 5: Hardcoded CORS Origins](#mistake-5-hardcoded-cors-origins)
  - [Mistake 6: Forgetting to Build the Frontend Before Deploying](#mistake-6-forgetting-to-build-the-frontend-before-deploying)
  - [Mistake 7: Process Termination on SSH Disconnect](#mistake-7-process-termination-on-ssh-disconnect)
  - [Mistake 8: Keeping Backups on the Same Virtual Disk](#mistake-8-keeping-backups-on-the-same-virtual-disk)
- [5. Step-by-Step Setup for Each Deployment Option](#5-step-by-step-setup-for-each-deployment-option)
- [6. Installing on Mobile Devices (iOS and Android PWA)](#6-installing-on-mobile-devices-ios-and-android-pwa)
- [7. Automated Off-Site Cloud Backup Pipeline](#7-automated-off-site-cloud-backup-pipeline)
- [8. Multi-Device Sync Verification Checklist](#8-multi-device-sync-verification-checklist)

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

## 2. In-App Authentication: Adding a Single-User Login for Yourself

### Is It Good to Add In-App Auth Just for Yourself?

**Yes, absolutely.** If you want to access your planner from any device or public computer simply by navigating to a URL and typing a master password (without needing VPNs or client software installed), an in-app authentication system is clean and convenient.

#### The Core Principles for Single-User In-App Auth:
1. **No User Registration**: You do not need a sign-up flow, email confirmation, or password recovery endpoints. Those only add security surface area.
2. **Master Password Hash**: Store a single salted bcrypt hash of your master password in an environment variable (`MASTER_PASSWORD_HASH`).
3. **Secure HTTP-Only Session Cookie**: When you log in, FastAPI sets an `HttpOnly`, `SameSite=Lax`, `Secure` cookie containing a signed JWT token valid for 30 days. You only have to log in once a month per device.
4. **Brute-Force Rate Limiting**: Limit login attempts to 5 failed attempts per minute per IP address to block dictionary attacks.

---

### Complete Single-User Auth Implementation Blueprint

#### 1. Backend Authentication Router (`backend/routers/auth.py`)

```python
import os
import time
from fastapi import APIRouter, Response, Request, HTTPException, status, Depends
from pydantic import BaseModel
import hmac
import hashlib
import json
import base64

router = APIRouter(prefix="/auth", tags=["auth"])

# Master password hash and JWT secret from environment
MASTER_PASSWORD = os.getenv("APP_MASTER_PASSWORD", "ChangeThisToYourStrongSecretPassword123!")
JWT_SECRET = os.getenv("JWT_SECRET", "super-secret-signing-key-minimum-32-chars")
COOKIE_NAME = "cp_session"

# Simple in-memory rate limiter: IP -> list of failed timestamps
failed_attempts = {}

class LoginPayload(BaseModel):
    password: str

def create_token(payload: dict) -> str:
    header = base64.urlsafe_b64encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode()).decode().rstrip("=")
    body = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")
    signature = hmac.new(JWT_SECRET.encode(), f"{header}.{body}".encode(), hashlib.sha256).digest()
    sig_b64 = base64.urlsafe_b64encode(signature).decode().rstrip("=")
    return f"{header}.{body}.{sig_b64}"

def verify_token(token: str) -> bool:
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return False
        header, body, sig = parts
        expected_sig = hmac.new(JWT_SECRET.encode(), f"{header}.{body}".encode(), hashlib.sha256).digest()
        actual_sig = base64.urlsafe_b64decode(sig + "==")
        if not hmac.compare_digest(expected_sig, actual_sig):
            return False
        payload = json.loads(base64.urlsafe_b64decode(body + "==").decode())
        if payload.get("exp", 0) < time.time():
            return False
        return True
    except Exception:
        return False

@router.post("/login")
def login(payload: LoginPayload, request: Request, response: Response):
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    
    # Rate limit check (max 5 failed attempts in 60 seconds)
    recent_fails = [t for t in failed_attempts.get(client_ip, []) if now - t < 60]
    failed_attempts[client_ip] = recent_fails
    if len(recent_fails) >= 5:
        raise HTTPException(status_code=429, detail="Too many failed attempts. Try again in 1 minute.")
    
    # Verify password
    if not hmac.compare_digest(payload.password, MASTER_PASSWORD):
        failed_attempts[client_ip].append(now)
        raise HTTPException(status_code=401, detail="Incorrect master password")
    
    # Reset failed attempts on success
    failed_attempts.pop(client_ip, None)
    
    # Issue 30-day session token
    token = create_token({"sub": "owner", "exp": now + (30 * 86400)})
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        max_age=30 * 86400,
        httponly=True,
        samesite="lax",
        secure=request.url.scheme == "https",
    )
    return {"status": "authenticated"}

@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(COOKIE_NAME)
    return {"status": "logged_out"}

@router.get("/status")
def auth_status(request: Request):
    token = request.cookies.get(COOKIE_NAME)
    is_valid = bool(token and verify_token(token))
    return {"authenticated": is_valid}
```

#### 2. Protecting All API Routes in `backend/main.py`

Register the auth middleware so all data requests require a valid session cookie:

```python
from fastapi import Request
from fastapi.responses import JSONResponse
from backend.routers.auth import COOKIE_NAME, verify_token

@app.middleware("http")
async def require_auth(request: Request, call_next):
    # Allow authentication endpoints, health check, and static frontend assets without token
    path = request.url.path
    if (
        path.startswith("/auth")
        or path == "/health"
        or path.startswith("/assets")
        or path.endswith((".js", ".css", ".ico", ".svg", ".woff2"))
    ):
        return await call_next(request)
    
    # If hitting an API endpoint, verify session cookie
    if path.startswith(("/tasks", "/tests", "/assignments", "/practicals", "/lists", "/syllabus", "/pomodoro", "/notes", "/productivity", "/settings", "/analytics", "/archive", "/backup")):
        token = request.cookies.get(COOKIE_NAME)
        if not token or not verify_token(token):
            return JSONResponse(status_code=401, content={"detail": "Authentication required"})
            
    return await call_next(request)
```

#### 3. Frontend Login Screen Component (`frontend/src/components/auth/LoginModal.tsx`)

A clean, responsive React component that prompts for the master password when unauthenticated:

```tsx
import React, { useState } from 'react';
import { Lock, ArrowRight, AlertCircle } from 'lucide-react';

interface LoginModalProps {
  onSuccess: () => void;
}

export default function LoginModal({ onSuccess }: LoginModalProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ detail: 'Invalid password' }));
        throw new Error(data.detail || 'Authentication failed');
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Incorrect master password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-md p-8 rounded-2xl bg-[#121624] border border-white/10 shadow-2xl">
        <div className="flex items-center justify-center w-12 h-12 mb-6 rounded-xl bg-brand-500/10 text-brand-500 mx-auto">
          <Lock size={24} />
        </div>

        <h2 className="text-xl font-bold text-center text-white mb-2">
          Command Planner V9
        </h2>
        <p className="text-sm text-center text-white/60 mb-6">
          Enter your private master password to access your planner.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Master Password"
              className="w-full px-4 py-3 text-sm rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-brand-500 transition-colors"
              autoFocus
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-danger-500 bg-danger-500/10 p-3 rounded-lg border border-danger-500/20">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 font-semibold text-sm text-white transition-all disabled:opacity-50"
          >
            <span>{loading ? 'Authenticating...' : 'Unlock Planner'}</span>
            <ArrowRight size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
```

---

### In-App Auth vs Network Auth (Tailscale / Cloudflare Access)

| Dimension | In-App Master Password | Tailscale Mesh VPN | Cloudflare Zero Trust |
|---|---|---|---|
| **Client Requirement** | None (Any web browser) | Tailscale app on device | None (Browser only) |
| **Login Friction** | Type password once/month | Zero login screens | Email 6-digit OTP or Face ID |
| **Internet Visibility** | Exposed to internet | Hidden from internet | Protected by Cloudflare edge |
| **Best For** | Accessing from any device | Highest privacy & zero ports | Custom domain + maximum security |

---

## 3. Five Deployment Options Compared

| Option | Cost | Setup Time | Public Ports Open | Security Level | Best For |
|---|---|---|---|---|---|
| **1. Tailscale Mesh** | Free | 5 minutes | Zero (Firewall drops all) | Highest (WireGuard) | Personal devices only |
| **2. Cloudflare Tunnel** | Free | 10 minutes | Zero (Outbound tunnel) | Highest (Zero Trust Gate) | Custom domain + zero open ports |
| **3. VPS + Docker + Caddy** | $3 to $5/mo | 15 minutes | Ports 80 & 443 | High (Automated TLS) | Full independent server control |
| **4. Fly.io Edge** | $0 to $3/mo | 10 minutes | Managed HTTPS | High | Managed deployment with NVMe volume |
| **5. Home Mini-PC / Pi** | $0/mo | 20 minutes | Zero (via Tailscale) | Highest | 100% hardware ownership |

---

## 4. Eight Critical Deployment Mistakes and How to Avoid Them

### Mistake 1: Ephemeral Container Storage (Database Reset on Redeploy)
- **The Disaster**: You deploy to Render, Railway, or Heroku without attaching a persistent volume. When the server automatically redeploys, restarts, or sleeps, the local container filesystem is discarded. Your `planner.db` and all your tasks disappear.
- **The Fix**: Always declare a persistent disk/volume mounted to `/data` and configure `DB_PATH = "/data/planner.db"`.

---

### Mistake 2: Storing SQLite on Network Drives (WAL Corruption)
- **The Disaster**: You mount an AWS EFS, Azure File Share, or NFS/SMB network folder to store `planner.db`. In Write-Ahead Logging (WAL) mode, SQLite uses shared-memory files (`planner.db-shm`) that require POSIX byte-range locking. Network filesystems do not support these locks correctly, causing `disk I/O error` or database corruption.
- **The Fix**: Always place `planner.db` on local block storage (NVMe SSD, VPS root drive, or EBS block volume).

---

### Mistake 3: Exposing Port 8000 to Public Internet Without Auth
- **The Disaster**: You run `uvicorn.run(app, host="0.0.0.0", port=8000)` on an AWS EC2 instance or DigitalOcean droplet with no password and no firewall. Search engines like Shodan or Censys scan the IPv4 space and index your personal schedule within hours.
- **The Fix**: Either bind to `127.0.0.1` and expose exclusively through Tailscale/Cloudflare Tunnel, or place Caddy/Nginx in front with HTTPS and authentication.

---

### Mistake 4: Running Unencrypted HTTP on Public Networks
- **The Disaster**: You access `http://your-server-ip:8000` over unencrypted HTTP while connected to a coffee shop, campus, or airport Wi-Fi. Anyone on the same network running packet capture tools can inspect your HTTP traffic, reading your notes and tasks.
- **The Fix**: Always use HTTPS with a Let's Encrypt certificate (automated via Caddy or Cloudflare Tunnel).

---

### Mistake 5: Hardcoded CORS Origins
- **The Disaster**: In `backend/main.py`, `CORSMiddleware` only allows `["http://localhost:5173"]`. When you access the app on `https://planner.yourdomain.com`, all API calls fail with CORS error `Access-Control-Allow-Origin header missing`.
- **The Fix**: In cloud deployment where FastAPI serves both frontend and API from the same port, CORS is not even needed (it is same-origin). If using separate subdomains, ensure your production domain is added to `allow_origins`.

---

### Mistake 6: Forgetting to Build the Frontend Before Deploying
- **The Disaster**: You upload the repository to your VPS and start Uvicorn, but forget to run `npm run build` inside `frontend/`. FastAPI attempts to mount `frontend/dist`, finds nothing, and visiting `/` returns `{"error": "Not Found"}`.
- **The Fix**: Use a multi-stage Docker build that builds the frontend in Stage 1 and copies it to the backend container in Stage 2.

---

### Mistake 7: Process Termination on SSH Disconnect
- **The Disaster**: You SSH into your VPS, run `uvicorn backend.main:app`, and close the terminal. As soon as your SSH connection drops, the operating system terminates the process.
- **The Fix**: Run the server as a background systemd service (`sudo systemctl enable --now planner`) or inside Docker (`docker-compose up -d`).

---

### Mistake 8: Keeping Backups on the Same Virtual Disk
- **The Disaster**: You write backups to `/data/backups/`. If the VPS disk corrupts or your cloud provider account has a billing issue, your database and your backups are lost simultaneously.
- **The Fix**: Use `rclone` or a simple script to synchronize daily backups to a private S3 bucket, Google Drive, or your local computer.

---

## 5. Step-by-Step Setup for Each Deployment Option

### Option 1: Tailscale Private Mesh (Zero Open Ports)

1. **On your server** (Ubuntu/Debian):
   ```bash
   curl -fsSL https://tailscale.com/install.sh | sh
   sudo tailscale up
   ```
2. **Run Command Planner** (via systemd or Docker):
   ```bash
   # Clone and build
   git clone https://github.com/Rajratna-D/Command-Planner-V9.git
   cd Command-Planner-V9
   cd frontend && npm install && npm run build && cd ..
   python3 -m venv .venv && source .venv/bin/activate
   pip install fastapi uvicorn sqlalchemy pydantic
   uvicorn backend.main:app --host 0.0.0.0 --port 8000
   ```
3. **On your phone/laptop**: Install Tailscale, log into the same account, and navigate to:
   `http://planner-server:8000`

---

### Option 2: Cloudflare Zero Trust Tunnel (Custom Domain + OTP)

1. Install `cloudflared` on your server:
   ```bash
   curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
   sudo dpkg -i cloudflared.deb
   ```
2. In Cloudflare Dashboard: **Zero Trust** -> **Networks** -> **Tunnels** -> **Create Tunnel**.
3. Point the public hostname `planner.yourdomain.com` to `http://localhost:8000`.
4. In **Access** -> **Applications**, add a policy allowing only your email address (`yourname@gmail.com`).

---

### Option 3: VPS + Docker + Caddy (Automated HTTPS)

Create `Caddyfile`:
```caddy
planner.yourdomain.com {
    reverse_proxy localhost:8000
}
```
Caddy automatically requests, verifies, and renews a free Let's Encrypt SSL certificate. You never have to manually configure certbot or SSL keys.

---

### Option 4: Fly.io Edge Deployment

1. Install Flyctl and log in:
   ```bash
   curl -L https://fly.io/install.sh | sh
   fly auth login
   ```
2. Create `fly.toml`:
   ```toml
   app = "my-command-planner"
   primary_region = "iad"

   [build]
     dockerfile = "Dockerfile"

   [mounts]
     source = "planner_data"
     destination = "/data"

   [http_service]
     internal_port = 8000
     force_https = true
     auto_stop_machines = true
     auto_start_machines = true
     min_machines_running = 0
   ```
3. Create a 1GB persistent NVMe volume:
   ```bash
   fly volumes create planner_data --size 1
   ```
4. Deploy:
   ```bash
   fly deploy
   ```
Fly automatically provisions HTTPS on `https://my-command-planner.fly.dev` and shuts down the container when not in use to keep monthly costs near zero.

---

## 6. Installing on Mobile Devices (iOS and Android PWA)

Command Planner V9 is fully responsive:

- **On iPhone / iPad (Safari)**: Open your private URL -> tap **Share** -> tap **Add to Home Screen**.
- **On Android (Google Chrome)**: Open your private URL -> tap the **three dots** -> tap **Install app**.

The application launches full-screen with its own app icon and no browser navigation bars.

---

## 7. Automated Off-Site Cloud Backup Pipeline

Configure a daily cron job that copies your SQLite database using the non-blocking SQLite backup API, compresses it, and syncs it off-site:

```bash
#!/bin/bash
BACKUP_DIR="/data/backups"
TIMESTAMP=$(date +\%Y\%m\%d_\%H\%M\%S)
mkdir -p "$BACKUP_DIR"

# 1. Non-blocking SQLite atomic snapshot
sqlite3 /data/planner.db ".backup '$BACKUP_DIR/planner_$TIMESTAMP.db'"

# 2. Compress
gzip "$BACKUP_DIR/planner_$TIMESTAMP.db"

# 3. Keep 14 days of local backups
find "$BACKUP_DIR" -name "planner_*.db.gz" -mtime +14 -delete

# 4. Optional: Sync off-site to Backblaze B2, S3, or Google Drive via rclone
# rclone sync "$BACKUP_DIR" remote:my-backups/command-planner
```

---

## 8. Multi-Device Sync Verification Checklist

- [ ] **Access Gate Check**: Open your URL in an incognito window without authentication. Confirm access is rejected.
- [ ] **Persistent Storage Test**: Add a task with immediate priority. Restart the cloud container. Verify the task is still there.
- [ ] **Two-Device Real-Time Sync**: Add an exam countdown on your mobile phone. Refresh your desktop browser. Verify the exam countdown appears immediately.
- [ ] **HTTPS Verification**: Confirm that your browser shows the lock icon with a valid SSL/TLS certificate.
- [ ] **Backup Verification**: Check that daily `.db.gz` snapshots are created and can be read by `sqlite3`.
