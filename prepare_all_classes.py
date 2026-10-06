from pathlib import Path
import shutil

# Original complete 22-class dataset
SOURCE = Path(r"C:\Users\pindi\Downloads\SenseGen")

# Your new final dataset
DEST = Path(r"C:\Users\pindi\OneDrive\Desktop\SenseGen_Final_Dataset")

# Original class ID -> new SenseGen class ID
#
# New classes:
# 0 = water_leakage       (will be added later)
# 1 = garbage_overflow
# 2 = fire_accident       (will be added later)
# 3 = fallen_tree
# 4 = road_damage
#
CLASS_MAP = {
    14: 1,  # garbage-overflow -> garbage_overflow
    12: 3,  # fallen_tree -> fallen_tree

    5: 4,   # aligator_cracks -> road_damage
    8: 4,   # cracks -> road_damage
    11: 4,  # debris -> road_damage
    18: 4,  # pothole -> road_damage
    19: 4,  # sand_on_the_road -> road_damage
}

SPLITS = ["train", "valid", "test"]

for split in SPLITS:

    print(f"\nProcessing {split}...")

    source_images = SOURCE / split / "images"
    source_labels = SOURCE / split / "labels"

    dest_images = DEST / split / "images"
    dest_labels = DEST / split / "labels"

    dest_images.mkdir(parents=True, exist_ok=True)
    dest_labels.mkdir(parents=True, exist_ok=True)

    copied = 0
    skipped = 0

    for label_file in source_labels.glob("*.txt"):

        new_lines = []

        with open(label_file, "r", encoding="utf-8") as f:

            for line in f:

                parts = line.strip().split()

                if len(parts) < 5:
                    continue

                try:
                    old_class = int(parts[0])
                except ValueError:
                    continue

                # Keep only our required classes
                if old_class in CLASS_MAP:

                    new_class = CLASS_MAP[old_class]

                    # Replace old class ID
                    parts[0] = str(new_class)

                    new_lines.append(" ".join(parts))

        # If image contains none of our required classes,
        # don't copy it.
        if not new_lines:
            skipped += 1
            continue

        # Find matching image
        image_file = None

        for extension in [
            ".jpg",
            ".jpeg",
            ".png",
            ".JPG",
            ".JPEG",
            ".PNG"
        ]:

            candidate = source_images / (label_file.stem + extension)

            if candidate.exists():
                image_file = candidate
                break

        # Image doesn't exist
        if image_file is None:

            print(
                f"WARNING: Image not found for {label_file.name}"
            )

            skipped += 1
            continue

        # Copy image
        shutil.copy2(
            image_file,
            dest_images / image_file.name
        )

        # Save converted YOLO label
        output_label = dest_labels / label_file.name

        with open(
            output_label,
            "w",
            encoding="utf-8"
        ) as f:

            f.write("\n".join(new_lines) + "\n")

        copied += 1

    print(f"{split}: {copied} images copied")
    print(f"{split}: {skipped} images skipped")


print("\n================================")
print("DATASET PREPARATION COMPLETE")
print("================================")
print("Original dataset was NOT modified.")
print("Only required classes were copied.")
print()
print("Current classes:")
print("1 = garbage_overflow")
print("3 = fallen_tree")
print("4 = road_damage")
print()
print("water_leakage and fire_accident")
print("will be added later.")