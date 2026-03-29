print(">>> SOLE_NODE MONITOR ENGINE: BOOTING...")
import os
import sys
import threading
import time
import json
import re
import winsound
import socket
import hashlib
import customtkinter as ctk
print(">>> UI LIBRARIES: READY.")
print(">>> SYSTEM TRAY: INITIALIZING...")
import traceback
from tkinter import messagebox
try:
    import winreg
except ImportError:
    winreg = None

# --- DEFERRED HEAVY MODULES ---
pystray = None
item = None
Image = None
ImageDraw = None
requests = None
uc = None
BeautifulSoup = None

HUB_URL = "https://solenode-api-uo7hii3fca-bq.a.run.app"

def lazy_load_core():
    global requests, uc, BeautifulSoup, pystray, Image, ImageDraw
    if requests is not None: return # Already loaded
    print(">>> SYSTEM HUB: CONNECTING...")
    from curl_cffi import requests as _req
    import undetected_chromedriver as _uc
    from bs4 import BeautifulSoup as _bs
    import pystray as _pst
    from PIL import Image as _img, ImageDraw as _draw
    requests, uc, BeautifulSoup, pystray, Image, ImageDraw = _req, _uc, _bs, _pst, _img, _draw
    print(">>> CORE MODULES: LOADED.")

# Setup Theme
ctk.set_appearance_mode("Dark")
ctk.set_default_color_theme("blue")

def get_resource_path(relative_path):
    try:
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.abspath(".")
    return os.path.join(base_path, relative_path)

class SoleNodeApp(ctk.CTk):
    def __init__(self):
        super().__init__()
        self.title("SoleSeek Monitor | v1.8 Fleet Commander")
        self.geometry("1000x900")
        self.protocol("WM_DELETE_WINDOW", self.on_closing)
        
        # System Tray Support
        self.tray_icon = None
        self.minimize_to_tray_var = ctk.BooleanVar(value=self.profile_data.get("minimize_to_tray", True))
        self.bind("<Unmap>", lambda e: self.minimize_to_tray() if (self.state() == 'iconic' and self.minimize_to_tray_var.get()) else None)
        
        # State
        self.monitoring = False
        self.monitor_thread = None
        self.profile_file = get_resource_path("profile.json")
        self.profile_data = self.load_profile()
        self.db = None
        self.db_status = "CONNECTING..."
        
        # UI Layout
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(2, weight=1)

        # Header
        self.header_label = ctk.CTkLabel(self, text="SOLESEEK.io", font=("Inter", 42, "bold"), text_color="#3a86ff")
        self.header_label.grid(row=0, column=0, pady=(20, 5), sticky="n")

        # Global Status Bar
        self.status_bar = ctk.CTkFrame(self, fg_color="#1a1c22", height=40, corner_radius=0)
        self.status_bar.grid(row=1, column=0, sticky="ew", pady=(0, 10))
        self.status_bar.grid_propagate(False)
        
        self.status_dot = ctk.CTkLabel(self.status_bar, text="🟡", font=("Inter", 10))
        self.status_dot.pack(side="left", padx=(20, 0))
        
        self.status_label = ctk.CTkLabel(self.status_bar, text="BOOTING SYSTEM PROTOCOLS...", font=("Inter", 11, "bold"), text_color="gray")
        self.status_label.pack(side="left", padx=5)

        self.mode_info = ctk.CTkLabel(self.status_bar, text="MODE: ANTICIPATION", font=("Inter", 10, "bold"), text_color="#3a86ff")
        self.mode_info.pack(side="right", padx=20)

        # Session Context
        self.session_cookies = {}
        self.user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        self.user_tier = "Free"
        self.is_logged_in = False
        self.proxies = []
        self.proxy_index = 0
        self.keyword_tasks = []
        
        # State Protection
        self.atc_lock = threading.Lock()
        self.uc_lock = threading.Lock() # NEW: Prevents WinError 183
        self.last_blog_scrape = 0
        self.recent_atc_triggers = {} # SID -> timestamp
        self.last_atc_sku = None
        self.triggered_alerts = set()
        self.user_watchlist = []
        self.active_atc_drivers = [] # Keep references to prevent GC closing windows

        # Store Selection Config
        self.enabled_stores = {
            "Shelflife": ctk.BooleanVar(value=True),
            "Jack Lemkus": ctk.BooleanVar(value=True),
            "Archive": ctk.BooleanVar(value=True),
            "Soul Gallery": ctk.BooleanVar(value=False),
            "The Plug and Play": ctk.BooleanVar(value=False),
            "Court Order": ctk.BooleanVar(value=False)
        }

        self._setup_ui()

        # Async Boot to prevent HANG
        print(">>> MAIN UI: INITIALIZED.")
        self.after(500, lambda: threading.Thread(target=self.boot_sequence, daemon=True).start())
        self.after(1000, self.create_tray_icon) # Initialize tray after UI is stable

    def ai_log(self, msg):
        timestamp = time.strftime("[%H:%M:%S]")
        if hasattr(self, 'log_box'):
            self.log_box.insert("end", f"{timestamp} {msg}\n")
            self.log_box.see("end")

    def log(self, msg): # Alias for compatibility
        self.ai_log(msg)

    def create_tray_icon(self):
        global pystray, item, Image, ImageDraw
        if pystray is None:
            try:
                import pystray as _pst
                from pystray import MenuItem as _item
                from PIL import Image as _img, ImageDraw as _draw
                pystray, item, Image, ImageDraw = _pst, _item, _img, _draw
            except Exception as e:
                print(f">>> SYSTEM TRAY: IMPORT ERROR ({e}). Skipping...")
                return

        # Create a basic SoleSeek-colored icon
        try:
            image = Image.new('RGB', (64, 64), color='#1a1c22')
            d = ImageDraw.Draw(image)
            d.ellipse([10, 10, 54, 54], fill='#3a86ff')
            
            menu = (item('Show SoleSeek', self.restore_from_tray), 
                    item('Exit Fleet', self.on_closing))
            self.tray_icon = pystray.Icon("SoleSeek", image, "SoleSeek Monitor", menu)
            threading.Thread(target=self.tray_icon.run, daemon=True).start()
            print(">>> SYSTEM TRAY: ONLINE.")
        except Exception as e:
            print(f">>> SYSTEM TRAY: FAILED ({e}). Running without tray support.")

    def minimize_to_tray(self):
        self.withdraw()
        if self.tray_icon: self.tray_icon.visible = True

    def restore_from_tray(self, icon=None, item=None):
        self.deiconify()
        self.lift()
        self.focus_force()
        if self.tray_icon: self.tray_icon.visible = False

    def show_restock_popup(self, item):
        """Spawns a custom SoleSeek alert window on top of others"""
        try:
            popup = ctk.CTkToplevel(self)
            popup.title("SOLESEEK ENGINE | ACTIVE ALERT")
            popup.geometry("450x280")
            popup.attributes("-topmost", True)
            popup.configure(fg_color="#0d0e12")
            
            # Interior Frame
            inner = ctk.CTkFrame(popup, fg_color="#1a1c22", border_width=1, border_color="#3a86ff")
            inner.pack(fill="both", expand=True, padx=15, pady=15)
            
            # Header
            ctk.CTkLabel(inner, text="🔥 TARGET DETECTED", font=("Inter", 18, "bold"), text_color="#3a86ff").pack(pady=(15, 5))
            
            # Item Details
            ctk.CTkLabel(inner, text=item.get('title', 'Unknown Product'), font=("Inter", 14, "bold"), wraplength=400).pack(pady=10)
            
            detail_str = f"SIZE: {item.get('sz', 'OS')} | PRICE: R{item.get('price', 0):.2f}"
            ctk.CTkLabel(inner, text=detail_str, font=("Consolas", 12), text_color="#28a745").pack(pady=5)
            
            # Store badge
            store_name = item.get('url', '').split('.')[1].upper() if '.' in item.get('url','') else "STORE"
            ctk.CTkLabel(inner, text=f"CHANNEL: {store_name}", font=("Inter", 10, "bold"), text_color="gray").pack(pady=5)

            # CTA Button
            import webbrowser
            btn = ctk.CTkButton(inner, text="OPEN PRODUCT PAGE", 
                               command=lambda: [webbrowser.open(item.get('url')), popup.destroy()],
                               fg_color="#3a86ff", height=45, font=("Inter", 13, "bold"), corner_radius=10)
            btn.pack(pady=(20, 10), fill="x", padx=40)
            
            # Auto-destruct after 20 seconds to prevent clutter
            popup.after(20000, lambda: popup.destroy() if popup.winfo_exists() else None)
        except Exception as e:
            self.log(f"⚠️ Popup Error: {e}")

    def boot_sequence(self):
        self.ai_log("🚀 BOOT SEQUENCE: ENGAGED")
        try:
            lazy_load_core()
            self.ai_log("✅ CORE ENGINE COMPONENTS: LOADED")
            self.ai_log("✅ HUB_INTERFACE: SECURE")
            
            self.db_status = "READY"
            self.status_label.configure(text="SYSTEM STATUS: ONLINE", text_color="#00C853")
            self.status_dot.configure(text="🟢")
            self.ai_log("🏁 SYSTEM READY: FLEET COMMANDER IS ONLINE.")
            
            self.load_proxies()
            self.load_tasks()
            
            # AUTO-MONITOR (ANTICIPATION MODE)
            if self.profile_data.get("auto_monitor"):
                self.ai_log("🤖 AUTO_START: Engaging Anticipation Mode...")
                self.after(2000, self.start_monitor)
        except Exception as e:
            self.ai_log(f"❌ CRITICAL BOOT ERROR: {e}")

    def _setup_ui(self):
        # --- TAB VIEW LAYOUT ---
        self.tabview = ctk.CTkTabview(self, width=920, height=520, 
                                      anchor="nw", 
                                      segmented_button_fg_color="#1a1c22",
                                      segmented_button_selected_color="#3a86ff",
                                      segmented_button_selected_hover_color="#2a76ef",
                                      text_color="#ffffff")
        self.tabview.grid(row=2, column=0, padx=40, pady=(10, 10), sticky="nsew")
        
        self.tab_scraper = self.tabview.add("SCRAPER")
        self.tab_tasks = self.tabview.add("SNIPER SLOTS")
        self.tab_automation = self.tabview.add("AUTOMATION HUB")
        self.tab_gemini = self.tabview.add("AI COMMAND CENTER")
        self.tab_profiles = self.tabview.add("PROFILES")
        self.tab_settings = self.tabview.add("SETTINGS")

        # --- TAB: SCRAPER ---
        self.fleet_group = ctk.CTkFrame(self.tab_scraper, fg_color="#1a1c22", corner_radius=15)
        self.fleet_group.pack(padx=20, pady=10, fill="x")
        
        self.mode_var = ctk.StringVar(value="Anticipation")
        self.mode_selector = ctk.CTkSegmentedButton(self.fleet_group, values=["Idle", "Anticipation", "Sniper"], variable=self.mode_var, command=self.on_mode_change, width=400, height=35, font=("Inter", 11, "bold"))
        self.mode_selector.pack(pady=15)

        self.scale_var = ctk.IntVar(value=1)
        self.scale_slider = ctk.CTkSlider(self.fleet_group, from_=1, to=3, number_of_steps=2, width=400, variable=self.scale_var, command=self.update_scale_label)
        self.scale_slider.pack(pady=5)
        
        self.scale_status_label = ctk.CTkLabel(self.fleet_group, text=f"ACTIVE_NODES: {self.scale_var.get()}", font=("Consolas", 16, "bold"), text_color="#3a86ff")
        self.scale_status_label.pack(pady=5)

        self.log_box = ctk.CTkTextbox(self.tab_scraper, font=("Consolas", 12), border_width=1, border_color="#2d2d33")
        self.log_box.pack(padx=20, pady=10, fill="both", expand=True)

        # --- NEW: Store Selector Row ---
        self.store_select_frame = ctk.CTkScrollableFrame(self.tab_scraper, height=60, orientation="horizontal", fg_color="transparent")
        self.store_select_frame.pack(padx=20, pady=(0, 10), fill="x")
        
        for store_name, var in self.enabled_stores.items():
            ctk.CTkCheckBox(self.store_select_frame, text=store_name.upper(), variable=var, font=("Inter", 9, "bold"), 
                            checkbox_width=18, checkbox_height=18, border_width=2, 
                            border_color="#3a86ff", hover_color="#3a86ff").pack(side="left", padx=10)


        self.warning_label = ctk.CTkLabel(self.tab_scraper, text="⚠️ SNIPER_ALERT: High data consumption mode active. Bypassing standard rate limits.", text_color="#dc3545", font=("Inter", 10, "bold"))
        # Hidden by default, shown in on_mode_change

        # --- TAB: SNIPER TASKS ---
        self.tasks_frame = ctk.CTkScrollableFrame(self.tab_tasks, fg_color="transparent")
        self.tasks_frame.pack(padx=20, pady=10, fill="both", expand=True)
        
        self.task_input_frame = ctk.CTkFrame(self.tab_tasks, fg_color="#1a1c22", corner_radius=10)
        self.task_input_frame.pack(padx=20, pady=10, fill="x")
        
        self.task_name_entry = ctk.CTkEntry(self.task_input_frame, placeholder_text="SKU Name", width=150)
        self.task_name_entry.pack(side="left", padx=5, pady=10)
        self.task_kw_entry = ctk.CTkEntry(self.task_input_frame, placeholder_text="Keywords", width=250)
        self.task_kw_entry.pack(side="left", padx=5)
        self.task_sizes_entry = ctk.CTkEntry(self.task_input_frame, placeholder_text="Sizes (e.g. 8, 9, 11)", width=120)
        self.task_sizes_entry.pack(side="left", padx=5)
        self.add_task_btn = ctk.CTkButton(self.task_input_frame, text="+ ADD SNIPER SLOT", command=self.add_keyword_task, width=150, font=("Inter", 10, "bold"))
        self.add_task_btn.pack(side="right", padx=10)

        # --- TAB: AUTOMATION HUB ---
        self.automation_group = ctk.CTkFrame(self.tab_automation, fg_color="#1a1c22", corner_radius=15)
        self.automation_group.pack(padx=20, pady=10, fill="x")
        self.atc_var = ctk.BooleanVar(value=True)
        ctk.CTkSwitch(self.automation_group, text="AUTO ADD TO CART", variable=self.atc_var, progress_color="#3a86ff").pack(pady=10)
        self.checkout_var = ctk.BooleanVar(value=False)
        ctk.CTkSwitch(self.automation_group, text="AUTO CHECKOUT (BETA)", variable=self.checkout_var, progress_color="#3a86ff").pack(pady=10)
        self.load_images_var = ctk.BooleanVar(value=True)
        ctk.CTkSwitch(self.automation_group, text="LOAD IMAGES (FASTER IF OFF)", variable=self.load_images_var, progress_color="#3a86ff").pack(pady=10)
        self.auto_proxy_var = ctk.BooleanVar(value=True)
        ctk.CTkSwitch(self.automation_group, text="ACTIVATE HIVE_VPN (ROTATING IP)", variable=self.auto_proxy_var, progress_color="#dc3545").pack(pady=10)
        
        # Alerts
        self.alert_group = ctk.CTkFrame(self.tab_automation, fg_color="#1a1c22", corner_radius=15)
        self.alert_group.pack(padx=20, pady=10, fill="x")
        self.sound_type_var = ctk.StringVar(value="Beep")
        ctk.CTkComboBox(self.alert_group, values=["Beep", "Ding", "Pulse"], variable=self.sound_type_var).pack(pady=10)
        self.pitch_slider = ctk.CTkSlider(self.alert_group, from_=400, to=2000, number_of_steps=16)
        self.pitch_slider.pack(pady=10)
        self.pitch_slider.set(800)

        ctk.CTkButton(self.tab_automation, text="RUN SNIPE TEST (SHELFLIFE)", command=self.manual_test_atc).pack(pady=20)

        # --- TAB: AI COMMAND CENTER ---
        self.gemini_frame = ctk.CTkFrame(self.tab_gemini, fg_color="transparent")
        self.gemini_frame.pack(fill="both", expand=True, padx=20, pady=20)
        self.ai_log_box = ctk.CTkTextbox(self.gemini_frame, font=("Inter", 12))
        self.ai_log_box.pack(fill="both", expand=True, pady=(0, 10))
        self.ai_log_box.configure(state="disabled")
        self.ai_entry = ctk.CTkEntry(self.gemini_frame, placeholder_text="Ask Gemini Sniper Intelligence...")
        self.ai_entry.pack(fill="x", side="left", expand=True, padx=(0, 10))
        self.ai_entry.bind("<Return>", lambda e: self.send_to_gemini())
        ctk.CTkButton(self.gemini_frame, text="QUERY AI", command=self.send_to_gemini).pack(side="right")

        # --- TAB: PROFILES ---
        self.prof_frame = ctk.CTkScrollableFrame(self.tab_profiles, fg_color="transparent")
        self.prof_frame.pack(fill="both", expand=True, padx=20, pady=10)
        self.entries = {}
        fields = [("Sniper Alias (Required)", "alias"), ("First Name", "first_name"), ("Last Name", "last_name"), ("Email", "email"), ("Phone", "phone"), ("Address 1", "address1")]
        for label, key in fields:
            row = ctk.CTkFrame(self.prof_frame, fg_color="transparent")
            row.pack(fill="x", pady=5)
            ctk.CTkLabel(row, text=label, width=120, anchor="w").pack(side="left")
            entry = ctk.CTkEntry(row, width=300)
            val = self.profile_data.get(key, "")
            if key == "email" and not val: val = "taunhealy@gmail.com"
            entry.insert(0, val)
            entry.pack(side="right", expand=True, fill="x")
            self.entries[key] = entry
        ctk.CTkButton(self.tab_profiles, text="💾 SAVE PROFILE LOCALLY", command=self.save_profile, fg_color="#28a745").pack(pady=20)

        # --- TAB: SETTINGS ---
        self.node_settings_frame = ctk.CTkScrollableFrame(self.tab_settings, fg_color="transparent")
        self.node_settings_frame.pack(fill="both", expand=True, padx=20, pady=10)
        self.gemini_key_entry = ctk.CTkEntry(self.node_settings_frame, placeholder_text="Gemini API Key", width=400, show="*")
        self.gemini_key_entry.pack(pady=10)
        self.gemini_key_entry.insert(0, self.profile_data.get("gemini_api_key", ""))
        ctk.CTkButton(self.node_settings_frame, text="💾 SAVE AI CREDENTIALS", command=self.save_gemini_config, fg_color="#28a745").pack(pady=5)
        
        # --- APP BEHAVIOR SETTINGS ---
        self.behavior_frame = ctk.CTkFrame(self.node_settings_frame, fg_color="#1a1c22", corner_radius=10)
        self.behavior_frame.pack(fill="x", pady=10, padx=5)
        ctk.CTkLabel(self.behavior_frame, text="APP BEHAVIOR", font=("Inter", 10, "bold"), text_color="#3a86ff").pack(pady=5)
        
        self.startup_var = ctk.BooleanVar(value=self.profile_data.get("windows_startup", False))
        ctk.CTkCheckBox(self.behavior_frame, text="OPEN AT WINDOWS STARTUP", variable=self.startup_var, command=self.toggle_startup).pack(pady=5, padx=20, anchor="w")
        
        self.auto_monitor_var = ctk.BooleanVar(value=self.profile_data.get("auto_monitor", False))
        ctk.CTkCheckBox(self.behavior_frame, text="AUTO-START MONITOR (ANTICIPATION)", variable=self.auto_monitor_var).pack(pady=5, padx=20, anchor="w")
        
        ctk.CTkCheckBox(self.behavior_frame, text="MINIMIZE TO SYSTEM TRAY", variable=self.minimize_to_tray_var).pack(pady=5, padx=20, anchor="w")
        
        ctk.CTkButton(self.behavior_frame, text="💾 SAVE BEHAVIOR", command=self.save_behavior_settings, fg_color="#3a86ff").pack(pady=10)

        self.proxy_box = ctk.CTkTextbox(self.node_settings_frame, height=120)
        self.proxy_box.pack(fill="x", pady=10)
        ctk.CTkButton(self.node_settings_frame, text="💾 LOCK IN PROXY LIST", command=self.save_proxies).pack(pady=5)
        
        self.vpn_status = ctk.CTkLabel(self.node_settings_frame, text="🛡️ GATEWAY: INITIALIZING...", font=("Inter", 10, "bold"), text_color="gray")
        self.vpn_status.pack(pady=10)
        
        # --- HUB HUB STATUS (FOOTER) ---
        self.db_status = "READY"

        # --- FOOTER CONTROLS ---
        self.context_frame = ctk.CTkFrame(self, fg_color="#1a1c22", height=60)
        self.context_frame.grid(row=3, column=0, sticky="ew", padx=40, pady=10)
        self.email_entry = ctk.CTkEntry(self.context_frame, placeholder_text="sync@account.com", width=250)
        self.email_entry.pack(side="left", padx=10, pady=10)
        footer_email = self.profile_data.get("email", "taunhealy@gmail.com")
        self.email_entry.insert(0, footer_email)
        self.alias_btn = ctk.CTkButton(self.context_frame, text="UNIFY_PROFILE_LNK", command=self.sync_cloud_profile, width=150)
        self.alias_btn.pack(side="left", padx=5)
        self.alias_alert = ctk.CTkLabel(self.context_frame, text="", font=("Inter", 9, "bold"), text_color="#dc3545")
        self.alias_alert.pack(side="left", padx=5)
        
        # Initial Alias Check
        if not self.profile_data.get("alias"):
            self.alias_alert.configure(text="⚠️ SET ALIAS IN PROFILES")
        self.db_indicator = ctk.CTkLabel(self.context_frame, text=f"CLOUD: {self.db_status}", font=("Inter", 9, "bold"), text_color="#3a86ff")
        self.db_indicator.pack(side="right", padx=(10, 20))
        self.tier_badge = ctk.CTkLabel(self.context_frame, text="UNLINKED", font=("Inter", 10, "bold"), fg_color="#333", text_color="white", corner_radius=5, width=120)
        self.tier_badge.pack(side="right", padx=10)

        self.control_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.control_frame.grid(row=4, column=0, pady=10)
        self.start_btn = ctk.CTkButton(self.control_frame, text="START MONITOR", command=self.start_monitor, width=220, height=60, font=("Inter", 16, "bold"), fg_color="#28a745")
        self.start_btn.grid(row=0, column=0, padx=15)
        self.stop_btn = ctk.CTkButton(self.control_frame, text="STOP MONITOR", command=self.stop_monitor, width=220, height=60, font=("Inter", 14, "bold"), fg_color="#dc3545", state="disabled")
        self.stop_btn.grid(row=0, column=1, padx=15)


    def init_gemini_engine(self):
        key = self.profile_data.get("gemini_api_key")
        if key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=key)
                self.gemini_commander = genai.GenerativeModel(
                    model_name="gemini-flash-latest", # Faster, more robust model
                    tools=[
                        self.get_stock_intel, 
                        self.find_best_resale_deals, 
                        self.get_recent_hype_blogs,
                        self.add_to_wishlist_tool
                    ]
                )
                self.gemini_log("✅ Gemini Commander Engine: LOADED & READY.")
            except Exception as e:
                self.gemini_log(f"⚠️ Gemini Init Error: {e}. Ensure google-generativeai is installed.")
        else:
            self.gemini_log("⚠️ Gemini API Key missing. Please set it in Settings to enable AI features.")

    def save_gemini_config(self):
        key = self.gemini_key_entry.get().strip()
        self.profile_data["gemini_api_key"] = key
        self.save_profile()
        self.init_gemini_engine()
        self.log("✅ AI Configuration Updated.")

    def save_behavior_settings(self):
        self.profile_data["auto_monitor"] = self.auto_monitor_var.get()
        self.profile_data["minimize_to_tray"] = self.minimize_to_tray_var.get()
        self.profile_data["windows_startup"] = self.startup_var.get()
        self.save_profile()
        self.log("✅ Behavior Settings Saved.")

    def toggle_startup(self):
        enable = self.startup_var.get()
        if not winreg:
            self.log("⚠️ Startup Toggle Failed: Platform not supported.")
            return
            
        key_path = r"Software\Microsoft\Windows\CurrentVersion\Run"
        app_name = "SoleSeekMonitor"
        app_path = sys.executable if getattr(sys, 'frozen', False) else os.path.abspath(sys.argv[0])
        
        try:
            key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, key_path, 0, winreg.KEY_SET_VALUE)
            if enable:
                winreg.SetValueEx(key, app_name, 0, winreg.REG_SZ, f'"{app_path}"')
                self.log(f"✅ Registered {app_name} for Windows Startup.")
            else:
                try:
                    winreg.DeleteValue(key, app_name)
                    self.log(f"✅ Removed {app_name} from Windows Startup.")
                except FileNotFoundError: pass
            winreg.CloseKey(key)
        except Exception as e:
            self.log(f"❌ Startup Error: {e}")

    def gemini_log(self, message):
        """Dedicated log for the AI Command Center Tab"""
        try:
            self.ai_log_box.configure(state="normal")
            self.ai_log_box.insert("end", f"{message}\n\n")
            self.ai_log_box.see("end")
            self.ai_log_box.configure(state="disabled")
        except Exception as e:
            print(f"Gemini Log Error: {e}")

    def send_to_gemini(self):
        query = self.ai_entry.get().strip()
        if not query: return
        self.ai_entry.delete(0, 'end')
        
        if not self.gemini_commander:
            self.gemini_log("❌ Error: Gemini Engine not initialized. Check your API Key in Settings.")
            return

        self.gemini_log(f"👤 YOU: {query}")
        threading.Thread(target=self.run_gemini_task, args=(query,), daemon=True).start()

    def run_gemini_task(self, query):
        try:
            chat = self.gemini_commander.start_chat(enable_automatic_function_calling=True)
            response = chat.send_message(query)
            self.gemini_log(f"🤖 GEMINI: {response.text}")
        except Exception as e:
            self.gemini_log(f"❌ AI TASK ERROR: {e}")

    # --- GEMINI TOOLS (Firestore Access) ---
    def get_stock_intel(self, query_keyword: str):
        """Search global stock database via Hub API."""
        try:
            resp = requests.get(f"{HUB_URL}/api/v1/search-stock", params={"q": query_keyword})
            if resp.status_code == 200:
                return resp.json()
            return f"Hub Search Error: {resp.status_code}"
        except Exception as e: return f"Error querying Hub: {e}"

    def find_best_resale_deals(self, limit: int = 10):
        try:
            resp = requests.get(f"{HUB_URL}/api/v1/deals")
            if resp.status_code == 200:
                return resp.json()[:limit]
            return f"Hub Deals Error: {resp.status_code}"
        except Exception as e: return f"Error querying Hub: {e}"

    def get_recent_hype_blogs(self, limit: int = 5):
        try:
            resp = requests.get(f"{HUB_URL}/api/v1/blogs", params={"limit": limit})
            if resp.status_code == 200:
                return resp.json()
            return f"Hub Blog Error: {resp.status_code}"
        except Exception as e: return f"Error querying Hub: {e}"

    def add_to_wishlist_tool(self, product_title: str):
        """Adds a specific product to the user's restock watchlist."""
        self.gemini_log(f"🤖 AI_COMMAND: Adding '{product_title}' to Watchlist...")
        try:
            # Re-use existing local logic
            self.keyword_tasks.append({
                "name": product_title, 
                "keywords": [product_title.lower()],
                "sizes": []
            })
            self.save_tasks()
            self.refresh_task_ui()
            
            # Sync to cloud
            email = self.email_entry.get().strip()
            payload = {
                "name": product_title,
                "keywords": [product_title.lower()],
                "sizes": [],
                "email": email
            }
            requests.post(f"{HUB_URL}/api/v1/snipe-task", json=payload)
            return f"Successfully added {product_title} to watchlist."
        except Exception as e:
            return f"Failed to add to wishlist: {e}"

    def add_keyword_task(self):
        name = self.task_name_entry.get().strip()
        kw = self.task_kw_entry.get().strip()
        sizes = self.task_sizes_entry.get().strip()
        if name and kw:
            # TIER PROTECTION: Standard users upgraded to 100 sniper slots
            if self.user_tier == "Standard" and len(self.keyword_tasks) >= 100:
                self.log("⚠️ SNIPER_LIMIT: Standard tier is capped at 100 active sniper slots.")
                self.log("🚀 Upgrade to PRO for 1000 slots and zero-latency alerts.")
                return

            self.keyword_tasks.append({
                "name": name, 
                "keywords": [x.strip().lower() for x in kw.split(",")],
                "sizes": [x.strip().lower() for x in sizes.split(",") if x.strip()]
            })
            self.task_name_entry.delete(0, 'end')
            self.task_kw_entry.delete(0, 'end')
            self.task_sizes_entry.delete(0, 'end')
            self.save_tasks()
            self.refresh_task_ui()
            self.log(f"🎯 TASK CREATED: '{name}' monitoring for [{kw}] (Sizes: {sizes or 'ANY'})")
            
            # --- SYNC TO SOLESEEK CLOUD (NEW) ---
            try:
                host_hash = hashlib.md5(socket.gethostname().encode()).hexdigest()[:4].upper()
                email = self.email_entry.get().strip()
                payload = {
                    "name": name,
                    "keywords": [x.strip().lower() for x in kw.split(",")],
                    "sizes": [x.strip().lower() for x in sizes.split(",") if x.strip()],
                    "email": email,
                    "node_id": f"NODE_{host_hash}"
                }
                requests.post(f"{HUB_URL}/api/v1/snipe-task", json=payload)
                self.log("☁️ Snipe Task Unified with Cloud Protocol.")
            except Exception as e:
                self.log(f"⚠️ Cloud Task Sync Failed: {e}")

    def save_tasks(self):
        try:
            path = get_resource_path("tasks.json")
            with open(path, "w") as f:
                json.dump(self.keyword_tasks, f)
        except: pass

    def load_tasks(self):
        try:
            path = get_resource_path("tasks.json")
            if os.path.exists(path):
                with open(path, "r") as f:
                    self.keyword_tasks = json.load(f)
            self.refresh_task_ui()
        except: pass

    def refresh_task_ui(self):
        for widget in self.tasks_frame.winfo_children():
            widget.destroy()
        if not self.keyword_tasks:
            ctk.CTkLabel(self.tasks_frame, text="No Sniper Tasks. Add keywords above to start precise hunting.", font=("Inter", 12, "italic")).pack(pady=20)
        else:
            for i, task in enumerate(self.keyword_tasks):
                row = ctk.CTkFrame(self.tasks_frame, fg_color="#1a1c22", border_width=1, border_color="#2d2d33")
                row.pack(fill="x", pady=5)
                ctk.CTkLabel(row, text=f"🎯 {task['name']}", font=("Inter", 11, "bold"), text_color="#3a86ff").pack(side="left", padx=15, pady=8)
                ctk.CTkLabel(row, text=f"Tags: [{','.join(task['keywords'])}]", font=("Consolas", 10), text_color="gray").pack(side="left", padx=5)
                
                size_str = ",".join(task.get('sizes', [])) or "ANY"
                ctk.CTkLabel(row, text=f"Sizes: [{size_str}]", font=("Consolas", 10, "bold"), text_color="#28a745").pack(side="left", padx=10)
                
                del_btn = ctk.CTkButton(row, text="🗑️", width=30, height=20, fg_color="#dc3545", command=lambda idx=i: self.delete_task(idx))
                del_btn.pack(side="right", padx=10)

    def delete_task(self, idx):
        if 0 <= idx < len(self.keyword_tasks):
            self.keyword_tasks.pop(idx)
            self.save_tasks()
            self.refresh_task_ui()

    def load_proxies(self):
        try:
            path = get_resource_path("proxies.json")
            if os.path.exists(path):
                with open(path, "r") as f:
                    data = json.load(f)
                    plist = data.get("proxies", "")
                    # Ensure UI element exists before using it
                    if hasattr(self, 'proxy_box') and self.proxy_box:
                        self.proxy_box.delete("0.0", "end")
                        self.proxy_box.insert("0.0", plist)
                    self.proxies = [p.strip() for p in plist.split("\n") if p.strip()]
                    if self.proxies and hasattr(self, 'log_box') and self.log_box:
                        self.log(f"🔗 Proxy Engine: {len(self.proxies)} endpoints loaded.")
        except: pass

    def save_proxies(self):
        plist = self.proxy_box.get("0.0", "end").strip()
        self.proxies = [p.strip() for p in plist.split("\n") if p.strip()]
        try:
            path = get_resource_path("proxies.json")
            with open(path, "w") as f:
                json.dump({"proxies": plist}, f)
            self.log(f"✅ Proxies saved: {len(self.proxies)} active rotation nodes.")
        except Exception as e:
            self.log(f"❌ Proxy Save Error: {e}")

    def get_proxy_config(self, for_uc=False, thread_idx=0):
        # 1. Check Mode (Only use rotating proxies in Sniper mode)
        if self.mode_var.get() != "Sniper":
            self.vpn_status.configure(text="🛡️ GATEWAY: LOCAL_IP (Standard)", text_color="gray")
            return None

        # 2. Check for Active User Provided Proxies (Local or Manual)
        # If auto_proxy is off, we bypass entirely unless we want to force local
        if not self.auto_proxy_var.get():
            self.vpn_status.configure(text="🛡️ GATEWAY: BYPASSED", text_color="gray")
            return None

        # 2. Pro Auto-Proxy (Hive VPN) Cloud Pool Protocol
        if self.user_tier == "Pro" and not self.proxies:
            self.vpn_status.configure(text=f"🛡️ GATEWAY: CLOUD_POOL [TUNNEL_0{thread_idx+1}]", text_color="#dc3545")
            try:
                resp = requests.get(f"{HUB_URL}/api/v1/proxies")
                if resp.status_code == 200:
                    cloud_proxies = resp.json().get("proxies", [])
                    if cloud_proxies:
                        self.proxies = cloud_proxies
                        self.log("🛡️ VPN Gateway: Secure Rotating IP Link Established.")
            except: pass

        if not self.proxies:
            self.vpn_status.configure(text="🛡️ GATEWAY: NO_PROXIES", text_color="#dc3545")
            return None
            
        # 3. Assign unique proxy to thread to prevent overlap (Rotation)
        self.vpn_status.configure(text=f"🛡️ GATEWAY: ACTIVE [TUNNEL_0{thread_idx+1}]", text_color="#00C853")
        proxy = self.proxies[thread_idx % len(self.proxies)]
        
        parts = proxy.split(':')
        if len(parts) == 4:
            ip, port, user, pw = parts
            if for_uc:
                return f"{user}:{pw}@{ip}:{port}" # Proxy extension style
            return {"http": f"http://{user}:{pw}@{ip}:{port}", "https": f"http://{user}:{pw}@{ip}:{port}"}
        elif len(parts) == 2:
            ip, port = parts
            if for_uc:
                return f"{ip}:{port}"
            return {"http": f"http://{ip}:{port}", "https": f"http://{ip}:{port}"}
        return None

    def sync_user_watchlist(self):
        """Merges Cloud Restock Watchlist into Active Sniper Slots"""
        email = self.email_entry.get().strip()
        if not email or not self.db: return

        self.log(f"☁️ SOLESEEK_HIVE: Syncing Cloud Restock Watchlist for {email}...")
        try:
            alerts = self.db.collection("user_alerts") \
                .where("user_email", "==", email) \
                .where("status", "==", "active") \
                .stream()
            
            for a in alerts:
                d = a.to_dict()
                product_title = d.get('product_name') or d.get('product_title', 'Unknown')
                size = d.get('size_title', '')
                
                # Check for existing
                if not any(t['name'] == product_title for t in self.keyword_tasks):
                    self.keyword_tasks.append({
                        "name": product_title,
                        "keywords": [product_title.lower()],
                        "sizes": [size.lower()] if size else []
                    })
                    self.log(f"🎯 CLOUD_SNIPE: Task Activated for '{product_title}'")
            
            self.refresh_task_ui()
            self.save_tasks()
            self.log(f"✅ Hive Sync Complete: {len(self.keyword_tasks)} active sniper tasks loaded.")
        except Exception as e:
            self.log(f"❌ Hive Sync Failed: {e}")

    def load_profile(self):
        try:
            if os.path.exists(self.profile_file):
                with open(self.profile_file, "r") as f:
                    return json.load(f)
        except: pass
        return {}

    def save_profile(self):
        for key, entry in self.entries.items():
            self.profile_data[key] = entry.get().strip()
        
        if not self.profile_data.get("alias"):
            self.log("⚠️ Validation Error: Sniper Alias is REQUIRED for privacy.")
            return

        try:
            path = get_resource_path("profile.json")
            with open(path, "w") as f:
                json.dump(self.profile_data, f)
            self.log("✅ Profile saved successfully to local storage.")
            
            # --- CLOUD PROFILE SYNC ---
            if self.profile_data.get("email"):
                threading.Thread(target=self.sync_profile_to_cloud, daemon=True).start()
                
            if self.profile_data.get("alias"):
                self.alias_alert.configure(text="", text_color="#28a745")
            else:
                self.alias_alert.configure(text="⚠️ SET ALIAS IN PROFILES", text_color="#dc3545")
        except Exception as e:
            self.log(f"❌ Profile Save Error: {e}")

    def play_restock_ping(self):
        """Plays a configurable sound notification"""
        sound_type = self.sound_type_var.get()
        pitch = int(self.pitch_slider.get())
        
        self.log(f"🔊 Playing notification sound: {sound_type} ({pitch}Hz)")
        
        try:
            if sound_type == "Beep":
                winsound.Beep(pitch, 400)
            elif sound_type == "Ding":
                # Pleasant high-pitch ding using frequency
                winsound.Beep(int(pitch * 1.8), 150)
            elif sound_type == "Pulse":
                # Multi-tone pulse
                winsound.Beep(pitch, 100)
                time.sleep(0.05)
                winsound.Beep(int(pitch * 1.2), 150)
        except Exception as e:
            self.log(f"⚠️ Audio Device Error: {e}")

    def simulate_restock_event(self):
        """Mocks a restock detection for testing alerts and sounds"""
        test_item = {
            'sid': "SIM_TEST_999",
            'title': "TEST: Hype Sneakers v1",
            'sz': "UK 9",
            'color': "Triple Black",
            'soh': 1,
            'price': 2499.0,
            'url': "https://www.shelflife.co.za/product/air-jordan-6-retro-women-s-low-blackout"
        }
        self.log("🔔 [SIMULATION] TRIGGERING WATCHLIST RESTOCK EVENT...")
        self.play_restock_ping()
        
        if self.atc_var.get():
            self.log("🤖 [SIMULATION] Auto-ATC active. Spawning test browser...")
            threading.Thread(target=self.run_atc_automation, args=(test_item, "Shelflife"), daemon=True).start()
        else:
            self.log("ℹ️ [SIMULATION] Auto-ATC disabled. Only audio alert played.")

    def manual_test_atc(self):
        selected_store = self.test_store_var.get()
        self.log(f"🧪 MANUALLY TRIGGERING {selected_store.upper()} ATC TEST...")
        self.play_restock_ping()
        
        # Test Data mapping
        test_configs = {
            "Shelflife": {
                "title": "TEST: Jordan 6 Low",
                "url": "https://www.shelflife.co.za/product/air-jordan-6-retro-women-s-low-blackout",
                "sid": "S12345",
                "store": "Shelflife"
            },
            "Lemkus": {
                "title": "TEST: Nocta Fleece Crew",
                "url": "https://www.lemkus.com/products/nocta-cs-fleece-crew-m",
                "sid": "48887321460988",
                "store": "Jack Lemkus"
            },
            "Archive": {
                "title": "TEST: New Balance 1890",
                "url": "https://bash.com/new-balance-men-s-1890-v1-yellow-black-sneaker-060602absi3/p",
                "sid": "2870526",
                "store": "Archive"
            },
            "CourtOrder": {
                "title": "TEST: Jordan 5 Reverse",
                "url": "https://courtorder.co.za/products/jordan-5-retro-reverse-metallic",
                "sid": "53034245095787",
                "store": "Court Order"
            },
            "PNP": {
                "title": "TEST: KAWS x Uniqlo Tee",
                "url": "https://theplugandplay.co.za/products/kawsotheraws-x-uniqlo-flayed-tee-whitet-shirts",
                "sid": "46329933496519",
                "store": "The Plug and Play"
            },
            "Soul": {
                "title": "TEST: Denim Tears Crew",
                "url": "https://soulgallery.co.za/products/denim-tears-x-levis-crewneck-black",
                "sid": "46300424011942",
                "store": "Soul Gallery"
            }
        }
        
        config = test_configs.get(selected_store)
        if config:
            threading.Thread(target=self.run_atc_automation, args=(config, config["store"]), daemon=True).start()
        else:
            self.log(f"⚠️ No test config for {selected_store}")

    def log(self, message):
        timestamp = time.strftime("[%H:%M:%S]")
        print(f"{timestamp} {message}")
        try:
            self.log_box.insert("end", f"{timestamp} {message}\n")
            self.log_box.see("end")
        except: pass

    def update_scale_label(self, val):
        self.scale = int(val)
        self.scale_status_label.configure(text=f"ACTIVE_NODES: {self.scale}")
        
        mode = self.mode_var.get()
        # Constants for R150/GB managed rate (R0.15 / MB)
        if mode == "Sniper":
            mb_rate = 480
            hr_rate = mb_rate * 0.15 # R72.00 / hr
            est_cost = self.scale * hr_rate
            est_data = self.scale * mb_rate
            drain_text = f"ESTIMATED DRAIN: R{est_cost:.2f} / HR ({est_data:.1f} MB/hr Hive VPN)"
        else:
            est_cost = 0.00
            drain_text = f"ESTIMATED DRAIN: R{est_cost:.2f} / HR (Local IP | No Data Cost)"

        self.cost_estimation_label.configure(
            text=drain_text,
            text_color="#dc3545" if self.scale > 1 and mode == "Sniper" else "gray"
        )

        if mode == "Sniper" and self.scale >= 4:
            self.log(f"⚡ INTENSIVE_FLEET: {self.scale} nodes active. Hive Data consumption prioritized.")
            self.scale_status_label.configure(text_color="#00C853")
        else:
            self.scale_status_label.configure(text_color="#3a86ff")

    def on_mode_change(self, mode):
        self.log(f"🔄 MISSION PIVOT: Strategy updated to {mode.upper()}.")
        self.update_scale_label(self.scale_var.get())
        if mode == "Sniper":
            self.warning_label.pack(pady=5)
        else:
            self.warning_label.pack_forget()

    def start_monitor(self):
        if not self.is_logged_in:
            self.log("⚠️ ACCESS_DENIED: You must sync a PRO profile before starting the monitor.")
            self.log("🔗 Click UNIFY_PROFILE_LNK to authenticate.")
            return
            
        if not self.profile_data.get("alias"):
            self.log("❌ PRIVACY SHIELD: Sniper Alias required before deployment.")
            self.log("ℹ️ Enter a unique alias in the PROFILES tab to protect your identity.")
            return
            
        if not self.monitoring:
            self.monitoring = True
            self.start_btn.configure(state="disabled")
            self.stop_btn.configure(state="normal")
            
            # Use the UI scaling value (Standard limited to 1)
            current_scale = self.scale_var.get()
            if self.user_tier == "Standard":
                current_scale = 1
                self.log("🛡️ TIER_SECURITY: Standard unit active. Hive Proxy Engine online.")
                self.log("ℹ️ FLEET_CAP: Standard unit limited to 1 Cloud Node. Upgrade to PRO for fleet scaling.")
            elif self.user_tier == "Free":
                self.log("❌ ACCESS_DENIED: Free unit must upgrade to Standard or Pro to run nodes.")
                return
            
            self.scale = current_scale
            self.log(f"🚢 INITIALIZING FLEET: {self.user_tier.upper()} mode active. Spawning {current_scale} Worker Node(s)...")
            self.status_label.configure(text=f"SERVER STATUS: RUNNING ({current_scale} NODES)", text_color="#00C853")
            
            for i in range(current_scale):
                node_suffix = f"_{i+1:02d}" if current_scale > 1 else ""
                t = threading.Thread(target=self.monitor_loop, args=(node_suffix, i), daemon=True)
                t.start()
            
            # Start parallel blog intelligence monitor — IDLE/ANTICIPATION only
            if self.mode_var.get() != "Sniper":
                self.blog_thread = threading.Thread(target=self.blog_monitor_loop, daemon=True)
                self.blog_thread.start()
            else:
                self.log("⚡ SNIPER MODE: Blog Intelligence suspended for maximum scan velocity.")

    def stop_monitor(self):
        self.monitoring = False
        self.start_btn.configure(state="normal")
        self.stop_btn.configure(state="disabled")

    def monitor_loop(self, node_suffix="", thread_idx=0):
        # Stagger starts to prevent simultaneous spikes
        if thread_idx > 0:
            time.sleep(thread_idx * 5)
            
        self.solve_cloudflare()
        while self.monitoring:
            self.log(f"🚀 Node{node_suffix} Sweep Cycle Starting...")
            try:
                # 1. PRIMARY STORES
                if self.enabled_stores["Shelflife"].get():
                    self.scrape_shelflife(thread_idx)
                    self.update_heartbeat(node_suffix)
                if not self.monitoring: break
                
                if self.enabled_stores["Jack Lemkus"].get():
                    self.scrape_lemkus()
                    self.update_heartbeat(node_suffix)
                if not self.monitoring: break
                
                if self.enabled_stores["Archive"].get():
                    self.scrape_archive()
                    self.update_heartbeat(node_suffix)
                if not self.monitoring: break

                # Cape Union Mart and Amazon have been disabled per user request.
                if not self.monitoring: break

                # 2. RESELLER STORES (LOAD SECONDARY)
                if self.enabled_stores["Soul Gallery"].get():
                    self.scrape_soulgallery()
                    self.update_heartbeat(node_suffix)
                if not self.monitoring: break
                
                if self.enabled_stores["The Plug and Play"].get():
                    self.scrape_plugnplay()
                    self.update_heartbeat(node_suffix)
                if not self.monitoring: break
                
                if self.enabled_stores["Court Order"].get():
                    self.scrape_courtorder()
                    self.update_heartbeat(node_suffix)

                self.update_heartbeat(node_suffix)
                
                # Global Heartbeat
                self.update_heartbeat(node_suffix)

                
                # Blog check removed from main loop to prevent blocking
                pass
            except Exception as e:
                self.log(f"❌ Cycle Error: {e}")
            
            if self.monitoring:
                mode = self.mode_var.get()
                if mode == "Idle":
                    sleep_time = 3600 # 1 hour
                elif mode == "Anticipation":
                    sleep_time = 60   # 1 minute
                else: # Sniper
                    sleep_time = 0.5  # 500ms (Safest bottom limit for loop overhead)
                
                self.log(f"💤 Protocol: {mode} | Cooldown: {sleep_time}s")
                
                # Dynamic sleep with interrupt check
                if sleep_time >= 1:
                    for _ in range(int(sleep_time)):
                        if not self.monitoring: break
                        time.sleep(1)
                else:
                    time.sleep(sleep_time)
        self.log("✅ Main Scraper Halted.")

    def blog_monitor_loop(self):
        """Dedicated thread for long-running blog intelligence scrapes."""
        while self.monitoring:
            # Skip blog entirely in Sniper mode — preserve CPU/network budget
            if self.mode_var.get() == "Sniper":
                self.log("⚡ SNIPER MODE ACTIVE: Blog sweep paused. Resuming on mode exit.")
                while self.monitoring and self.mode_var.get() == "Sniper":
                    time.sleep(2)
                continue
            current_time = time.time()
            if current_time - self.last_blog_scrape > 43200: # 12 hours
                self.log("📚 Background: Starting Blog Intelligence Sweep...")
                try:
                    self.scrape_blogs()
                    self.last_blog_scrape = current_time
                    self.log("📚 Background: Blog Sweep Complete.")
                except Exception as e:
                    self.log(f"⚠️ Blog Thread Error: {e}")
            
            # Sleep in small increments to allow responsive shutdown
            for _ in range(60): 
                if not self.monitoring: break
                time.sleep(1)
        self.log("✅ Blog Scraper Halted.")

    def on_mode_change(self, mode):
        # TIER PROTECTION: Standard users limited to Idle/Anticipation
        if self.user_tier == "Standard" and mode == "Sniper":
            self.log("⚠️ UNAUTHORIZED: Sniper mode is reserved for PRO members [Sub-second Scrapes].")
            self.log("🔄 Resetting to ANTICIPATION protocol.")
            self.mode_var.set("Anticipation")
            self.mode_selector.set("Anticipation")
            mode = "Anticipation"

        self.mode_info.configure(text=f"MODE: {mode.upper()}")
        if mode == "Sniper":
            self.warning_label.pack(pady=5)
            self.log("🛡️ HIVE_TUNNEL: Sniper Mode Engaged. Stealth protocols active.")
        else:
            self.warning_label.pack_forget()
            self.log(f"🔍 Mode changed to {mode}.")
        
        self.update_scale_label(self.scale_var.get())
        
        self.update_scale_label(self.scale_var.get())

    def get_chrome_version(self):
        try:
            import subprocess, re
            output = subprocess.check_output(r'reg query "HKEY_CURRENT_USER\Software\Google\Chrome\BLBeacon" /v version', shell=True)
            version = re.search(r'(\d+)\.', output.decode())
            if version: return int(version.group(1))
        except: pass
        return None

    def solve_cloudflare(self):
        self.log("🛡️ Initializing Stealth Session for Shelflife API...")
        try:
            with self.uc_lock: # Secure driver creation
                options = uc.ChromeOptions()
                options.add_argument('--window-size=1280,720')
                options.add_argument('--headless=new')
                v = self.get_chrome_version()
                driver = uc.Chrome(options=options, version_main=v)
                driver.get('https://www.shelflife.co.za/products')
                time.sleep(12) 
                cookies = driver.get_cookies()
                self.session_cookies = {c['name']: c['value'] for c in cookies}
                self.user_agent = driver.execute_script("return navigator.userAgent")
                driver.quit()
                self.log("✅ Session Authenticated. Full JSON access enabled.")
        except Exception as e:
            self.log(f"❌ Stealth Error: {e}")

    def scrape_shelflife(self, thread_idx=0):
        total_skus = 0
        self.log("🔍 Fetching Shelflife Full Inventory (Deep Scrape)...")
        for page in range(1, 3): 
            if not self.monitoring: break
            url = f"https://www.shelflife.co.za/products.json?page={page}"
            headers = {"User-Agent": self.user_agent, "Accept": "application/json", "Referer": "https://www.shelflife.co.za/products"}
            try:
                proxy = self.get_proxy_config(thread_idx=thread_idx)
                r = requests.get(url, headers=headers, cookies=self.session_cookies, impersonate="chrome110", proxies=proxy)
                if r.status_code == 200:
                    data = r.json()
                    results = data.get('results', []) or data.get('products', []) or data.get('data', {}).get('results', [])
                    if not results: break
                    
                    sync_items = []
                    for item in results:
                        p = item.get('result', {})
                        if not p: continue
                        title = p.get('title', 'Unknown')
                        color = p.get('color') or '—'
                        for sku in (p.get('skus') or []):
                            if not sku: continue
                            size = sku.get('size_title') or (sku.get('size') or {}).get('title') or 'N/A'
                            raw_price = sku.get('price') or p.get('price')
                            try: p_val = float(str(raw_price).replace('R','').replace(',','').replace(' ','').strip())
                            except: p_val = 0
                            sync_items.append({
                                'sid': str(sku.get('id')), 'title': title, 'sz': str(size), 'color': color,
                                'soh': int(sku.get('soh', 0)), 'price': p_val, 
                                'old_price': float(str(sku.get('old_price') or sku.get('price') or 0).replace('R','').replace(',','').strip()),
                                'url': p.get('url',''),
                                'sku_code': sku.get('code')
                            })
                    self.log(f"💎 Shelflife found {len(sync_items)} SKUs on Page {page}")
                    self.sync_multi(sync_items, "Shelflife")
                    total_skus += len(sync_items)
                    time.sleep(1) 
            except Exception as e: self.log(f"⚠️ Shelflife Page Error: {e}"); break
        self.log(f"✅ Shelflife Sync Complete. Total {total_skus} SKUs.")

    def scrape_lemkus(self):
        self.log("🔍 Fetching Jack Lemkus (Structured Data)...")
        url = "https://www.lemkus.com/products.json?limit=250"
        try:
            proxy = self.get_proxy_config()
            r = requests.get(url, impersonate="chrome110", proxies=proxy)
            if r.status_code == 200:
                prods = r.json().get('products', [])
                target_footwear = ['sneaker', 'footwear', 'shoe', 'jordan', 'nike', 'adidas', 'converse', 'new balance', 'puma', 'asics', 'vans', 'reebok', 'saucony', 'dunk']
                sync_items = []
                for p in prods:
                    title = p.get('title', '').lower()
                    ptype = p.get('product_type', '').lower()
                    
                    # Expanded blacklist for apparel/accessories
                    if any(x in title or x in ptype for x in ['tee', 't-shirt', 'shirt', 'socks', 'sock', 'pant', 'hoodie', 'jacket', 'beanie', 'short', 'crew', 'hat', 'cap', 'bra', 'tights', 'bag', 'backpack', 'bottle', 'slides']): continue
                    if any(x in ptype for x in ['apparel', 'accessories', 'clothing']): continue

                    options = p.get('options', [])
                    c_idx, s_idx = -1, -1
                    for i, o in enumerate(options):
                        on = o.get('name','').lower()
                        if 'color' in on: c_idx = i
                        if 'size' in on: s_idx = i
                    for v in p.get('variants', []):
                        color, size = "—", v.get('title', 'N/A')
                        vopts = [v.get('option1'), v.get('option2'), v.get('option3')]
                        if c_idx != -1 and vopts[c_idx]: color = vopts[c_idx]
                        if s_idx != -1 and vopts[s_idx]: size = vopts[s_idx]
                        sync_items.append({
                            'sid': str(v.get('id')), 'title': p.get('title'), 'sz': str(size), 'color': color,
                            'soh': 1 if v.get('available') else 0, 'price': float(v.get('price', 0)),
                            'old_price': float(v.get('compare_at_price') or v.get('price') or 0),
                            'url': f"https://www.lemkus.com/products/{p.get('handle')}",
                            'sku_code': None
                        })
                self.log(f"🏆 Lemkus found {len(sync_items)} SKUs")
                self.sync_multi(sync_items, "Lemkus")
        except Exception as e:
            self.log(f"⚠️ Lemkus Error: {e}")

    def scrape_courtorder(self):
        self.log("🔍 Fetching Court Order (Deep Page Scrape)...")
        target_brands = ['jordan', 'nike', 'adidas', 'converse', 'new balance', 'puma', 'asics', 'vans', 'reebok', 'saucony', 'dunk', 'sneaker', 'shoe', 'footwear']
        sync_items = []
        page = 1
        while page < 10: # Limit safe depth
            url = f"https://courtorder.co.za/products.json?limit=250&page={page}"
            try:
                proxy = self.get_proxy_config()
                r = requests.get(url, impersonate="chrome110", proxies=proxy)
                if r.status_code == 200:
                    prods = r.json().get('products', [])
                    if not prods: break
                    for p in prods:
                        title = p.get('title', '').lower()
                        ptype = p.get('product_type', '').lower()
                        if not any(b in title or b in ptype for b in target_brands): continue
                        if any(x in title or x in ptype for x in ['tee', 't-shirt', 'socks', 'pant', 'hoodie', 'jacket', 'beanie', 'short', 'cap', 'hat']): continue
                        
                        options = p.get('options', [])
                        s_idx = -1
                        for i, o in enumerate(options):
                            if 'size' in o.get('name','').lower(): s_idx = i
                        
                        for v in p.get('variants', []):
                            size = v.get('title', 'OS')
                            vopts = [v.get('option1'), v.get('option2'), v.get('option3')]
                            if s_idx != -1 and vopts[s_idx]: size = vopts[s_idx]
                            
                            sync_items.append({
                                'sid': f"COURT_{v.get('id')}", 
                                'title': p.get('title'), 
                                'sz': str(size), 
                                'color': "—",
                                'soh': 1 if v.get('available') else 0, 
                                'price': float(v.get('price', 0)),
                                'old_price': float(v.get('compare_at_price') or v.get('price') or 0),
                                'url': f"https://courtorder.co.za/products/{p.get('handle')}"
                            })
                    page += 1
                else: break
            except: break
        self.log(f"🏛️ Court Order found {len(sync_items)} SKUs")
        self.sync_multi(sync_items, "Court Order")

    def scrape_plugnplay(self):
        self.log("🔍 Fetching The Plug and Play (Footwear)...")
        target_brands = ['jordan', 'nike', 'adidas', 'converse', 'new balance', 'puma', 'asics', 'vans', 'reebok', 'saucony', 'dunk', 'sneaker', 'shoe', 'footwear']
        url = "https://theplugandplay.co.za/products.json?limit=250"
        try:
            proxy = self.get_proxy_config()
            r = requests.get(url, impersonate="chrome110", proxies=proxy)
            if r.status_code == 200:
                prods = r.json().get('products', [])
                sync_items = []
                for p in prods:
                    title = p.get('title', '').lower()
                    ptype = p.get('product_type', '').lower()
                    
                    if not any(b in title or b in ptype for b in target_brands): continue
                    if any(x in title or x in ptype for x in ['tee', 't-shirt', 'socks', 'pant', 'hoodie', 'jacket', 'beanie', 'short', 'cap', 'hat']): continue

                    options = p.get('options', [])
                    s_idx = -1
                    for i, o in enumerate(options):
                        if 'size' in o.get('name','').lower(): s_idx = i
                    
                    for v in p.get('variants', []):
                        size = v.get('title', 'OS')
                        vopts = [v.get('option1'), v.get('option2'), v.get('option3')]
                        if s_idx != -1 and vopts[s_idx]: size = vopts[s_idx]
                        
                        sync_items.append({
                            'sid': f"PNP_{v.get('id')}", 
                            'title': p.get('title'), 
                            'sz': str(size), 
                            'color': "—",
                            'soh': 1 if v.get('available') else 0, 
                            'price': float(v.get('price', 0)),
                            'url': f"https://theplugandplay.co.za/products/{p.get('handle')}"
                        })
                self.log(f"🔌 The Plug and Play found {len(sync_items)} SKUs")
                self.sync_multi(sync_items, "The Plug and Play")
        except Exception as e: self.log(f"⚠️ Plug and Play Error: {e}")

    def scrape_soulgallery(self):
        self.log("🔍 Fetching Soul Gallery (Deep Page Scrape)...")
        target_types = ['Jordan 1', 'SB Dunk', 'Sneakers', 'Men', 'Converse', 'Footwear', 'Adidas', 'Women', 'Nike']
        sync_items = []
        page = 1
        while page < 8:
            url = f"https://soulgallery.co.za/products.json?limit=250&page={page}"
            try:
                proxy = self.get_proxy_config()
                r = requests.get(url, impersonate="chrome110", proxies=proxy)
                if r.status_code == 200:
                    prods = r.json().get('products', [])
                    if not prods: break
                    for p in prods:
                        # Only include sneakers/footwear
                        p_type = p.get('product_type', '')
                        if not any(t.lower() in p_type.lower() for t in target_types): continue
                        
                        options = p.get('options', [])
                        s_idx = -1
                        for i, o in enumerate(options):
                            if 'size' in o.get('name','').lower(): s_idx = i
                        
                        for v in p.get('variants', []):
                            size = v.get('title', 'OS')
                            vopts = [v.get('option1'), v.get('option2'), v.get('option3')]
                            if s_idx != -1 and vopts[s_idx]: size = vopts[s_idx]
                            
                            sync_items.append({
                                'sid': f"SOUL_{v.get('id')}", 
                                'title': p.get('title'), 
                                'sz': str(size), 
                                'color': "—",
                                'soh': 1 if v.get('available') else 0, 
                                'price': float(v.get('price', 0)),
                                'old_price': float(v.get('compare_at_price') or v.get('price') or 0),
                                'url': f"https://soulgallery.co.za/products/{p.get('handle')}"
                            })
                    page += 1
                else: break
            except: break
        self.log(f"🕯️ Soul Gallery found {len(sync_items)} SKUs")
        self.sync_multi(sync_items, "Soul Gallery")

    def scrape_archive(self):
        self.log("🔍 Fetching Archive (VTEX Deep Scrape)...")
        search_url = "https://web-api.bash.com/v1/search/bloomreach?page=1&pageSize=40&orderBy=OrderByReleaseDateDESC&text=sneakers&persistentFilters=store%3AArchive"
        try:
            proxy = self.get_proxy_config()
            r = requests.get(search_url, impersonate="chrome110", proxies=proxy)
            resp = r.json()
            base_items = resp.get('data', {}).get('items', []) or resp.get('items', []) or resp.get('products', [])
            vtex_ids, meta_map = [], {}
            for bi in base_items:
                vid = str(bi.get('vtex_id') or bi.get('id'))
                vtex_ids.append(vid)
                meta_map[vid] = {'color': bi.get('baseColor') or bi.get('color', '—'), 'url': bi.get('url'), 'name': bi.get('name')}
            sync_items = []
            for i in range(0, len(vtex_ids), 10):
                batch = vtex_ids[i:i+10]
                fq = "&".join([f"fq=productId:{id}" for id in batch])
                vr = requests.get(f"https://bash.com/api/catalog_system/pub/products/search?{fq}", impersonate="chrome110", headers={"User-Agent": self.user_agent})
                if vr.status_code == 200:
                    for vp in vr.json():
                        pid = str(vp.get('productId'))
                        m = meta_map.get(pid, {})
                        for itm in vp.get('items', []):
                            offer = itm.get('sellers', [{}])[0].get('commertialOffer', {})
                            p_url = f"https://bash.com{m.get('url','')}"
                            sync_items.append({
                                'sid': str(itm.get('itemId')), 'title': m.get('name', 'N/A'),
                                'sz': str(itm.get('Size', ['Multi'])[0]), 'color': m.get('color', '—'),
                                'soh': int(offer.get('AvailableQuantity', 0)), 
                                'price': float(offer.get('Price', 0)),
                                'old_price': float(offer.get('ListPrice', 0)),
                                'url': p_url
                            })
                self.log(f"👟 Archive Sync: {len(sync_items)} SKUs processed via VTEX API")
                self.sync_multi(sync_items, "Archive")
        except Exception as e: self.log(f"⚠️ Archive Error: {e}")

    def scrape_amazon(self):
        self.log("🔍 Fetching Amazon.co.za (Timberland / Puma)...")
        try:
            with self.uc_lock:
                options = uc.ChromeOptions()
                options.add_argument('--headless=new')
                v = self.get_chrome_version()
                driver = uc.Chrome(options=options, version_main=v)
            keywords = ["timberland", "puma sneakers"]
            for kw in keywords:
                driver.get(f"https://www.amazon.co.za/s?k={kw.replace(' ', '+')}")
                time.sleep(6)
                res = driver.execute_script("""
                    const found = [];
                    document.querySelectorAll('.s-result-item[data-asin]').forEach(el => {
                        const t = el.querySelector('h2 a span')?.innerText;
                        const p = el.querySelector('.a-price .a-offscreen')?.innerText || el.querySelector('.a-price-whole')?.innerText;
                        const u = el.querySelector('h2 a')?.href;
                        const id = el.getAttribute('data-asin');
                        if(t && p && id && id.length > 5) found.push({ t, p, u, id });
                    });
                    return found;
                """) or []
                sync_items = []
                for itm in res:
                    try: val = float(str(itm['p']).replace('R','').replace(',','').replace(' ','').strip())
                    except: val = 0
                    sync_items.append({
                        'sid': f"AMZN_{itm['id']}", 'title': itm['t'], 'sz': "Multi", 'color': "—",
                        'soh': 1, 'price': val, 'url': itm['u']
                    })
                self.log(f"📦 Amazon result for '{kw}': {len(sync_items)} items synced")
                self.sync_multi(sync_items, "Amazon")
            driver.quit()
        except Exception as e: self.log(f"⚠️ Amazon Error: {e}")

    def scrape_capeunion(self):
        self.log("🔍 Fetching Cape Union Mart (Trail / Footwear)...")
        try:
            with self.uc_lock:
                options = uc.ChromeOptions()
                options.add_argument('--headless=new')
                v = self.get_chrome_version()
                driver = uc.Chrome(options=options, version_main=v)
            urls = [
                "https://www.capeunionmart.co.za/footwear/running/trail-running-shoes/",
                "https://www.capeunionmart.co.za/c/women-footwear",
                "https://www.capeunionmart.co.za/c/men-footwear"
            ]
            for url in urls:
                self.log(f"👟 Scanning: {url.split('/')[-1] or url.split('/')[-2]}")
                driver.get(url)
                time.sleep(8)
                items = driver.execute_script("""
                    const prods = [];
                    // Cape Union Mart modern Chakra UI pattern
                    document.querySelectorAll('.chakra-linkbox').forEach(tile => {
                        const linkEl = tile.querySelector('a.chakra-linkbox__overlay') || tile.querySelector('a');
                        const url = linkEl?.href || '';
                        
                        // Extract PID from URL pattern /ID.html
                        const pidMatch = url.match(/\/([^\/]+)\.html$/);
                        const pid = pidMatch ? pidMatch[1] : null;
                        
                        // Extract Name (Typically a <p> or the first text node)
                        const name = tile.querySelector('p')?.innerText || tile.innerText.split('\\n')[0];
                        
                        // Extract Price (Look for R value)
                        const priceMatch = tile.innerText.match(/R\s?[\d,.]+/);
                        const price = priceMatch ? priceMatch[0] : null;

                        if(pid && name && price) {
                            prods.push({ pid, name, price, link: url });
                        }
                    });
                    return prods;
                """) or []
                
                sync_items = []
                for itm in items:
                    try: val = float(str(itm['price']).replace('R','').replace(',','').replace(' ','').strip())
                    except: val = 0
                    sync_items.append({
                        'sid': f"CUM_{itm['pid']}", 'title': itm['name'], 'sz': "See Site", 'color': "—",
                        'soh': 1, 'price': val, 'url': itm['u'] if 'u' in itm else itm['link']
                    })
                self.log(f"🏜️ Cape Union Mart found {len(sync_items)} items")
                self.sync_multi(sync_items, "Cape Union Mart")
            driver.quit()
        except Exception as e: self.log(f"⚠️ Cape Union Error: {e}")

    def sync_multi(self, items, store):
        try:
            payload = {"items": items, "store": store}
            resp = requests.post(f"{HUB_URL}/api/v1/sync-stock", json=payload)
            if resp.status_code == 200:
                self.log(f"🛰️ HUB_SYNC: {len(items)} items processed for {store}")
            else:
                self.log(f"⚠️ HUB_SYNC Error: Status {resp.status_code}")
                
            # Local Change Detection (Still needed for pings/ATC)
            fired_product_keys = set()
            for item in items:
                sid = str(item['sid'])
                if item['soh'] > 0:
                    for task in self.keyword_tasks:
                        # Prevent redundant sniper launches for the same product in one sync cycle
                        prod_key = f"{task['name']}_{sid}"
                        if prod_key in fired_product_keys: continue

                        # --- KEYWORD MATCH (title) ---
                        match = True
                        for kw in task['keywords']:
                            pattern = r"\b" + re.escape(kw.strip().lower()) + r"\b"
                            if not re.search(pattern, item['title'].lower()):
                                match = False
                                break
                        
                        if not match: continue

                        # --- SIZE FILTER (sz field) ---
                        task_sizes = [s.strip().lower() for s in task.get('sizes', []) if s.strip()]
                        if task_sizes:
                            item_size = str(item.get('sz', '')).strip().lower()
                            if item_size not in task_sizes:
                                continue  # Size doesn't match — skip this item

                        with self.atc_lock:
                            if sid not in self.triggered_alerts:
                                self.play_restock_ping()
                                size_label = f" (Size {item.get('sz', '?')})"
                                self.log(f"🔥 KEYWORD MATCH: '{task['name']}'{size_label} triggered for '{item['title']}'")
                                self.after(0, lambda i=item: self.show_restock_popup(i))
                                now = time.time()
                                if self.atc_var.get() and (now - self.recent_atc_triggers.get(sid, 0) > 30):
                                    # --- BROWSER POOL GUARD ---
                                    if len(self.active_atc_drivers) >= 3:
                                        self.log(f"⚠️ SNIPER PAUSED: {len(self.active_atc_drivers)} browser windows already open. Close existing windows to resume ATC.")
                                    else:
                                        self.recent_atc_triggers[sid] = now
                                        threading.Thread(target=self.run_atc_automation, args=(item, store), daemon=True).start()
                                        fired_product_keys.add(prod_key)
                                        
                                # --- NOTIFICATION HANDSHAKE ---
                                self.triggered_alerts.add(sid)
                                break
        except Exception as e:
            self.log(f"❌ Sync Error: {e}")

    def update_heartbeat(self, node_suffix=""):
        try:
            host_hash = hashlib.md5(socket.gethostname().encode()).hexdigest()[:4].upper()
            email = self.email_entry.get().strip() or "GUEST"
            alias = self.profile_data.get("alias", "Anonymous_Unit")
            node_id = f"{alias.upper().replace(' ', '_')}_NODE_{host_hash}{node_suffix}"
            
            data = {
                "node_id": node_id,
                "alias": alias,
                "email": email,
                "mode": self.mode_var.get(),
                "status": "active" if self.monitoring else "idle",
                "tier": self.user_tier,
                "platform": sys.platform
            }
            
            requests.post(f"{HUB_URL}/api/v1/heartbeat", json=data)
            self.db_indicator.configure(text="CLOUD: SYNCED", text_color="#28a745")
            self.log(f"💓 Hive Signature: {node_id} ({self.mode_var.get()})")
        except Exception as e:
            self.db_indicator.configure(text="CLOUD: OFFLINE", text_color="#dc3545")
            self.log(f"⚠️ Heartbeat Error: {e}")

    def sync_cloud_profile(self):
        email = self.email_entry.get().strip()
        if not email:
            self.log("⚠️ Auth Error: Email required for Profile Unification.")
            return
            
        self.log(f"🧬 Linking to SoleSeek Cloud: {email}...")
        try:
            resp = requests.get(f"{HUB_URL}/api/v1/profile/{email}")
            if resp.status_code == 200:
                data = resp.json()
                if not data.get("exists"):
                    self.log(f"❓ Profile Not Found: No cloud record for {email}.")
                    self.user_tier = "Free"
                    self.tier_badge.configure(text="GUEST_UNIT", text_color="gray")
                    return

                self.user_tier = data.get("tier", "Free")
                self.is_logged_in = True
                
                allowed_tiers = ["Pro", "Elite", "Admin", "Standard"]
                if self.user_tier not in allowed_tiers:
                    self.log(f"⚠️ ACCESS_DENIED: {self.user_tier} tier cannot launch local nodes.")
                    self.log("🔗 Upgrade to Standard or Pro at SoleSeek.io to activate local node deployment.")
                    self.is_logged_in = False
                    self.tier_badge.configure(text=f"{self.user_tier.upper()}_LOCKED", text_color="gray")
                    return

                if self.user_tier == "Standard":
                    self.tier_badge.configure(text="STANDARD_UNIT", fg_color="#1a1c22", text_color="#3a86ff")
                    self.log("✅ ACCESS_GRANTED: Standard Tier authorized. (100 Slots | 1 Node | Anticipation-Only)")
                else:
                    self.tier_badge.configure(text=f"{self.user_tier.upper()}_UNIT", fg_color="#1a1c22", text_color="#FF3D00")
                    self.log(f"🔥 MISSION_READY: {self.user_tier} Tier authorized with full Sniper fleet capabilities.")
                
                self.log(f"⚡ UNIFIED_AUTH: Welcome back, {data.get('first_name')}.")
                self.sync_user_watchlist()
                self.profile_data["email"] = email
                self.save_profile()
            else:
                self.log(f"❌ Auth Error: Hub Status {resp.status_code}")
        except Exception as e:
            self.log(f"❌ Auth Sync Failed: {e}")

    def sync_user_watchlist(self):
        """Merges Cloud Restock Watchlist into Active Sniper Slots"""
        email = self.email_entry.get().strip()
        if not email: return
        self.log(f"🧬 Restock Watchlist Sync: Fetching cloud signals for {email}...")
        try:
            resp = requests.get(f"{HUB_URL}/api/v1/watchlist/{email}")
            if resp.status_code == 200:
                self.watchlist = resp.json().get("watchlist", [])
                self.log(f"✅ Restock Watchlist Updated: {len(self.watchlist)} items synced from cloud.")
                for title in self.watchlist:
                    if self.user_tier == "Standard" and len(self.keyword_tasks) >= 20: break
                    if not any(t['name'] == title for t in self.keyword_tasks):
                        self.keyword_tasks.append({"name": title, "keywords": [title.lower().strip()], "sizes": []})
                self.refresh_task_ui()
                self.save_tasks()
        except Exception as e:
            self.log(f"⚠️ Restock Watchlist Sync Failed: {e}")

    def scrape_blogs(self):
        self.log("📚 Starting Blog Intelligence Sweep...")
        STORES = {
            "Jack Lemkus": {"url": "https://www.lemkus.com/blogs/news", "selector": "a.article-card__title", "base": "https://www.lemkus.com"},
            "Archive": {"url": "https://blog.archivestore.co.za/news/", "selector": "h3.pp-content-grid-post-title a", "base": ""},
            "Shelflife": {"url": "https://www.shelflife.co.za/magazine", "selector": "a[href*='/magazine/'] h3, a[href*='/magazine/'] h1", "base": "https://www.shelflife.co.za"}
        }
        headers = {"User-Agent": self.user_agent}
        sync_payload = []
        for name, cfg in STORES.items():
            try:
                r = requests.get(cfg["url"], headers=headers, cookies=self.session_cookies, impersonate="chrome110", timeout=15)
                if r.status_code == 200:
                    soup = BeautifulSoup(r.text, 'html.parser')
                    posts = soup.select(cfg["selector"])
                    for p in posts[:5]:
                        title = p.get_text(strip=True)
                        link = p.get('href', '') or (p.parent.get('href', '') if p.parent else '')
                        if not link: continue
                        if not link.startswith('http'): link = cfg["base"] + link
                        doc_id = f"blog_{name}_{title}".replace(" ", "_").replace("/", "_")[:100]
                        sync_payload.append({"doc_id": doc_id, "title": title, "url": link, "store": name, "excerpt": "Bot intelligence detected a regional inventory update."})
            except: pass
        
        if sync_payload:
            try:
                requests.post(f"{HUB_URL}/api/v1/blog-sync", json=sync_payload)
                self.log(f"✅ Blog Intelligence: {len(sync_payload)} reports synced to Hub.")
            except Exception as e:
                self.log(f"❌ Blog Sync Error: {e}")

    def run_atc_automation(self, item, store):
        """Opens a browser and attempts to Add to Cart."""
        url = item.get('url')
        if not url:
            self.log("⚠️ ATC Ghost: No URL available.")
            return

        self.log(f"🛒 Automation: Launching Sniper for {item['title']}...")
        try:
            options = uc.ChromeOptions()
            # Non-headless for visibility
            options.add_argument('--window-size=1280,1024')
            # Disable automation flags to avoid detection
            options.add_argument('--disable-blink-features=AutomationControlled')
            
            # Disable Fonts and heavy UI to speed up page load
            prefs = {
                "profile.managed_default_content_settings.images": 1 if self.load_images_var.get() else 2,
                "profile.default_content_setting_values.notifications": 2,
                "profile.default_content_setting_values.fonts": 2, 
            }
            options.add_experimental_option("prefs", prefs)
            if not self.load_images_var.get():
                options.add_argument('--blink-settings=imagesEnabled=false')
            options.add_argument('--disable-gpu')
            options.add_argument('--no-sandbox')
            options.add_argument('--disable-dev-shm-usage')
            
            # Use Proxy if available (NEW)
            proxy_uc = self.get_proxy_config(for_uc=True)
            if proxy_uc:
                self.log(f"🛡️ Routing Sniper through Proxy: {proxy_uc}")
                options.add_argument(f'--proxy-server={proxy_uc}')
             
            # --- SHELFLIFE SPECIALIZED ATC ---
            if store == "Shelflife":
                self.log(f"👟 Landing on Shelflife Product: {url}")
                with self.uc_lock:
                    driver = uc.Chrome(options=options, version_main=self.get_chrome_version())
                driver.get(url)
                
                # --- CLOUDFLARE BYPASS ---
                for _ in range(15):
                    try:
                        title = driver.title or ""
                        if "Just a moment" not in title and "Cloudflare" not in title: break
                        self.log("🛡️ Waiting for Cloudflare/Stealth bypass...")
                        time.sleep(2.5)
                    except:
                        self.log("⚠️ Connection to Sniper window lost (Closed by user or Cloudflare).")
                        return

                time.sleep(1) # Final settle
                if "Just a moment" in driver.title: 
                    self.log("⚠️ Bypass timed out. Manual intervention required.")
                    return
                
                sku_code = item.get('sku_code')
                self.log(f"🧪 Injecting Shelflife API Cart POST (Code: {sku_code})...")
                driver.execute_script(f"""
                    fetch('/api/cart/add-item.json', {{
                        method: 'POST',
                        headers: {{ 'Content-Type': 'application/json' }},
                        body: JSON.stringify({{ sku_code: '{sku_code}', quantity: 1, personalisation_type: null }})
                    }}).then(res => console.log("✅ Shelflife API ATC Success"));
                """)
                time.sleep(2)
                if self.checkout_var.get():
                   self.log("⚙️ Moving to Shelflife Checkout...")
                   driver.get("https://www.shelflife.co.za/checkout")
            
            # --- SHOPIFY STANDARD ATC ---
            elif store in ["Jack Lemkus", "Court Order", "The Plug and Play", "Soul Gallery"]:
                # Direct ATC URL (very fast) - strip prefix like COURT_ or SOUL_ if present
                clean_sid = item['sid'].split('_')[-1]
                # Ensure we have the base URL
                base_url = url.split('/products/')[0] if '/products/' in url else url.split('/product/')[0]
                atc_url = f"{base_url}/cart/add?id={clean_sid}&quantity=1"
                self.log(f"⚡ Shopify Fast-Cart: {atc_url}")
                with self.uc_lock:
                    driver = uc.Chrome(options=options, version_main=self.get_chrome_version())
                driver.get(atc_url)
                
                # Wait for Cloudflare challenge if it appears
                self.log("🛡️ Checking for Cloudflare/Stealth challenge...")
                cf_cleared = False
                for _ in range(10):
                    try:
                        title = driver.title or ""
                        if "Just a moment" not in title and "Cloudflare" not in title:
                            cf_cleared = True
                            break
                        self.log("🛡️ Waiting for Cloudflare/Stealth bypass...")
                        time.sleep(2.5)
                    except: # Connection lost
                        break

                
                if not cf_cleared:
                    self.log("⚠️ Stuck at Cloudflare? Please solve the challenge in the browser window.")
                else:
                    self.log("🔓 Cloudflare cleared/not present.")
                
                # --- AUTO-CHECKOUT LOGIC (NEW) ---
                if self.checkout_var.get():
                    self.log("⚙️ INITIALIZING AUTO-CHECKOUT SEQUENCE...")
                    time.sleep(2)
                    # Redirect to checkout if not there
                    if "/checkout" not in driver.current_url:
                        driver.get(f"{base_url}/checkout")
                    
                    self.log("📝 Injecting Shipping Data into Shopify Checkout...")
                    driver.execute_script(f"""
                        const p = {json.dumps(self.profile_data)};
                        const fill = (id, val) => {{
                            const el = document.getElementById(id);
                            if(el) {{ el.value = val; el.dispatchEvent(new Event('input', {{ bubbles: true }})); }}
                        }};
                        // Shopify fields
                        fill('checkout_email', p.email);
                        fill('checkout_shipping_address_first_name', p.first_name);
                        fill('checkout_shipping_address_last_name', p.last_name);
                        fill('checkout_shipping_address_address1', p.address1);
                        fill('checkout_shipping_address_address2', p.address2);
                        fill('checkout_shipping_address_city', p.city);
                        fill('checkout_shipping_address_zip', p.postal_code);
                        fill('checkout_shipping_address_phone', p.phone);
                        
                        // Click "Continue to shipping" if visible
                        const btn = document.getElementById('continue_button');
                        if(btn) btn.click();
                    """)
            elif store == "Archive":
                # Modern Bash (VTEX) requires product landing for consistent session tracking
                self.log(f"👟 Landing on Archive Product: {url}")
                with self.uc_lock:
                    driver = uc.Chrome(options=options, version_main=self.get_chrome_version())
                driver.get(url)
                
                # --- CLOUDFLARE BYPASS ---
                for _ in range(10):
                    try:
                        title = driver.title or ""
                        if "Just a moment" not in title and "Cloudflare" not in title: break
                        self.log("🛡️ Waiting for Cloudflare/Stealth bypass...")
                        time.sleep(2.5)
                    except: # Connection lost
                        break

                
                self.log("🖱️ Triggering Bash 'Add to Bag'...")
                time.sleep(2)
                driver.execute_script("""
                    const buttons = Array.from(document.querySelectorAll('button'));
                    const atc = buttons.find(b => b.innerText.toLowerCase().includes('add to bag') || 
                                                b.innerText.toLowerCase().includes('add to basket'));
                    if(atc) {
                        atc.scrollIntoView();
                        atc.click();
                        console.log("✅ ATC Clicked");
                    }
                """)
                
                # Wait for Cart and Go Checkout
                time.sleep(2)
                if self.checkout_var.get():
                   self.log("⚙️ Jumping to Modern Checkout...")
                   driver.get("https://bash.com/checkout")
            else:
                # Standard browser automation for other sites
                with self.uc_lock:
                    driver = uc.Chrome(options=options, version_main=self.get_chrome_version())
                driver.get(url)
                
                self.log(f"⏱️ Waiting for page load: {store}")
                
                # --- CLOUDFLARE BYPASS ---
                for _ in range(10):
                    try:
                        title = driver.title or ""
                        if "Just a moment" not in title and "Cloudflare" not in title: break
                        self.log("🛡️ Waiting for Cloudflare/Stealth bypass...")
                        time.sleep(2.5)
                    except: # Window closed or disconnected
                        break

                time.sleep(3) # Wait for JS to render

                
                # Site specific button clicking
                if store == "Shelflife":
                    # Shelflife uses a button that we can find by text
                    driver.execute_script("""
                        const buttons = Array.from(document.querySelectorAll('button, a'));
                        const atc = buttons.find(b => b.innerText.toLowerCase().includes('add to bag') || 
                                                    b.innerText.toLowerCase().includes('add to cart'));
                        if(atc) {
                            atc.scrollIntoView();
                            atc.click();
                        }
                    """)
                elif store == "Archive":
                    # VTEX Add to Bag
                    driver.execute_script("""
                        const btn = document.querySelector('.vtex-add-to-cart-button, .add-to-bag');
                        if(btn) btn.click();
                        else {
                            const buttons = Array.from(document.querySelectorAll('button'));
                            const atc = buttons.find(b => b.innerText.toLowerCase().includes('add to bag'));
                            if(atc) atc.click();
                        }
                    """)
                else:
                    # Generic fallback
                    driver.execute_script("""
                        const buttons = Array.from(document.querySelectorAll('button'));
                        const atc = buttons.find(b => b.innerText.toLowerCase().includes('cart') || 
                                                    b.innerText.toLowerCase().includes('bag'));
                        if(atc) atc.click();
                    """)
            
            self.log(f"✅ ATC Successful: {item['title']}. Sniper manual takeover ready.")
            # Keep browser open for manual checkout — but cap pool at 3 to prevent memory buildup
            self.active_atc_drivers.append(driver)
            if len(self.active_atc_drivers) > 3:
                old_driver = self.active_atc_drivers.pop(0)
                try:
                    old_driver.quit()  # Close oldest browser to free memory
                except: pass
                self.log("⚠️ Browser pool limit reached. Oldest Sniper window closed to free memory.")
            
        except Exception as e:
            self.log(f"❌ ATC Automation Failed: {e}")

    def sync_profile_to_cloud(self):
        try:
            resp = requests.post(f"{HUB_URL}/api/v1/update-profile", json=self.profile_data)
            if resp.status_code == 200:
                self.log("🚀 CLOUD_SYNC: Fleet metadata synchronized.")
        except Exception as e:
            self.log(f"⚠️ CLOUD_SYNC Error: {e}")

    # --- SYSTEM TRAY PROTOCOLS ---
    def create_tray_icon(self):
        if not pystray: return
        image = self.create_tray_image()
        menu = pystray.Menu(
            pystray.MenuItem("Restore Hub", self.restore_from_tray),
            pystray.MenuItem("Exit Commander", self.on_closing)
        )
        self.tray_icon = pystray.Icon("SoleNode", image, "SoleSeek Sniper Hub", menu)
        threading.Thread(target=self.tray_icon.run, daemon=True).start()

    def create_tray_image(self):
        # Create a simple blue circle with a 'Z' for Zap
        width, height = 64, 64
        image = Image.new('RGB', (width, height), (15, 17, 21))
        draw = ImageDraw.Draw(image)
        draw.ellipse((8, 8, 56, 56), fill=(58, 134, 255))
        return image

    def minimize_to_tray(self):
        if not self.tray_icon:
            self.create_tray_icon()
        self.withdraw()
        self.log("📉 DEPLOY_STEALTH_MODE: Sniper minimized to system tray.")

    def restore_from_tray(self):
        if self.tray_icon:
            self.tray_icon.stop()
            self.tray_icon = None
        self.deiconify()
        self.state('normal')

    def show_restock_popup(self, item):
        """High-impact visual alert for restocks/hits"""
        # Ensure it's inside a TopLevel to not block the main loop
        popup = ctk.CTkToplevel(self)
        popup.title("🔥 SNIPER HIT: CRITICAL_SUCCESS")
        popup.geometry("500x350")
        popup.attributes("-topmost", True)
        popup.configure(fg_color="#0f1115")
        
        # Add glow effect or header
        header = ctk.CTkLabel(popup, text="TARGET_ACQUIRED", font=("Inter", 28, "italic", "bold"), text_color="#3a86ff")
        header.pack(pady=25)
        
        details_frame = ctk.CTkFrame(popup, fg_color="#1a1c22", corner_radius=20, border_width=1, border_color="#3a86ff44")
        details_frame.pack(padx=30, pady=10, fill="both", expand=True)
        
        title_lbl = ctk.CTkLabel(details_frame, text=item.get('title', 'Unknown'), font=("Inter", 15, "bold"), text_color="white", wraplength=400)
        title_lbl.pack(pady=(20, 5))
        
        size_str = f"SIZE: {item.get('sz', 'N/A')}"
        size_lbl = ctk.CTkLabel(details_frame, text=size_str, font=("Inter", 13, "bold"), text_color="#3a86ff")
        size_lbl.pack(pady=5)
        
        store_lbl = ctk.CTkLabel(details_frame, text=f"SOURCE: {item.get('store', 'HUB').upper()}", font=("Inter", 11, "bold"), text_color="gray")
        store_lbl.pack(pady=5)
        
        atc_btn = ctk.CTkButton(popup, text="MANUAL_TAKEOVER_READY", font=("Inter", 12, "bold"), fg_color="#3a86ff", hover_color="#2563eb", height=50, corner_radius=15,
                               command=lambda: popup.destroy())
        atc_btn.pack(pady=25, padx=50, fill="x")
        
        # Auto-close after 60 seconds to prevent clutter
        self.after(60000, lambda: popup.destroy() if popup.winfo_exists() else None)

    def on_closing(self):
        # Confirm close if monitoring
        if self.monitoring:
            if not messagebox.askokcancel("Exit Commander?", "Active Sniper Session Detected. Are you sure you want to terminate the fleet?"):
                return
        if self.tray_icon:
            self.tray_icon.stop()
        self.destroy()
        sys.exit(0)

if __name__ == "__main__":
    lazy_load_core()
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--scale", type=int, default=1)
    args, unknown = parser.parse_known_args()
    
    try:
        app = SoleNodeApp()
        app.scale_val = args.scale
        app.scale = args.scale # Fallback
        app.mainloop()
    except Exception as e:
        with open("crash_log.txt", "w", encoding="utf-8") as f:
            f.write(f"SYSTEM CRASH: {e}\n")
            f.write(traceback.format_exc())
        print(f"❌ CRITICAL ERROR SAVED TO crash_log.txt: {e}")
