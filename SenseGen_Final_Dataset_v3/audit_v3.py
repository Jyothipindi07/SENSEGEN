from pathlib import Path

ROOT = Path(r"C:\Users\pindi\OneDrive\Desktop\SenseGen_Final_Dataset\SenseGen_Final_Dataset_v3")

CLASS_NAMES = {
    0: "water_leakage",
    1: "garbage_overflow",
    2: "fire_accident",
    3: "fallen_tree",
    4: "road_damage",
    5: "streetlight_failure",
}

total_images = 0
total_labels = 0
missing_labels = 0
missing_images = 0
invalid_rows = 0

class_counts = {i: 0 for i in CLASS_NAMES}

print("=" * 60)
print("SENSEGEN V3 DATASET AUDIT")
print("=" * 60)

for split in ["train", "valid", "test"]:

    images_dir = ROOT / split / "images"
    labels_dir = ROOT / split / "labels"

    images = []
    for ext in ["*.jpg", "*.jpeg", "*.png", "*.webp"]:
        images.extend(images_dir.glob(ext))

    labels = list(labels_dir.glob("*.txt"))

    print(f"\n{split.upper()}")
    print("-" * 40)
    print("Images :", len(images))
    print("Labels :", len(labels))

    total_images += len(images)
    total_labels += len(labels)

    image_stems = {x.stem for x in images}
    label_stems = {x.stem for x in labels}

    # Check missing labels
    for stem in image_stems - label_stems:
        missing_labels += 1

    # Check missing images
    for stem in label_stems - image_stems:
        missing_images += 1

    # Validate labels
    for label_file in labels:

        with open(label_file, "r", encoding="utf-8") as f:

            for line_number, line in enumerate(f, start=1):

                parts = line.strip().split()

                if not parts:
                    continue

                # YOLO detection format:
                # class x_center y_center width height
                if len(parts) != 5:
                    invalid_rows += 1
                    continue

                try:
                    class_id = int(parts[0])

                    values = [float(x) for x in parts[1:]]

                except ValueError:
                    invalid_rows += 1
                    continue

                if class_id not in CLASS_NAMES:
                    invalid_rows += 1
                    continue

                # Coordinates must be normalized 0-1
                if not all(0 <= x <= 1 for x in values):
                    invalid_rows += 1
                    continue

                class_counts[class_id] += 1


print("\n" + "=" * 60)
print("CLASS ANNOTATION COUNTS")
print("=" * 60)

for class_id, name in CLASS_NAMES.items():
    print(f"{class_id}: {name:<22} {class_counts[class_id]}")

print("\n" + "=" * 60)
print("FINAL AUDIT")
print("=" * 60)

print("Total images :", total_images)
print("Total labels :", total_labels)
print("Missing labels:", missing_labels)
print("Missing images:", missing_images)
print("Invalid rows :", invalid_rows)

print("=" * 60)

if (
    missing_labels == 0
    and missing_images == 0
    and invalid_rows == 0
):
    print("✅ DATASET AUDIT PASSED")
else:
    print("❌ DATASET AUDIT FAILED")

print("=" * 60)