from pathlib import Path
import shutil
import random

V3 = Path(r"C:\Users\pindi\OneDrive\Desktop\SenseGen_Final_Dataset\SenseGen_Final_Dataset_v3")

train_images = V3 / "train" / "images"
train_labels = V3 / "train" / "labels"

valid_images = V3 / "valid" / "images"
valid_labels = V3 / "valid" / "labels"

# Find Street Light files only
streetlight_files = list(train_images.glob("streetlight_*"))

print("Street Light images currently in train:", len(streetlight_files))

# Use 20% for validation
random.seed(42)
random.shuffle(streetlight_files)

validation_count = int(len(streetlight_files) * 0.20)

selected = streetlight_files[:validation_count]

print("Moving to validation:", len(selected))

moved = 0

for image_file in selected:

    label_file = train_labels / (image_file.stem + ".txt")

    if not label_file.exists():
        print("WARNING: label missing:", image_file.name)
        continue

    # Move image
    shutil.move(
        str(image_file),
        str(valid_images / image_file.name)
    )

    # Move matching label
    shutil.move(
        str(label_file),
        str(valid_labels / label_file.name)
    )

    moved += 1

print()
print("==========================================")
print("STREET LIGHT VALIDATION SPLIT COMPLETED")
print("==========================================")
print("Moved:", moved)
print("Remaining Street Light train:", len(streetlight_files) - moved)
print("Street Light validation:", moved)
print("==========================================")