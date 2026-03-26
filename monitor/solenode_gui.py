import os
import sys
import threading
import time
import customtkinter as ctk
from curl_cffi import requests
from google.cloud import firestore
import undetected_chromedriver as uc
from bs4 import BeautifulSoup
import winsound
import json
import re

# Setup Theme
ctk.set_appearance_mode("Dark")
ctk.set_default_color_theme("blue")

def get_resource_path(relative_path):
    try:
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.abspath(".")
    return os.path.join(base_path, relative_path)

# Set credentials env
CRED_PATH = get_resource_path("service-account-key.json")
if os.path.exists(CRED_PATH):
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = CRED_PATH

class SoleNodeApp(ctk.CTk):
    def __init__(self):
        super().__init__()

        self.title("SoleSeek.io | v1.7 Deep Scraper [Timberland Edition]")
        self.geometry("1000x800")
        self.protocol("WM_DELETE_WINDOW", self.on_closing)

        # State
        self.monitoring = False
        self.monitor_thread = None
        self.db = None
        self.session_cookies = {}
        self.user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        
        try:
            self.db = firestore.Client()
        except: pass

        self.last_blog_scrape = 0
        self.blog_thread = None
        
        # Profile Data (Local persistence)
        self.profile_file = get_resource_path("profile.json")
        self.profile_data = self.load_profile()

        # UI Layout
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(2, weight=1)

        self.header_label = ctk.CTkLabel(self, text="SOLESEEK.io", font=("Inter", 36, "bold"), text_color="#3a86ff")
        self.header_label.grid(row=0, column=0, pady=(20, 5), sticky="n")

        # --- GLOBAL STATUS BAR (NEW) ---
        self.status_bar = ctk.CTkFrame(self, fg_color="#1a1c22", height=40, corner_radius=0)
        self.status_bar.grid(row=1, column=0, sticky="ew", pady=(0, 10))
        self.status_bar.grid_propagate(False)
        
        self.status_dot = ctk.CTkLabel(self.status_bar, text="🟢", font=("Inter", 10))
        self.status_dot.pack(side="left", padx=(20, 0))
        
        self.status_label = ctk.CTkLabel(self.status_bar, text="SERVER STATUS: CONNECTED", font=("Inter", 11, "bold"), text_color="gray")
        self.status_label.pack(side="left", padx=5)

        self.mode_info = ctk.CTkLabel(self.status_bar, text="MODE: ANTICIPATION", font=("Inter", 10, "bold"), text_color="#3a86ff")
        self.mode_info.pack(side="right", padx=20)

        # --- USER CONTEXT ---
        self.context_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.context_frame.grid(row=4, column=0, pady=(10, 20))
        
        self.email_label = ctk.CTkLabel(self.context_frame, text="LOGGED AS (EMAIL):", font=("Inter", 10, "bold"), text_color="#5c5c66")
        self.email_label.pack(side="left", padx=10)
        
        self.email_entry = ctk.CTkEntry(self.context_frame, placeholder_text="your@email.com", width=250, height=30, font=("Inter", 12))
        self.email_entry.pack(side="left")
        
        self.sync_watchlist_btn = ctk.CTkButton(self.context_frame, text="SYNC WATCHLIST", command=self.sync_user_watchlist, width=120, height=30, font=("Inter", 10, "bold"))
        self.sync_watchlist_btn.pack(side="left", padx=10)

        self.control_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.control_frame.grid(row=5, column=0, pady=20)

        self.start_btn = ctk.CTkButton(self.control_frame, text="START MONITOR", command=self.start_monitor, width=200, height=55, font=("Inter", 15, "bold"), fg_color="#28a745", hover_color="#218838")
        self.start_btn.grid(row=0, column=0, padx=15)

        self.stop_btn = ctk.CTkButton(self.control_frame, text="STOP MONITOR", command=self.stop_monitor, state="disabled", width=200, height=55, font=("Inter", 14, "bold"), fg_color="#dc3545", hover_color="#c82333")
        self.stop_btn.grid(row=0, column=1, padx=15)

        # --- TAB VIEW LAYOUT ---
        self.tabview = ctk.CTkTabview(self, width=920, height=450, 
                                      anchor="nw", 
                                      segmented_button_fg_color="#1a1c22",
                                      segmented_button_selected_color="#3a86ff",
                                      segmented_button_selected_hover_color="#2a76ef",
                                      text_color="#ffffff")
        self.tabview.grid(row=2, column=0, padx=40, pady=(10, 10), sticky="nsew")
        
        self.tab_terminal = self.tabview.add("TERMINAL LOG")
        self.tab_wishlist = self.tabview.add("ACTIVE WISHLIST")
        self.tab_tasks = self.tabview.add("SNIPER TASKS")
        self.tab_automation = self.tabview.add("AUTOMATION HUB")
        self.tab_profiles = self.tabview.add("PROFILES")
        self.tab_settings = self.tabview.add("SETTINGS")

        # --- TAB: TERMINAL ---
        self.log_box = ctk.CTkTextbox(self.tab_terminal, font=("Consolas", 12), border_width=1, border_color="#2d2d33")
        self.log_box.pack(padx=10, pady=10, fill="both", expand=True)
        self.log_box.insert("0.0", ">>> SoleSeek Sniper Node v1.8 [Distributed Stealth] Initialized.\n>>> 🟢 Database: Connected\n>>> 🛡️ Amazon Bypass: Active\n")

        # --- TAB: WISHLIST ---
        self.wishlist_frame = ctk.CTkScrollableFrame(self.tab_wishlist, fg_color="transparent")
        self.wishlist_frame.pack(padx=10, pady=10, fill="both", expand=True)
        self.wish_label = ctk.CTkLabel(self.wishlist_frame, text="Sync your email to load your cloud watchlist.", font=("Inter", 13, "italic"), text_color="gray")
        self.wish_label.pack(pady=20)

        # --- TAB: SNIPER TASKS (NEW) ---
        self.tasks_frame = ctk.CTkScrollableFrame(self.tab_tasks, fg_color="transparent")
        self.tasks_frame.pack(padx=20, pady=10, fill="both", expand=True)
        
        self.task_input_frame = ctk.CTkFrame(self.tab_tasks, fg_color="#1a1c22", corner_radius=10)
        self.task_input_frame.pack(padx=20, pady=10, fill="x")
        
        self.task_name_entry = ctk.CTkEntry(self.task_input_frame, placeholder_text="Task (e.g. Jordan 4)", width=150)
        self.task_name_entry.pack(side="left", padx=5, pady=10)
        
        self.task_kw_entry = ctk.CTkEntry(self.task_input_frame, placeholder_text="Keywords (comma separated)", width=250)
        self.task_kw_entry.pack(side="left", padx=5)
        
        self.task_sizes_entry = ctk.CTkEntry(self.task_input_frame, placeholder_text="Target Sizes (e.g. 8, 9, 10)", width=200)
        self.task_sizes_entry.pack(side="left", padx=5)
        
        self.add_task_btn = ctk.CTkButton(self.task_input_frame, text="+ ADD SNIPER TASK", command=self.add_keyword_task, width=150, fg_color="#3a86ff", font=("Inter", 10, "bold"))
        self.add_task_btn.pack(side="right", padx=10)

        # --- TAB: AUTOMATION ---
        self.automation_group = ctk.CTkFrame(self.tab_automation, fg_color="#1a1c22", corner_radius=15)
        self.automation_group.pack(padx=20, pady=10, fill="x")

        self.atc_var = ctk.BooleanVar(value=True)
        self.atc_switch = ctk.CTkSwitch(self.automation_group, text="AUTO ADD TO CART", variable=self.atc_var, font=("Inter", 12, "bold"), progress_color="#3a86ff")
        self.atc_switch.pack(pady=(15, 5))

        self.checkout_var = ctk.BooleanVar(value=False)
        self.checkout_switch = ctk.CTkSwitch(self.automation_group, text="ENABLE AUTO-CHECKOUT (BETA)", variable=self.checkout_var, font=("Inter", 12, "bold"), progress_color="#28a745")
        self.checkout_switch.pack(pady=15)

        # Operational Modes (Moved into Automation tab)
        self.modes_frame = ctk.CTkFrame(self.tab_automation, fg_color="transparent")
        self.modes_frame.pack(pady=10)
        
        self.mode_label = ctk.CTkLabel(self.modes_frame, text="OPERATIONAL_MODE / SCALING_PROTOCOL:", font=("Inter", 10, "bold"), text_color="#5c5c66")
        self.mode_label.pack(pady=5)
        
        self.mode_var = ctk.StringVar(value="Anticipation")
        self.mode_selector = ctk.CTkSegmentedButton(self.modes_frame, 
                                                    values=["Idle", "Anticipation", "Sniper"], 
                                                    variable=self.mode_var,
                                                    command=self.on_mode_change,
                                                    width=400,
                                                    height=35,
                                                    font=("Inter", 11, "bold"),
                                                    selected_color="#3a86ff")
        self.mode_selector.pack()

        self.warning_label = ctk.CTkLabel(self.modes_frame, text="⚠️ SNIPER ALERT: High ban risk. Use a VPN or Proxy to rotate IP during active drops.", font=("Inter", 10, "italic"), text_color="#dc3545")
        self.warning_label.pack(pady=5)
        self.warning_label.pack_forget()

        self.test_store_frame = ctk.CTkFrame(self.tab_automation, fg_color="#1a1c22")
        self.test_store_frame.pack(padx=20, pady=5, fill="x")
        
        self.test_store_label = ctk.CTkLabel(self.test_store_frame, text="MANUAL STORE SNIPER ENGINE TEST:", font=("Inter", 10, "bold"), text_color="gray")
        self.test_store_label.pack(pady=5)
        
        self.test_store_var = ctk.StringVar(value="Shelflife")
        self.test_store_selector = ctk.CTkSegmentedButton(self.test_store_frame, values=["Shelflife", "Lemkus", "Archive", "CourtOrder", "PNP", "Soul"], variable=self.test_store_var, font=("Inter", 10))
        self.test_store_selector.pack(pady=5, padx=10)

        self.test_btn = ctk.CTkButton(self.test_store_frame, text="RUN STORE SNIPE TEST", command=self.manual_test_atc, width=200, height=35, font=("Inter", 11, "bold"), fg_color="#3a86ff")
        self.test_btn.pack(pady=10)

        # --- TAB: PROFILES ---
        self.prof_frame = ctk.CTkScrollableFrame(self.tab_profiles, fg_color="transparent")
        self.prof_frame.pack(fill="both", expand=True, padx=20, pady=10)
        
        ctk.CTkLabel(self.prof_frame, text="SHIPPING & CONTACT PROFILE", font=("Inter", 14, "bold"), text_color="#3a86ff").pack(pady=(10, 20))
        
        self.entries = {}
        fields = [
            ("First Name", "first_name"), ("Last Name", "last_name"),
            ("Email Address", "email"), ("Phone (082...)", "phone"),
            ("Address Line 1", "address1"), ("Address Line 2", "address2"),
            ("Suburb", "suburb"), ("City", "city"),
            ("Province", "province"), ("Postal Code", "postal_code")
        ]
        
        for label, key in fields:
            row = ctk.CTkFrame(self.prof_frame, fg_color="transparent")
            row.pack(fill="x", pady=5)
            ctk.CTkLabel(row, text=label, width=120, anchor="w", font=("Inter", 11)).pack(side="left")
            entry = ctk.CTkEntry(row, width=300, height=35, font=("Inter", 12))
            entry.insert(0, self.profile_data.get(key, ""))
            entry.pack(side="right", expand=True, fill="x")
            self.entries[key] = entry
            
        self.save_prof_btn = ctk.CTkButton(self.tab_profiles, text="💾 SAVE PROFILE LOCALLY", command=self.save_profile, height=45, font=("Inter", 12, "bold"), fg_color="#28a745")
        self.save_prof_btn.pack(pady=20, padx=40, fill="x")

        # --- TAB: SETTINGS ---
        self.node_settings_frame = ctk.CTkScrollableFrame(self.tab_settings, fg_color="transparent")
        self.node_settings_frame.pack(fill="both", expand=True)
        
        # Proxy Engine (NEW)
        self.proxy_group = ctk.CTkFrame(self.node_settings_frame, fg_color="#1a1c22", corner_radius=15)
        self.proxy_group.pack(padx=20, pady=10, fill="x")
        
        self.proxy_header = ctk.CTkLabel(self.proxy_group, text="RESIDENTIAL PROXY ENGINE", font=("Inter", 12, "bold"), text_color="#3a86ff")
        self.proxy_header.pack(pady=(15, 5))
        
        self.proxy_box = ctk.CTkTextbox(self.proxy_group, height=120, font=("Consolas", 11), border_width=1, border_color="#2d2d33")
        self.proxy_box.pack(padx=20, pady=5, fill="x")
        self.proxy_box.insert("0.0", "ip:port\nor\nip:port:user:pass")
        
        self.save_proxy_btn = ctk.CTkButton(self.proxy_group, text="💾 LOCK IN PROXY LIST", command=self.save_proxies, width=150, height=30, font=("Inter", 10, "bold"), fg_color="#28a745")
        self.save_proxy_btn.pack(pady=(5, 15))

        # Audio Settings
        self.sound_group = ctk.CTkFrame(self.node_settings_frame, fg_color="#1a1c22", corner_radius=15)
        self.sound_group.pack(padx=20, pady=20, fill="x")
        
        self.sound_label = ctk.CTkLabel(self.sound_group, text="AUDIO NOTIFICATION ENGINE", font=("Inter", 12, "bold"), text_color="#3a86ff")
        self.sound_label.pack(pady=(15, 5))
        
        self.sound_type_var = ctk.StringVar(value="Beep")
        self.sound_selector = ctk.CTkSegmentedButton(self.sound_group, values=["Beep", "Ding", "Pulse"], variable=self.sound_type_var, command=lambda _: self.play_restock_ping(), font=("Inter", 10))
        self.sound_selector.pack(pady=10, padx=20)
        
        self.pitch_slider = ctk.CTkSlider(self.sound_group, from_=500, to=2000, number_of_steps=15, width=400, command=lambda _: self.play_restock_ping())
        self.pitch_slider.set(1000)
        self.pitch_slider.pack(pady=10)
        
        self.test_sound_btn = ctk.CTkButton(self.sound_group, text="▶ PLAY PREVIEW", command=self.play_restock_ping, width=120, height=25, font=("Inter", 9), fg_color="#333")
        self.test_sound_btn.pack(pady=(5, 15))

        # Stealth Settings (VPN Tip)
        self.stealth_group = ctk.CTkFrame(self.node_settings_frame, fg_color="#1a1c22", corner_radius=15)
        self.stealth_group.pack(padx=20, pady=10, fill="x")
        
        self.stealth_label = ctk.CTkLabel(self.stealth_group, text="STEALTH & SAFETY ADVISORY", font=("Inter", 12, "bold"), text_color="#28a745")
        self.stealth_label.pack(pady=(15, 5))
        
        self.vpn_info = ctk.CTkLabel(self.stealth_group, 
                                     text="🛡️ PRO-TIP: Use a South African VPN OR Residential Proxy\nwhen running in Sniper Mode to prevent IP rate-limiting and bans.", 
                                     font=("Inter", 10), justify="center", text_color="gray")
        self.vpn_info.pack(pady=(5, 15))

        self.user_watchlist = [] 
        self.triggered_alerts = set()
        self.last_atc_sku = None 
        self.proxies = []
        self.proxy_index = 0
        self.keyword_tasks = []
        
        # Load local tasks
        self.load_tasks()
        # Try load proxy settings
        self.load_proxies()

    def add_keyword_task(self):
        name = self.task_name_entry.get().strip()
        kw = self.task_kw_entry.get().strip()
        sizes = self.task_sizes_entry.get().strip()
        if name and kw:
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
                    self.proxy_box.delete("0.0", "end")
                    self.proxy_box.insert("0.0", plist)
                    self.proxies = [p.strip() for p in plist.split("\n") if p.strip()]
                    if self.proxies:
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

    def get_proxy_config(self, for_uc=False):
        """Returns the next proxy for a request or Chrome instance"""
        if not self.proxies: return None
        p = self.proxies[self.proxy_index]
        self.proxy_index = (self.proxy_index + 1) % len(self.proxies)
        
        if for_uc:
            # UC takes --proxy-server=http://ip:port
            parts = p.split(':')
            return f"http://{parts[0]}:{parts[1]}"
        else:
            # curl_cffi format
            parts = p.split(':')
            if len(parts) == 4:
                return {"http": f"http://{parts[2]}:{parts[3]}@{parts[0]}:{parts[1]}", "https": f"http://{parts[2]}:{parts[3]}@{parts[0]}:{parts[1]}"}
            return {"http": f"http://{p}", "https": f"http://{p}"}

    def sync_user_watchlist(self):
        """Fetches active user-specific alerts from Firestore"""
        email = self.email_entry.get().strip()
        if not email or not self.db:
            self.log("⚠️ Watchlist Error: Please provide an email to sync.")
            return

        self.log(f"☁️ Syncing watchlist for {email}...")
        try:
            alerts = self.db.collection("user_alerts") \
                .where("user_email", "==", email) \
                .where("status", "==", "active") \
                .stream()
            
            # Map objects instead of just IDs
            self.user_watchlist = []
            for a in alerts:
                d = a.to_dict()
                self.user_watchlist.append({
                    'id': str(d.get('sku_id')),
                    'title': d.get('product_name') or d.get('product_title', 'Unknown Product'),
                    'size': d.get('size_title', 'N/A')
                })

            self.log(f"✅ Watchlist Sync Complete: {len(self.user_watchlist)} active alerts found.")
            
            # Update Wishlist Tab (Product Name instead of SKU)
            for widget in self.wishlist_frame.winfo_children():
                widget.destroy()
            
            if not self.user_watchlist:
                ctk.CTkLabel(self.wishlist_frame, text="Wishlist Empty. Add items on the website.", font=("Inter", 12)).pack(pady=20)
            else:
                for item in self.user_watchlist:
                    item_frame = ctk.CTkFrame(self.wishlist_frame, fg_color="#1a1c22", border_width=1, border_color="#2d2d33")
                    item_frame.pack(fill="x", pady=2, padx=5)
                    ctk.CTkLabel(item_frame, text=f"{item['title']} ({item['size']})", font=("Inter", 11, "bold"), text_color="#3a86ff").pack(side="left", padx=15, pady=8)
                    ctk.CTkLabel(item_frame, text=f"ID: {item['id']}", font=("Consolas", 9), text_color="gray").pack(side="left", padx=5)
                    ctk.CTkLabel(item_frame, text="SNIPING ACTIVE", font=("Inter", 9, "bold"), text_color="#28a745").pack(side="right", padx=15)
        except Exception as e:
            self.log(f"❌ Watchlist Sync Failed: {e}")

    def load_profile(self):
        try:
            if os.path.exists(self.profile_file):
                with open(self.profile_file, "r") as f:
                    return json.load(f)
        except: pass
        return {}

    def save_profile(self):
        data = {k: v.get().strip() for k, v in self.entries.items()}
        try:
            with open(self.profile_file, "w") as f:
                json.dump(data, f)
            self.profile_data = data
            self.log("✅ Profile saved successfully to local storage.")
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

    def start_monitor(self):
        if not self.monitoring:
            self.monitoring = True
            self.start_btn.configure(state="disabled")
            self.stop_btn.configure(state="normal")
            self.status_label.configure(text="SERVER STATUS: RUNNING (ACTIVE)", text_color="#00C853")
            self.monitor_thread = threading.Thread(target=self.monitor_loop, daemon=True)
            self.monitor_thread.start()
            
            # Start parallel blog intelligence monitor
            self.blog_thread = threading.Thread(target=self.blog_monitor_loop, daemon=True)
            self.blog_thread.start()

    def stop_monitor(self):
        self.monitoring = False
        self.start_btn.configure(state="normal")
        self.stop_btn.configure(state="disabled")

    def monitor_loop(self):
        self.solve_cloudflare()
        while self.monitoring:
            self.log("🚀 Sweep Cycle Starting...")
            try:
                self.scrape_shelflife()
                self.update_heartbeat()
                if not self.monitoring: break
                self.scrape_lemkus()
                self.update_heartbeat()
                if not self.monitoring: break
                self.scrape_archive()
                self.update_heartbeat()
                if not self.monitoring: break
                self.scrape_amazon()
                self.update_heartbeat()
                if not self.monitoring: break
                self.scrape_capeunion()
                self.update_heartbeat()
                if not self.monitoring: break
                self.scrape_soulgallery()
                self.update_heartbeat()
                if not self.monitoring: break
                self.scrape_plugnplay()
                self.update_heartbeat()
                if not self.monitoring: break
                self.scrape_courtorder()
                self.update_heartbeat()
                
                # Global Heartbeat
                self.update_heartbeat()

                
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
        self.mode_info.configure(text=f"MODE: {mode.upper()}")
        if mode == "Sniper":
            self.warning_label.pack(pady=5)
            self.log("⚠️ CAUTION: Sniper Mode Engaged. Polling frequency increased to <1s.")
        else:
            self.warning_label.pack_forget()
            self.log(f"🔍 Mode changed to {mode}.")

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

    def scrape_shelflife(self):
        total_skus = 0
        self.log("🔍 Fetching Shelflife Full Inventory (Deep Scrape)...")
        for page in range(1, 3): 
            if not self.monitoring: break
            url = f"https://www.shelflife.co.za/products.json?page={page}"
            headers = {"User-Agent": self.user_agent, "Accept": "application/json", "Referer": "https://www.shelflife.co.za/products"}
            try:
                proxy = self.get_proxy_config()
                r = requests.get(url, headers=headers, cookies=self.session_cookies, impersonate="chrome110", proxies=proxy)
                if r.status_code == 200:
                    data = r.json()
                    results = data.get('results', {}).get('results', [])
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
                r = requests.get(url, impersonate="chrome110")
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
            r = requests.get(url, impersonate="chrome110")
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
                r = requests.get(url, impersonate="chrome110")
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
            r = requests.get(search_url, impersonate="chrome110")
            if r.status_code != 200: return
            base_items = r.json().get('data', {}).get('items', [])
            vtex_ids, meta_map = [], {}
            for bi in base_items:
                vid = str(bi.get('vtex_id') or bi.get('id'))
                vtex_ids.append(vid)
                meta_map[vid] = {'color': bi.get('baseColor') or bi.get('color', '—'), 'url': bi.get('url'), 'name': bi.get('name')}
            sync_items = []
            for i in range(0, len(vtex_ids), 10):
                batch = vtex_ids[i:i+10]
                fq = "&".join([f"fq=productId:{id}" for id in batch])
                vr = requests.get(f"https://bash.com/api/catalog_system/pub/products/search?{fq}", impersonate="chrome110")
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
        if not self.db: return
        try:
            # 1. Fetch current state to detect changes & restocks
            sids = [str(i['sid']) for i in items]
            existing_data = {}
            
            # Fetch in chunks of 500 (Firestore limit)
            for i in range(0, len(sids), 500):
                chunk = sids[i:i+500]
                refs = [self.db.collection("stock").document(sid) for sid in chunk]
                docs = self.db.get_all(refs)
                for doc in docs:
                    if doc.exists:
                        existing_data[doc.id] = doc.to_dict()

            batch = self.db.batch()
            write_count = 0
            
            for item in items:
                sid = str(item['sid'])
                ref = self.db.collection("stock").document(sid)
                
                old_state = existing_data.get(sid, {})
                old_soh = old_state.get('soh', 0)
                old_price = old_state.get('current_price', 0)
                
                # --- CHANGE DETECTION ---
                has_changed = (item['soh'] != old_soh or item['price'] != old_price)
                is_new = (not old_state)
                
                # --- KEYWORD TASK MATCHING (NEW) ---
                for task in self.keyword_tasks:
                    # Precise word boundary matching (Prevents '3' matching '13')
                    match = True
                    for kw in task['keywords']:
                        pattern = r"\b" + re.escape(kw.strip().lower()) + r"\b"
                        if not re.search(pattern, item['title'].lower()):
                            match = False
                            break
                    if match:
                        # --- SIZE FILTERING (NEW) ---
                        target_sizes = task.get('sizes', [])
                        size_match = True
                        if target_sizes:
                            size_match = False
                            for ts in target_sizes:
                                # Loose matching to catch "UK 9", "9.5", etc.
                                if ts in item['sz'].lower():
                                    size_match = True
                                    break
                        
                        if size_match:
                            if sid not in self.triggered_alerts:
                                self.play_restock_ping()
                                self.log(f"🔥 KEYWORD MATCH: '{task['name']}' triggered for '{item['title']}' ({item['sz']})")
                                # AUTO-SNIPE if not already sniped
                                if self.atc_var.get() and sid != self.last_atc_sku:
                                    self.run_atc_automation(item, store)
                                    self.last_atc_sku = sid
                                self.triggered_alerts.add(sid)
                                break # One trigger per SKU

                # --- WISHLIST / STOCK DETECTION ---
                if item['soh'] > 0:
                    # Check if this SID is on the user's specific watchlist
                    is_watched = any(w['id'] == sid for w in self.user_watchlist)
                    if is_watched:
                        if sid not in self.triggered_alerts:
                            self.play_restock_ping()
                            self.log(f"💎 WISHLIST STOCK FOUND: '{item['title']}' ({item['sz']}) in stock!")
                            self.triggered_alerts.add(sid)
                else: 
                    # If item goes out of stock, clear it from triggered set to allow re-alert later
                    if sid in self.triggered_alerts:
                        self.triggered_alerts.remove(sid)
                
                # --- RESTOCK DETECTION (JSON Feed Tracking) ---
                if item['soh'] > 0 and (old_soh == 0 or is_new):
                    self.log(f"🔥 RESTOCK: {item['title']} ({item['sz']})")
                    log_ref = self.db.collection("restock_logs").document()
                    batch.set(log_ref, {
                        "type": "RESTOCK",
                        "sku_id": sid,
                        "product_title": item['title'],
                        "size_title": item['sz'],
                        "quantity_added": item['soh'],
                        "detected_at": firestore.SERVER_TIMESTAMP,
                        "store": store
                    })
                    write_count += 1
                    
                    # Also update restocked_at on the item itself
                    batch.set(ref, {"restocked_at": firestore.SERVER_TIMESTAMP}, merge=True)

                    # --- TRIGGER AUTO-ATC ---
                    if self.atc_var.get():
                        if self.last_atc_sku != sid:
                            self.last_atc_sku = sid
                            self.log(f"🤖 TRIGGERING AUTO-ATC: {item['title']}")
                            threading.Thread(target=self.run_atc_automation, args=(item, store), daemon=True).start()

                # --- ONLY UPDATE IF CHANGED TO PREVENT DASHBOARD FLICKER ---
                if has_changed or not old_state:
                    batch.set(ref, {
                        "sku_id": sid,
                        "product_title": item['title'],
                        "size_title": item['sz'],
                        "color": item['color'],
                        "soh": item['soh'],
                        "current_price": item['price'],
                        "original_price": item.get('old_price', item['price']),
                        "store": store,
                        "url": item.get('url', ''),
                        "last_updated": firestore.SERVER_TIMESTAMP
                    }, merge=True)
                    write_count += 1
                
                if write_count >= 400:
                    batch.commit()
                    batch = self.db.batch()
                    write_count = 0
            
            if write_count > 0:
                batch.commit()
                
        except Exception as e:
            self.log(f"❌ Sync Error: {e}")

    def update_heartbeat(self):
        if not self.db: return
        try:
            # Global status for legacy dashboard support
            self.db.collection("stock").document("_terminal_status").set({
                "last_scan_at": firestore.SERVER_TIMESTAMP,
                "status": "online",
                "version": "1.8.0"
            }, merge=True)
            
            # Individual Node Tracking
            import socket
            node_id = socket.gethostname()
            self.db.collection("active_nodes").document(node_id).set({
                "last_seen": firestore.SERVER_TIMESTAMP,
                "mode": self.mode_var.get(),
                "node_name": node_id,
                "platform": sys.platform,
                "status": "active" if self.monitoring else "idle"
            }, merge=True)
            
            self.log(f"💓 Network Pulse: {node_id} ({self.mode_var.get()})")
        except Exception as e:
            self.log(f"⚠️ Heartbeat Error: {e}")

    def scrape_blogs(self):
        self.log("📚 Starting Blog Intelligence Sweep...")
        STORES = {
            "Jack Lemkus": {"url": "https://www.lemkus.com/blogs/news", "selector": "a.article-card__title", "base": "https://www.lemkus.com"},
            "Archive": {"url": "https://blog.archivestore.co.za/news/", "selector": "h3.pp-content-grid-post-title a", "base": ""},
            "Shelflife": {"url": "https://www.shelflife.co.za/magazine", "selector": "a[href*='/magazine/'] h3, a[href*='/magazine/'] h1", "base": "https://www.shelflife.co.za"},
            "Nice Kicks": {"url": "https://www.nicekicks.com/news/", "selector": "h2.entry-title a", "base": ""},
            "Sneaker News": {"url": "https://sneakernews.com/", "selector": "h4 a, h2 a", "base": "https://sneakernews.com"},
            "Sole Retriever": {"url": "https://www.soleretriever.com/", "selector": "a.embla_slide h4, a[href^='/news/articles/'] p", "base": "https://www.soleretriever.com"}
        }
        headers = {"User-Agent": self.user_agent}
        for name, cfg in STORES.items():
            try:
                r = requests.get(cfg["url"], headers=headers, cookies=self.session_cookies, impersonate="chrome110", timeout=15)
                if r.status_code == 200:
                    soup = BeautifulSoup(r.text, 'html.parser')
                    posts = soup.select(cfg["selector"])
                    count = 0
                    for p in posts[:8]: # Check latest 8
                        title = p.get_text(strip=True)
                        # Support both: <a href=...> and child elements like <a><h3>title</h3></a>
                        link = p.get('href', '') or (p.parent.get('href', '') if p.parent else '')
                        if not link: continue
                        if not link.startswith('http'): link = cfg["base"] + link
                        
                        doc_id = f"blog_{name}_{title}".replace(" ", "_").replace("/", "_")[:100]
                        doc_ref = self.db.collection("store_blogs").document(doc_id)
                        
                        existing = doc_ref.get()
                        excerpt = "Bot intelligence detected a new editorial update concerning regional inventory and releases."
                        
                        # Only fetch if new OR if existing is placeholder
                        needs_fetch = not existing.exists or "Bot intelligence" in existing.to_dict().get('excerpt', '')

                        if needs_fetch:
                            try:
                                # Fetch full article for excerpt
                                art_r = requests.get(link, headers=headers, cookies=self.session_cookies, impersonate="chrome110", timeout=10)
                                if art_r.status_code == 200:
                                    art_soup = BeautifulSoup(art_r.text, 'html.parser')
                                    # Try common article body selectors
                                    content = art_soup.select_one('article, .article__content, .blog-post-content, .pp-post-content, .post-content, .entry-content, .post-body')
                                    if content:
                                        ps = [p.get_text(strip=True) for p in content.find_all(['p', 'div']) if len(p.get_text(strip=True)) > 20]
                                        if ps:
                                            full_text = " ".join(ps)
                                            # Clean text (remove extra spaces)
                                            full_text = " ".join(full_text.split())
                                            sentences = [s.strip() + "." for s in full_text.split('.') if len(s.strip()) > 15]
                                            if len(sentences) >= 2:
                                                excerpt = f"{sentences[0]} {sentences[1]}"
                                            elif len(sentences) == 1:
                                                excerpt = sentences[0]
                                            
                                            if len(excerpt) > 280: excerpt = excerpt[:277] + "..."
                            except: pass

                            data = {
                                "title": title, "url": link, "store": name,
                                "excerpt": excerpt,
                                "detected_at": firestore.SERVER_TIMESTAMP
                            }
                            doc_ref.set(data, merge=True)
                            count += 1
                    self.log(f"✅ {name} Blog: {count} new reports.")
                else:
                    self.log(f"⚠️ {name} Blog: Status {r.status_code}")
            except Exception as e:
                self.log(f"❌ Blog Error ({name}): {e}")

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
            
            # --- PERFORMANCE OPTIMIZATION (NEW) ---
            # Disable Images, Fonts, and heavy UI to speed up page load by ~70%
            prefs = {
                "profile.managed_default_content_settings.images": 2, # Block images
                "profile.default_content_setting_values.notifications": 2,
                "profile.default_content_setting_values.fonts": 2, # Block fonts
            }
            options.add_experimental_option("prefs", prefs)
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
                driver = uc.Chrome(options=options, version_main=self.get_chrome_version())
                driver.get(url)
                
                # Cloudflare check
                for _ in range(10):
                    title = driver.title or ""
                    if "Just a moment" not in title: break
                    time.sleep(2)
                
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
                driver = uc.Chrome(options=options, version_main=self.get_chrome_version())
                driver.get(atc_url)
                
                # Wait for Cloudflare challenge if it appears
                self.log("🛡️ Checking for Cloudflare challenge...")
                cf_cleared = False
                for _ in range(10):
                    title = driver.title or ""
                    if "Just a moment" not in title:
                        cf_cleared = True
                        break
                    time.sleep(2)
                
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
                driver = uc.Chrome(options=options, version_main=self.get_chrome_version())
                driver.get(url)
                
                # Cloudflare check
                for _ in range(10):
                    title = driver.title or ""
                    if "Just a moment" not in title: break
                    time.sleep(2)
                
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
                driver = uc.Chrome(options=options, version_main=self.get_chrome_version())
                driver.get(url)
                
                self.log(f"⏱️ Waiting for page load: {store}")
                
                # Cloudflare check
                for _ in range(10):
                    title = driver.title or ""
                    if "Just a moment" not in title:
                        break
                    time.sleep(2)
                    
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
            # Keep browser open for user to checkout
            # Note: We don't driver.quit() here!
            
        except Exception as e:
            self.log(f"❌ ATC Automation Failed: {e}")

    def on_closing(self):
        self.monitoring = False
        self.destroy()

if __name__ == "__main__":
    app = SoleNodeApp()
    app.mainloop()
