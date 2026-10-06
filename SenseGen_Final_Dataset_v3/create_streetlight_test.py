from pathlib import Path
import shutil
import random

V3 = Path(r"C:\Users\pindi\OneDrive\Desktop\SenseGen_Final_Dataset\SenseGen_Final_Dataset_v3")

train_images = V3 / "train" / "images"
train_labels = V3 / "train" / "labels"

test_images = V3 / "test" / "images"
test_labels = V3 / "test" / "labels"

# Find Street Light images currently in training
streetlight_files = list(train_images.glob("streetlight_*"))

print("Street Light images currently in train:", len(streetlight_files))

# Select 20% for the final test set
random.seed(123)
random.shuffle(streetlight_files)

test_count = int(len(streetlight_files) * 0.20)
selected = streetlight_files[:test_count]

print("Moving to test:", len(selected))

moved = 0

for image_file in selected:

    label_file = train_labels / (image_file.stem + ".txt")

    if not label_file.exists():
        print("WARNING: Label missing:", image_file.name)
        continue

    shutil.move(
        str(image_file),
        str(test_images / image_file.name)
    )

    shutil.move(
        str(label_file),
        str(test_labels / label_file.name)
    )

    moved += 1

print()
print("=" * 50)
print("STREET LIGHT TEST SPLIT COMPLETED")
print("=" * 50)
print("Moved to test:", moved)
print("Remaining Street Light train:", len(streetlight_files) - moved)
print("=" * 50)