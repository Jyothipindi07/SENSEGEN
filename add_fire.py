from pathlib import Path
import shutil

# Original Fire Detection dataset
SOURCE = Path(r"C:\Users\pindi\Downloads\Fire Detection.v8i.yolov11")

# Your final SenseGen dataset
DEST = Path(r"C:\Users\pindi\OneDrive\Desktop\SenseGen_Final_Dataset")

# Fire Detection original class:
# 0 = Fire Detection Final
#
# SenseGen:
# 2 = fire_accident

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

                # Fire Detection has only class 0
                if old_class == 0:

                    # Convert Fire Detection class 0
                    # to SenseGen class 2
                    parts[0] = "2"

                    new_lines.append(" ".join(parts))

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

        # Save converted label
        output_label = dest_labels / label_file.name

        with open(
            output_label,
            "w",
            encoding="utf-8"
        ) as f:

            f.write("\n".join(new_lines) + "\n")

        copied += 1

    print(f"{split}: {copied} fire images added")
    print(f"{split}: {skipped} skipped")


print("\n================================")
print("FIRE DATASET ADDED")
print("================================")
print("Fire Detection class 0 -> SenseGen class 2")
print("SenseGen class 2 = fire_accident")
print("Original Fire Detection dataset was NOT modified.")