import os
import re
import sys

emoji_pattern = re.compile(
    "[\U0001F000-\U0001FFFF\U00002600-\U000027BF\U00002300-\U000023FF]"
)

out = []

for base in [r"c:\Users\John\BARANGAY_AI\apps\resident-pwa", r"c:\Users\John\BARANGAY_AI\apps\admin-portal"]:
    for root, dirs, files in os.walk(base):
        if any(x in root for x in ["node_modules", ".next", ".git"]):
            continue
        for f in files:
            if f.endswith((".tsx", ".ts", ".jsx", ".js")):
                fp = os.path.join(root, f)
                try:
                    with open(fp, "r", encoding="utf-8") as file:
                        for line_num, line in enumerate(file, 1):
                            if emoji_pattern.search(line):
                                out.append(f"{fp}:{line_num}: {line.strip()}")
                except Exception:
                    pass

with open(r"c:\Users\John\BARANGAY_AI\scratch\emoji_matches.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(out))

print(f"Total lines with actual emojis: {len(out)}")
