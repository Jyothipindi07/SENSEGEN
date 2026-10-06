from pathlib import Path
from collections import Counter

ROOT = Path(r"C:\Users\pindi\OneDrive\Desktop\SenseGen_Final_Dataset")

for split in ["train", "valid", "test"]:
    counter = Counter()

    label_dir = ROOT / split / "labels"

    for file in label_dir.glob("*.txt"):
        with open(file, "r") as f:
            for line in f:
                parts = line.strip().split()

                if parts:
                    counter[int(parts[0])] += 1

    print(f"\n{split.upper()}")

    for class_id in range(5):
        print(f"{class_id}: {counter[class_id]}")

print("\nClass distribution check completed.")