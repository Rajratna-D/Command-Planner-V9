"""
COMMAND PLANNER V9 — Native Desktop Window Launcher
Launches FastAPI backend in a daemon thread and attaches Microsoft Edge WebView2.
Persists localStorage and cookies via private_mode=False and storage_path.
"""
import os
import sys
import time
import socket
import threading
import urllib.request
import uvicorn
import webview
from backend.main import app

def get_storage_path() -> str:
    """Return a persistent directory for WebView2 localStorage and cookies."""
    app_data = os.getenv("LOCALAPPDATA", os.path.expanduser("~"))
    storage_dir = os.path.join(app_data, "CommandPlannerV9", "web_storage")
    os.makedirs(storage_dir, exist_ok=True)
    return storage_dir

def find_available_port(preferred_port=8000) -> int:
    """Return preferred_port if available, otherwise bind to an ephemeral OS port."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            s.bind(('127.0.0.1', preferred_port))
            return preferred_port
        except OSError:
            pass

    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]

def run_backend(port: int):
    """Run Uvicorn ASGI server quietly on localhost."""
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=port,
        log_level="warning",
        access_log=False,
    )

def wait_for_server(port: int, timeout: float = 8.0) -> bool:
    """Poll backend health check until it responds or timeout elapses."""
    start = time.time()
    url = f"http://127.0.0.1:{port}/health"
    while time.time() - start < timeout:
        try:
            with urllib.request.urlopen(url, timeout=0.5) as resp:
                if resp.status == 200:
                    return True
        except Exception:
            time.sleep(0.15)
    return False

def main():
    port = find_available_port(8000)

    # Start FastAPI backend in background thread
    server_thread = threading.Thread(target=run_backend, args=(port,), daemon=True)
    server_thread.start()

    # Wait for backend readiness
    wait_for_server(port)

    # Persistent storage path for WebView2 so preferences (e.g. OLED theme) are remembered
    storage_path = get_storage_path()

    # Launch native desktop WebView2 window
    window = webview.create_window(
        title="Command Planner",
        url=f"http://127.0.0.1:{port}",
        width=1340,
        height=880,
        min_size=(1024, 700),
        background_color="#000000",
        text_select=True,
        zoomable=True,
    )

    # private_mode=False is critical to persist localStorage / themes across restarts
    webview.start(
        debug=False,
        private_mode=False,
        storage_path=storage_path,
    )
    sys.exit(0)

if __name__ == "__main__":
    main()
