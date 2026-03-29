import os
import subprocess
import sys
import shutil

def build():
    print(">>> PREPARING SOLE_NODE BUILD ENVIRONMENT (CLI MODE)...")
    
    # 1. Clean existing build/dist
    for d in ["build", "dist"]:
        if os.path.exists(d):
            print(f">>> CLEANING: {d}...")
            shutil.rmtree(d)
            
    # 2. Get CustomTkinter Path Dynamically
    try:
        import customtkinter
        ctk_path = os.path.dirname(customtkinter.__file__)
        print(f">>> CTK_PATH: {ctk_path}")
    except ImportError:
        print("❌ ERROR: customtkinter not found in Python path.")
        return

    # 3. CMD Flags
    # We use --add-data for CustomTkinter
    # We use --hidden-import for curl_cffi and others
    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--noconfirm",
        "--onedir",
        "--windowed", # Change to --console for debugging if needed
        f"--add-data={ctk_path}{os.pathsep}customtkinter",
        f"--add-data=monitor/profile.json{os.pathsep}.",
        f"--add-data=monitor/tasks.json{os.pathsep}.",
        "--name=SoleSeek_Monitor",
        "--hidden-import=google.generativeai",
        "--hidden-import=curl_cffi",
        "--hidden-import=pystray",
        "--hidden-import=PIL",
        "--hidden-import=requests",
        "--hidden-import=curl_cffi.requests",
        "monitor/solenode_gui.py"
    ]
    
    print(f">>> RUNNING CMD: {' '.join(cmd)}")
    try:
        subprocess.run(cmd, check=True)
        print("\n" + "="*50)
        print("✅ BUILD COMPLETE: Check the /dist/SoleSeek_Monitor/ folder.")
        print("="*50)
    except Exception as e:
        print(f"❌ COMPILATION FAILED: {e}")

if __name__ == "__main__":
    build()
