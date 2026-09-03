import os
from PIL import Image

src_path = r"C:\Users\John\.gemini\antigravity-ide\brain\9049bb1d-ff0f-475d-972a-d82744a788e2\.user_uploaded\media_1787480834185.png"

img = Image.open(src_path).convert("RGBA")
datas = img.getdata()

newData = []
for item in datas:
    r, g, b, a = item
    # Calculate distance from white (255, 255, 255)
    if r > 230 and g > 230 and b > 230:
        # Near white pixel -> make transparent
        newData.append((r, g, b, 0))
    elif r > 210 and g > 210 and b > 210:
        # Subtle anti-aliasing edge
        avg = (r + g + b) / 3.0
        alpha = int((255 - avg) / (255 - 210) * 255)
        newData.append((r, g, b, max(0, min(255, alpha))))
    else:
        newData.append((r, g, b, a))

img.putdata(newData)

# Bounding box crop (trim transparent edges)
bbox = img.getbbox()
if bbox:
    img = img.crop(bbox)

# Create output directories if needed
target_paths = [
    r"c:\Users\John\BARANGAY_AI\apps\resident-pwa\public\logo.png",
    r"c:\Users\John\BARANGAY_AI\apps\admin-portal\public\logo.png",
    r"c:\Users\John\BARANGAY_AI\apps\resident-pwa\public\logo-icon.png",
    r"c:\Users\John\BARANGAY_AI\apps\admin-portal\public\logo-icon.png"
]

for tp in target_paths:
    os.makedirs(os.path.dirname(tp), exist_ok=True)
    img.save(tp, "PNG")
    print(f"Saved transparent logo to {tp}")

print("Logo processing complete!")
