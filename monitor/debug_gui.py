
import customtkinter as ctk

class DebugApp(ctk.CTk):
    def __init__(self):
        super().__init__()
        self.title("SoleNode Debug")
        self.geometry("400x200")
        
        self.label = ctk.CTkLabel(self, text="If you see this, the GUI engine (customtkinter) is working.\nThe issue is likely in the heavy imports or Task initialization.", wraplength=350)
        self.label.pack(expand=True, padx=20, pady=20)

if __name__ == "__main__":
    app = DebugApp()
    app.mainloop()
