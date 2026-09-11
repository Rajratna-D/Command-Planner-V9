# Cloud Deployment and Multi-Device Sync Guide: Command Planner V9

A comprehensive, production-grade guide to deploying Command Planner V9 to the cloud, synchronizing data across your phone, tablet, and computers, locking access so that only you can use it, and avoiding common deployment pitfalls.

---

## Table of Contents

- [1. Architecture: Private Cloud Sync Model](#1-architecture-private-cloud-sync-model)
- [2. In-App Authentication: Adding a Single-User Login for Yourself](#2-in-app-authentication-adding-a-single-user-login-for-yourself)
  - [Is It Good to Add In-App Auth Just for Yourself?](#is-it-good-to-add-in-app-auth-just-for-yourself)
  - [Complete Single-User Auth Implementation Blueprint](#complete-single-user-auth-implementation-blueprint)
  - [Frontend Login Screen Component (LoginModal.tsx)](#frontend-login-screen-component-loginmodaltsx)
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
- [5. Migrating Your Existing Local Data to the Cloud](#5-migrating-your-existing-local-data-to-the-cloud)
- [6. Step-by-Step Setup for Each Deployment Option](#6-step-by-step-setup-for-each-deployment-option)
  - [Tailscale Private Mesh Setup](#tailscale-private-mesh-setup)
  - [Free HTTPS on Private Tailscale (tailscale cert)](#free-https-on-private-tailscale-tailscale-cert)
  - [Cloudflare Zero Trust Tunnel Setup](#cloudflare-zero-trust-tunnel-setup)
  - [VPS + Docker + Caddy Setup](#vps--docker--caddy-setup)
  - [Fly.io Edge Deployment Setup](#flyio-edge-deployment-setup)
  - [Always-Free Cloud Hosting Blueprint ($0.00/Month on Oracle Cloud)](#always-free-cloud-hosting-blueprint-000month-on-oracle-cloud)
- [7. Real-Time Cross-Device Synchronization](#7-real-time-cross-device-synchronization)
  - [Level 1: Focus Auto-Refetch (Window Focus Hook)](#level-1-focus-auto-refetch-window-focus-hook)
  - [Level 2: Background Periodic Polling](#level-2-background-periodic-polling)
  - [Level 3: Server-Sent Events (SSE) Live Broadcast](#level-3-server-sent-events-sse-live-broadcast)
- [8. Installing on Mobile Devices (iOS and Android PWA)](#8-installing-on-mobile-devices-ios-and-android-pwa)
  - [Mobile Screen-Lock and Background Timer Gotchas](#mobile-screen-lock-and-background-timer-gotchas)
  - [Mobile Safe-Area Insets and Notch Handling (CSS Polish)](#mobile-safe-area-insets-and-notch-handling-css-polish)
- [9. Automated Off-Site Cloud Backup Pipeline](#9-automated-off-site-cloud-backup-pipeline)
- [10. Security Vulnerabilities and Hardening](#10-security-vulnerabilities-and-hardening)
  - [Pre-Deployment Vulnerabilities (Before You Go Live)](#pre-deployment-vulnerabilities-before-you-go-live)
  - [Post-Deployment Vulnerabilities (After You Go Live)](#post-deployment-vulnerabilities-after-you-go-live)
  - [Docker Container Hardening](#docker-container-hardening)
  - [Firewall Configuration (UFW on Ubuntu)](#firewall-configuration-ufw-on-ubuntu)
  - [Dependency Vulnerability Scanning](#dependency-vulnerability-scanning)
  - [Access Monitoring and Log Review](#access-monitoring-and-log-review)
- [11. Incident Response: What to Do If Compromised](#11-incident-response-what-to-do-if-compromised)
- [12. Multi-Device Sync Verification Checklist](#12-multi-device-sync-verification-checklist)

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

## 5. Migrating Your Existing Local Data to the Cloud

If you have already added tasks, exams, practicals, and notes to your local version on your computer (`D:\DAILY PLANNER V9\planner.db`), follow this procedure to transfer your data so you never have to start from scratch:

### Step 1: Export Clean SQLite Snapshot from Your PC
Before transferring, run SQLite online backup locally to ensure WAL journals are cleanly merged:

```powershell
# In Windows PowerShell on your PC:
cd "D:\DAILY PLANNER V9\backend"
sqlite3 planner.db ".backup 'planner_clean.db'"
```

### Step 2: Transfer the Database to Your Server via SCP
Copy the clean snapshot directly to your server's persistent storage volume:

```powershell
# Replace with your server's username and IP or Tailscale address:
scp planner_clean.db ubuntu@100.85.20.14:/data/planner.db
```

### Step 3: Set Correct Permissions on Linux
SSH into your server and ensure the user running Uvicorn owns the database file:

```bash
sudo chown ubuntu:ubuntu /data/planner.db
sudo chmod 660 /data/planner.db
```

When you start the cloud server, it immediately boots with all your existing tasks, exam countdowns, syllabus progress, and Pomodoro logs intact.

---

## 6. Step-by-Step Setup for Each Deployment Option

### Tailscale Private Mesh Setup

1. **On your server** (Ubuntu/Debian):
   ```bash
   curl -fsSL https://tailscale.com/install.sh | sh
   sudo tailscale up
   ```
2. **Run Command Planner** (via systemd or Docker):
   ```bash
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

### Free HTTPS on Private Tailscale (tailscale cert)

Mobile browsers require HTTPS for certain progressive web app features. Tailscale provides free automated Let's Encrypt certificates for private MagicDNS domains:

1. On your server, run:
   ```bash
   sudo tailscale cert planner-server.your-tailnet.ts.net
   ```
   This generates `planner-server.your-tailnet.ts.net.crt` and `planner-server.your-tailnet.ts.net.key`.
2. Launch Uvicorn with the SSL certificates:
   ```bash
   uvicorn backend.main:app --host 0.0.0.0 --port 443 --ssl-keyfile planner-server.your-tailnet.ts.net.key --ssl-certfile planner-server.your-tailnet.ts.net.crt
   ```
Now your phone can open `https://planner-server.your-tailnet.ts.net` with full trusted green lock HTTPS and zero security warnings.

---

### Cloudflare Zero Trust Tunnel Setup

1. Install `cloudflared` on your server:
   ```bash
   curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
   sudo dpkg -i cloudflared.deb
   ```
2. In Cloudflare Dashboard: **Zero Trust** -> **Networks** -> **Tunnels** -> **Create Tunnel**.
3. Point the public hostname `planner.yourdomain.com` to `http://localhost:8000`.
4. In **Access** -> **Applications**, add a policy allowing only your email address (`yourname@gmail.com`).

---

### VPS + Docker + Caddy Setup

Create `Caddyfile`:
```caddy
planner.yourdomain.com {
    reverse_proxy localhost:8000
}
```
Caddy automatically requests, verifies, and renews a free Let's Encrypt SSL certificate. You never have to manually configure certbot or SSL keys.

---

### Fly.io Edge Deployment Setup

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

---

### Always-Free Cloud Hosting Blueprint ($0.00/Month on Oracle Cloud)

Oracle Cloud Infrastructure (OCI) offers an **Always Free** tier that never expires and requires zero monthly payments:

1. **Sign up**: Create a free tier account at `oracle.com/cloud/free`.
2. **Launch VM**:
   - Shape: Choose `VM.Standard.A1.Flex` (Ampere ARM processor).
   - Resources: Assign 2 OCPU cores and 12GB RAM (completely free forever).
   - Image: Canonical Ubuntu 22.04 minimal.
   - Storage: 50GB boot volume (free).
3. **Configure Security Rules**: In the OCI Console Virtual Cloud Network (VCN), ensure ingress rules allow port 22 (SSH) and port 443 (HTTPS), or leave all ports closed and connect exclusively via Tailscale.
4. **Deploy App**: Install Docker, clone the repo, attach persistent storage, and launch.
5. **Result**: A private high-performance cloud instance running your planner 24/7 for $0.00/month.

---

## 7. Real-Time Cross-Device Synchronization

When you make changes on your phone, you want your laptop to show the update without needing a full manual browser refresh:

### Level 1: Focus Auto-Refetch (Window Focus Hook)

Add this lightweight hook to `frontend/src/App.tsx`. Whenever you switch back to your planner tab or wake up your phone screen, it triggers a background refetch:

```tsx
import { useEffect } from 'react';

export function useWindowFocusRefetch(onRefetch: () => void) {
  useEffect(() => {
    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        onRefetch();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [onRefetch]);
}
```

### Level 2: Background Periodic Polling

For multi-monitor setups where you leave the planner open on a second screen while editing from your phone, add a 30-second silent background poll:

```tsx
useEffect(() => {
  const timer = setInterval(() => {
    if (document.visibilityState === 'visible') {
      // Silently refresh current tab data
    }
  }, 30000); // Every 30 seconds

  return () => clearInterval(timer);
}, []);
```

### Level 3: Server-Sent Events (SSE) Live Broadcast

For zero-latency live updates:
1. In `backend/main.py`, create an event broadcast queue using Python's `asyncio.Queue`.
2. Whenever any POST/PATCH/DELETE route completes, push an invalidation event.
3. In the React frontend, connect via `new EventSource('/api/events')` to receive instant refresh signals.

---

## 8. Installing on Mobile Devices (iOS and Android PWA)

Command Planner V9 is responsive across all viewport widths:

- **On iPhone / iPad (Safari)**: Open your private URL -> tap **Share** -> tap **Add to Home Screen**.
- **On Android (Google Chrome)**: Open your private URL -> tap the **three dots** -> tap **Install app**.

The application launches full-screen with its own app icon and no browser navigation bars.

---

### Mobile Screen-Lock and Background Timer Gotchas

Mobile operating systems aggressively suspend JavaScript execution when the phone screen is locked:

1. **Why V9 Never Loses Time**:
   - Command Planner V9 uses target-delta mathematics:
     `remainingSeconds = Math.max(0, Math.round((endTime - Date.now()) / 1000))`
   - Because it compares against real system time rather than counting clock ticks, when you unlock your phone, the countdown is always accurate.
2. **Audio Gotcha When Screen Is Locked**:
   - Mobile Safari and Chrome silence audio synthesizers when the screen turns black to save battery.
   - **Solution A**: Use the Screen Wake Lock API (`navigator.wakeLock.request('screen')`) during active Pomodoro intervals so your screen stays awake.
   - **Solution B**: Enable native Web Push notifications with sound triggers so alerts chime on your lock screen.

---

### Mobile Safe-Area Insets and Notch Handling (CSS Polish)

To prevent the top navigation bar from colliding with the iPhone Dynamic Island or Android camera punch-hole in full-screen standalone PWA mode:

1. In `frontend/index.html`, add `viewport-fit=cover`:
   ```html
   <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
   ```
2. In `frontend/src/index.css`, apply environment safe-area paddings:
   ```css
   header.top-bar {
     padding-top: max(0.75rem, env(safe-area-inset-top));
     padding-left: max(1rem, env(safe-area-inset-left));
     padding-right: max(1rem, env(safe-area-inset-right));
   }

   nav.bottom-bar {
     padding-bottom: max(0.75rem, env(safe-area-inset-bottom));
   }
   ```

---

## 9. Automated Off-Site Cloud Backup Pipeline

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

## 10. Security Vulnerabilities and Hardening

Deploying a personal application to the internet introduces real attack surface. This section catalogs specific vulnerabilities you will face before and after deployment, with concrete fixes for each one.

### Pre-Deployment Vulnerabilities (Before You Go Live)

These are weaknesses that exist in your codebase or build pipeline before the server is ever exposed to the network.

#### Vulnerability 1: Hardcoded Secrets in Source Code
- **Risk**: Your `APP_MASTER_PASSWORD`, `JWT_SECRET`, or database credentials are committed directly in Python source files or `docker-compose.yml`. Anyone who gains access to your Git repository (public or private leak) can authenticate as you.
- **Impact**: Full account takeover. Attacker can read, modify, and delete all your tasks, notes, and exam data.
- **Fix**: Store all secrets in environment variables or a `.env` file. Add `.env` to `.gitignore` before your first commit. Rotate any secrets that were ever committed to version control, even if you later deleted them, because Git history preserves every version permanently.

```bash
# .env file (never committed to Git)
APP_MASTER_PASSWORD=YourActual50CharRandomPasswordHere
JWT_SECRET=another-random-string-minimum-32-characters
DB_PATH=/data/planner.db
```

```bash
# Verify .env is in .gitignore
grep -q ".env" .gitignore || echo ".env" >> .gitignore

# Scan entire Git history for accidentally committed secrets
git log --all -p | grep -i "password\|secret\|api_key" | head -20
```

---

#### Vulnerability 2: Debug Mode Left Enabled in Production
- **Risk**: Running Uvicorn with `--reload` or FastAPI with `debug=True` in production exposes detailed Python stack traces to any visitor. Stack traces reveal internal file paths, library versions, and database schema details.
- **Impact**: Information disclosure. Attackers use stack traces to identify which exact library versions you run, then search for known CVEs (Common Vulnerabilities and Exposures) in those versions.
- **Fix**: Always run production with `log_level="warning"` and never use `--reload`:

```bash
# Correct production launch
uvicorn backend.main:app --host 127.0.0.1 --port 8000 --log-level warning --workers 1

# NEVER in production
uvicorn backend.main:app --reload --log-level debug  # Exposes file watcher + stack traces
```

---

#### Vulnerability 3: Outdated Dependencies with Known CVEs
- **Risk**: Your `requirements.txt` or `package.json` pins dependency versions that contain publicly disclosed security bugs. Automated scanners (bots) specifically target servers running vulnerable library versions.
- **Impact**: Ranges from denial-of-service to remote code execution, depending on the specific CVE.
- **Fix**: Run vulnerability scans before every deployment:

```bash
# Python backend
pip install pip-audit
pip-audit

# Node.js frontend
cd frontend
npm audit
npm audit fix
```

---

#### Vulnerability 4: Docker Image Running as Root
- **Risk**: If your Dockerfile does not specify a non-root user, the application process runs as `root` inside the container. If an attacker exploits a vulnerability in your Python code to execute arbitrary commands, they gain root-level access to the container filesystem.
- **Impact**: Container escape in worst case. Read/write access to all mounted volumes including your database.
- **Fix**: See the [Docker Container Hardening](#docker-container-hardening) section below.

---

#### Vulnerability 5: Unpatched Base OS Image
- **Risk**: Your VPS or Docker base image (e.g., `python:3.11-slim`) ships with system libraries that may have unpatched vulnerabilities. Cloud providers do not auto-patch your VM's operating system.
- **Impact**: Kernel-level exploits, privilege escalation.
- **Fix**: Enable unattended security updates:

```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure -plow unattended-upgrades
```

---

### Post-Deployment Vulnerabilities (After You Go Live)

These are attack vectors that become relevant once your server is running and accessible over a network.

#### Vulnerability 6: Port Scanning and Service Fingerprinting
- **Risk**: Automated scanners like Shodan, Censys, and Masscan continuously scan the entire IPv4 address space. Within 30 minutes of exposing port 8000 on a public IP, your server will be indexed and its service type (Uvicorn/FastAPI) fingerprinted.
- **Impact**: Attackers know exactly what software you run, which libraries respond to health checks, and can target version-specific exploits.
- **Fix**: Never expose port 8000 directly. Use Tailscale (zero open ports), Cloudflare Tunnel (zero open ports), or place Caddy/Nginx in front to proxy through port 443 only.

---

#### Vulnerability 7: Brute-Force Password Attacks
- **Risk**: If your login endpoint is publicly reachable, attackers will run automated dictionary attacks trying thousands of common passwords per minute.
- **Impact**: If your master password is weak (under 16 characters, dictionary word, no special characters), it will be cracked.
- **Fix**: The in-app rate limiter (5 attempts per 60 seconds per IP) helps, but determined attackers use rotating IP addresses. Layer your defenses:
  1. Use a master password with 20+ characters and mixed character types
  2. Add Fail2ban at the OS level (see firewall section below)
  3. Prefer Cloudflare Access or Tailscale to eliminate the public login endpoint entirely

---

#### Vulnerability 8: Session Cookie Theft (Man-in-the-Middle)
- **Risk**: If you access the application over plain HTTP (not HTTPS), anyone on the same Wi-Fi network can intercept your session cookie using packet capture tools like Wireshark.
- **Impact**: Full session hijacking. The attacker imports your cookie into their browser and has complete access to your planner without knowing your password.
- **Fix**: Enforce HTTPS everywhere. The `Secure` flag on the session cookie (set in the auth blueprint) ensures the browser never sends the cookie over unencrypted connections. Use Caddy (automatic HTTPS) or Tailscale HTTPS certs.

---

#### Vulnerability 9: DNS Rebinding Attack on Localhost Services
- **Risk**: If your FastAPI backend binds to `0.0.0.0` without authentication, a malicious website can use DNS rebinding to redirect a victim's browser to make requests to `127.0.0.1:8000`, bypassing same-origin restrictions.
- **Impact**: Unauthorized data access from a victim's browser if they visit a malicious page while your server is running.
- **Fix**: Always require authentication on all API endpoints (the auth middleware handles this). Additionally, set the `Host` header validation in production:

```python
# Add to backend/main.py
ALLOWED_HOSTS = {"127.0.0.1", "localhost", "planner.yourdomain.com"}

@app.middleware("http")
async def validate_host(request, call_next):
    host = request.headers.get("host", "").split(":")[0]
    if host not in ALLOWED_HOSTS:
        return JSONResponse(status_code=400, content={"detail": "Invalid host header"})
    return await call_next(request)
```

---

#### Vulnerability 10: SQLite Database File Theft via Path Traversal
- **Risk**: A bug in the SPA catch-all route (`/{full_path:path}`) could theoretically allow an attacker to request `../../data/planner.db` and download your raw database file.
- **Impact**: Complete data exfiltration. All tasks, notes, exam schedules, and Pomodoro history exposed.
- **Fix**: The SPA fallback route in `backend/main.py` already restricts file serving to the `frontend/dist/` directory. Strengthen it by explicitly blocking path traversal:

```python
@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    # Normalize and verify the path stays within frontend/dist
    safe_path = os.path.normpath(os.path.join(FRONTEND_DIST, full_path))
    if not safe_path.startswith(os.path.normpath(FRONTEND_DIST)):
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))
    if os.path.exists(safe_path) and os.path.isfile(safe_path):
        return FileResponse(safe_path)
    return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))
```

---

#### Vulnerability 11: Stale TLS Certificates
- **Risk**: Let's Encrypt certificates expire every 90 days. If your renewal cron job fails silently (disk full, DNS misconfiguration, certbot crash), your HTTPS will break. Browsers will show a full-page security warning and refuse to load your planner.
- **Impact**: Complete service outage until certificate is manually renewed.
- **Fix**: Caddy handles renewal automatically with zero configuration. If using certbot directly, verify auto-renewal works:

```bash
# Test renewal without actually renewing
sudo certbot renew --dry-run

# Verify the systemd timer is active
systemctl list-timers | grep certbot
```

---

#### Vulnerability 12: Log File Credential Leaks
- **Risk**: If your FastAPI logger is set to DEBUG level, request bodies (including your master password in the `/auth/login` POST body) may be written to log files in plaintext.
- **Impact**: Anyone with read access to your server's log files can extract your password.
- **Fix**: Run production with `--log-level warning`. If you need request logging for debugging, sanitize sensitive fields:

```python
import logging
logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
```

---

### Docker Container Hardening

If you deploy with Docker, apply these security layers to your `Dockerfile`:

```dockerfile
# Production Dockerfile with security hardening
FROM python:3.11-slim AS base

# 1. Run as non-root user
RUN groupadd --gid 1000 appuser && \
    useradd --uid 1000 --gid appuser --shell /bin/bash --create-home appuser

# 2. Install dependencies as root, then drop privileges
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 3. Copy application code
COPY backend/ ./backend/
COPY frontend/dist/ ./frontend/dist/

# 4. Create data directory owned by appuser
RUN mkdir -p /data && chown appuser:appuser /data

# 5. Switch to non-root user
USER appuser

# 6. Health check for container orchestrators
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health')" || exit 1

# 7. Read-only filesystem (data volume is the only writable mount)
ENV DB_PATH=/data/planner.db
EXPOSE 8000
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000", "--log-level", "warning"]
```

```yaml
# docker-compose.yml with security flags
services:
  planner:
    build: .
    read_only: true          # Filesystem is read-only
    tmpfs:
      - /tmp:size=10M        # Small writable tmpfs for Python temp files
    volumes:
      - planner_data:/data   # Only the data directory is writable
    ports:
      - "127.0.0.1:8000:8000"  # Bind to localhost only, not 0.0.0.0
    environment:
      - APP_MASTER_PASSWORD=${APP_MASTER_PASSWORD}
      - JWT_SECRET=${JWT_SECRET}
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true  # Prevent privilege escalation

volumes:
  planner_data:
```

---

### Firewall Configuration (UFW on Ubuntu)

If you deploy on a VPS with public ports (Option 3: VPS + Docker + Caddy), lock down all ports except the ones you explicitly need:

```bash
# Reset to deny-all baseline
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (so you don't lock yourself out)
sudo ufw allow 22/tcp comment "SSH"

# Allow HTTPS only (Caddy serves on 443)
sudo ufw allow 443/tcp comment "HTTPS via Caddy"

# Allow HTTP temporarily for Let's Encrypt certificate challenges
sudo ufw allow 80/tcp comment "HTTP for ACME challenges"

# Enable the firewall
sudo ufw enable

# Verify rules
sudo ufw status verbose
```

**Critical**: Port 8000 is intentionally NOT opened. Caddy reverse-proxies external HTTPS traffic to internal `127.0.0.1:8000`. Direct access to port 8000 from the internet is blocked.

If using Tailscale or Cloudflare Tunnel (Options 1 and 2), you do not need to open any ports at all. Deny everything:

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp comment "SSH"
sudo ufw enable
```

---

### Dependency Vulnerability Scanning

Set up automated dependency scanning so you are notified when a library you use has a newly disclosed vulnerability:

#### Option A: GitHub Dependabot (If Repo is on GitHub)

Create `.github/dependabot.yml` in your repository:

```yaml
version: 2
updates:
  - package-ecosystem: "pip"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5

  - package-ecosystem: "npm"
    directory: "/frontend"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
```

GitHub will automatically open pull requests when vulnerable dependency versions are detected.

#### Option B: Manual Scan Before Each Deployment

```bash
# Run this before every deployment
echo "=== Python Dependency Audit ==="
pip-audit --strict

echo "=== Node.js Dependency Audit ==="
cd frontend && npm audit --audit-level=high && cd ..

echo "=== OS Package Audit ==="
sudo apt list --upgradable 2>/dev/null | grep -i security
```

---

### Access Monitoring and Log Review

Without monitoring, you have no way to know if someone is actively trying to break into your planner.

#### Uvicorn Access Logs

Redirect Uvicorn access logs to a file so you can review them:

```bash
# In your systemd service or docker-compose command:
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --log-level info --access-log 2>&1 | tee -a /data/logs/access.log
```

#### Failed Login Monitoring

Add a simple log line to the auth router so failed login attempts are recorded:

```python
import logging
logger = logging.getLogger("auth")

# Inside the login route, after password verification fails:
logger.warning(f"Failed login attempt from IP: {client_ip}")
```

Review failed attempts periodically:

```bash
# Count failed login attempts in the last 24 hours
grep "Failed login" /data/logs/access.log | grep "$(date +%Y-%m-%d)" | wc -l

# Show unique IPs that failed authentication
grep "Failed login" /data/logs/access.log | grep -oP 'IP: \K[\d.]+' | sort -u
```

#### Optional: Fail2ban Integration

Fail2ban automatically bans IP addresses that repeatedly fail authentication:

```bash
sudo apt install fail2ban -y
```

Create `/etc/fail2ban/jail.local`:

```ini
[planner-auth]
enabled = true
port = 443
filter = planner-auth
logpath = /data/logs/access.log
maxretry = 5
findtime = 300
bantime = 3600
```

Create `/etc/fail2ban/filter.d/planner-auth.conf`:

```ini
[Definition]
failregex = Failed login attempt from IP: <HOST>
ignoreregex =
```

```bash
sudo systemctl restart fail2ban
sudo fail2ban-client status planner-auth
```

---

## 11. Incident Response: What to Do If Compromised

If you suspect unauthorized access to your planner (unfamiliar tasks appearing, data modified without your action, or suspicious login attempts in logs), follow this procedure immediately:

### Step 1: Contain the Breach (First 5 Minutes)

```bash
# 1. Block all incoming traffic immediately
sudo ufw default deny incoming
sudo ufw reload

# 2. Stop the application
sudo systemctl stop planner
# OR if using Docker:
docker compose down

# 3. If using Cloudflare Tunnel, disable the tunnel in the dashboard
# If using Tailscale, remove the compromised node from your tailnet
```

### Step 2: Preserve Evidence

```bash
# Copy current database and logs to a forensic snapshot directory
mkdir -p /data/forensic-$(date +%Y%m%d)
cp /data/planner.db /data/forensic-$(date +%Y%m%d)/
cp /data/logs/*.log /data/forensic-$(date +%Y%m%d)/
```

### Step 3: Rotate All Credentials

```bash
# Generate a new master password (use a password manager)
# Generate a new JWT secret
python3 -c "import secrets; print(secrets.token_urlsafe(48))"

# Update .env with new values
nano /data/.env

# If using SSH keys, rotate them too
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519_new
```

### Step 4: Review Logs for Scope of Breach

```bash
# Check who logged in successfully
grep "authenticated" /data/forensic-*/access.log

# Check for unusual API access patterns
grep -E "DELETE|PUT|PATCH" /data/forensic-*/access.log | head -50

# Check SSH login history
last -20
grep "Accepted" /var/log/auth.log | tail -20
```

### Step 5: Restore and Relaunch

```bash
# 1. Verify your latest backup is clean (compare timestamps with breach timeline)
sqlite3 /data/backups/planner_YYYYMMDD.db "SELECT COUNT(*) FROM tasks;"

# 2. If the database was tampered with, restore from the last known-good backup
cp /data/backups/planner_YYYYMMDD.db /data/planner.db

# 3. Rebuild and redeploy with patched dependencies
pip-audit --fix
cd frontend && npm audit fix && npm run build && cd ..
docker compose build --no-cache
docker compose up -d

# 4. Re-enable firewall with tighter rules
sudo ufw enable
```

### Step 6: Post-Incident Hardening

After recovering:
1. Switch to Tailscale or Cloudflare Tunnel if you were using exposed ports
2. Enable Fail2ban if not already active
3. Set up a weekly `pip-audit` and `npm audit` cron job
4. Review and tighten your Docker security flags (non-root, read-only filesystem, no-new-privileges)
5. Consider adding a second authentication factor via Cloudflare Access (email OTP or hardware key)

---

## 12. Multi-Device Sync Verification Checklist

- [ ] **Access Gate Check**: Open your URL in an incognito window without authentication. Confirm access is rejected.
- [ ] **Persistent Storage Test**: Add a task with immediate priority. Restart the cloud container. Verify the task is still there.
- [ ] **Two-Device Real-Time Sync**: Add an exam countdown on your mobile phone. Switch tabs on your laptop. Verify the exam countdown appears immediately.
- [ ] **HTTPS Verification**: Confirm that your browser shows the lock icon with a valid SSL/TLS certificate.
- [ ] **Backup Verification**: Check that daily `.db.gz` snapshots are created and can be read by `sqlite3`.
- [ ] **Screen-Lock Verification**: Start a 25-minute Pomodoro session on your phone. Lock the phone for 2 minutes. Unlock and verify the remaining time is exactly 23 minutes.
- [ ] **Firewall Verification**: Run `sudo ufw status` and confirm only ports 22 and 443 are open (or no ports if using Tailscale).
- [ ] **Non-Root Container Check**: Run `docker exec planner whoami` and confirm it returns `appuser`, not `root`.
- [ ] **Dependency Scan**: Run `pip-audit` and `npm audit` with zero high-severity findings.
- [ ] **Failed Login Test**: Attempt 6 wrong passwords from an incognito browser. Confirm the 6th attempt is blocked with HTTP 429.
