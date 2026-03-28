
import time
import sys

def check():
    print(">>> STARTING DEPENDENCY CHECK...")
    modules = [
        "customtkinter",
        "pystray",
        "PIL",
        "curl_cffi",
        "google.cloud.firestore",
        "undetected_chromedriver",
        "bs4",
        "google.generativeai"
    ]
    
    for mod in modules:
        try:
            start = time.time()
            print(f"Checking {mod}...", end=" ", flush=True)
            __import__(mod)
            print(f"OK ({time.time()-start:.2f}s)")
        except ImportError as e:
            print(f"FAILED: {e}")
        except Exception as e:
            print(f"ERROR during import: {e}")

    print("\n>>> ALL CHECKS COMPLETE.")

if __name__ == "__main__":
    check()
