
import os
import subprocess
import sys
import shutil

def build():
    print(">>> PREPARING SOLE_NODE BUILD ENVIRONMENT...")
    
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

    # 3. Define the Spec precisely
    # NOTE: The Hub API (main.py) now handles all database credentials.
    # The monitor is now a secure "thin client" and does NOT require a service account key.
    
    spec_content = f"""# -*- mode: python ; coding: utf-8 -*-
import os
import customtkinter

ctk_path = os.path.dirname(customtkinter.__file__)

a = Analysis(
    ['solenode_gui.py'],
    pathex=[],
    binaries=[],
    datas=[
        (ctk_path, 'customtkinter'),
    ],
    hiddenimports=[
        'google.generativeai',
        'curl_cffi',
        'pystray',
        'PIL',
        'requests'
    ],
    hookspath=[],
    hooksconfig={{}},
    runtime_hooks=[],
    excludes=['google.cloud.firestore', 'google-cloud-firestore', 'grpc'],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=None,
    noarchive=False,
)
pyz = PYZ(a.pure, a.zipped_data, cipher=None)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='SoleSeek_Monitor',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=True, 
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=False,
    upx_exclude=[],
    name='SoleSeek_Monitor',
)
"""
    
    with open("solenode_gui.spec", "w", encoding='utf-8') as f:
        f.write(spec_content)
        
    print(">>> LAUNCHING PYINSTALLER COMPILATION...")
    try:
        subprocess.run([sys.executable, "-m", "PyInstaller", "solenode_gui.spec"], check=True)
        print("\n" + "="*50)
        print("✅ BUILD COMPLETE: Check the /dist/SoleSeek_Monitor/ folder.")
        print("🚀 SECURE ARCHITECTURE: No service-account-key.json needed for users.")
        print("🔗 Deployment: Ensure your Hub API (main.py) is running with the master key.")
        print("="*50)
    except Exception as e:
        print(f"❌ COMPILATION FAILED: {e}")

if __name__ == "__main__":
    build()
