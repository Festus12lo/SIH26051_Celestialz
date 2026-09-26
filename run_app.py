import subprocess
import os
import sys
import time

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(base_dir, "backend")
    
    print("=======================================")
    print("   Starting ThermoShelter Servers      ")
    print("=======================================")
    
    # 1. Initialize Database
    print("\n[Setup] Initializing database...")
    init_db_path = os.path.join(backend_dir, "init_db.py")
    try:
        subprocess.run([sys.executable, init_db_path], check=True)
    except subprocess.CalledProcessError as e:
        print(f"\n[Warning] Database initialization failed: {e}. The app will start but some features may not work.")
    
    # 2. Check and Install Node Modules
    node_modules_path = os.path.join(base_dir, "node_modules")
    npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
    
    if not os.path.exists(node_modules_path):
        print("\n[Setup] Installing frontend dependencies (this may take a minute)...")
        subprocess.run([npm_cmd, "install"], cwd=base_dir, check=True)
    
    # 3. Start Backend (FastAPI via Uvicorn)
    print("\n[Backend] Starting FastAPI Server on http://localhost:8000...")
    backend_process = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"],
        cwd=backend_dir
    )
    
    # Give the backend a second to initialize before starting the frontend log spam
    time.sleep(2)
    
    # 4. Start Frontend (Vite/React via npm)
    print("\n[Frontend] Starting Vite Development Server on http://localhost:5173...")
    frontend_process = subprocess.Popen(
        [npm_cmd, "run", "dev"],
        cwd=base_dir
    )
    
    try:
        print("\n=> Servers are running! Press Ctrl+C to stop both servers gracefully.\n")
        # Keep the main thread alive to watch for KeyboardInterrupt
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n\n[System] Shutdown signal received. Stopping servers...")
        
        # Terminate processes
        try:
            backend_process.terminate()
        except:
            pass
            
        try:
            frontend_process.terminate()
        except:
            pass
            
        backend_process.wait()
        frontend_process.wait()
        print("[System] All servers successfully stopped. Goodbye!")

if __name__ == "__main__":
    main()
