######## v DEFINE YOUR SETTINGS HERE v ########

# The url extension to use for wtadmin links
wtadmin_url_extension = "williams-tools/"


######## v DO NOT TOUCH THESE VALUES v ########
# (Unless you know what you are doing.)

# Default values dictionary
DEFAULTS = {
    "wtadmin_url_extension": "williams-tools/",
}

# Add fallback protection for getattr
def __getattr__(name):
    if name in DEFAULTS:
        fallback = DEFAULTS[name]
        print(f"[WILLIAMS TOOLS SETTINGS WARNING] Variable '{name}' is not defined! Defaulting to: {fallback}")
        return fallback
    
    print(f"[WILLIAMS TOOLS SETTINGS ERROR] Variable '{name}' is completely undefined and has no default.")
    return None