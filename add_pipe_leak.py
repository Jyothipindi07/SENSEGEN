import os
import shutil

SOURCE = r"C:\pipe_leak"
DEST = r"C:\Users\pindi\OneDrive\Desktop\SenseGen_Final_Dataset"

SPLITS = ["train", "valid", "test"]

for split in SPLITS:
    src_images = os.path.join(SOURCE, split, "images")
    src_labels = os.path.join(SOURCE, split, "labels")

    dst_images = os.path.join(DEST, split, "images")
    dst_labels = os.path.join(DEST, split, "labels")

    os.makedirs(dst_images, exist_ok=True)
    os.makedirs(dst_labels, exist_ok=True)

    added = 0
    already_exists = 0
    skipped = 0
    errors = 0

    for label_file in os.listdir(src_labels):

        if not label_file.endswith(".txt"):
            continue

        src_label = os.path.join(src_labels, label_file)

        with open(src_label, "r") as f:
            lines = f.readlines()

        new_lines = []

        for line in lines:
            parts = line.strip().split()

            if len(parts) >= 5:
                # leak -> water_leakage = class 0
                parts[0] = "0"
                new_lines.append(" ".join(parts))

        if not new_lines:
            skipped += 1
            continue

        image_base = os.path.splitext(label_file)[0]
        image_file = None

        for ext in [".jpg", ".jpeg", ".png", ".webp"]:
            candidate = os.path.join(src_images, image_base + ext)

            if os.path.isfile(candidate):
                image_file = candidate
                break

        if image_file is None:
            print(f"Missing image: {label_file}")
            skipped += 1
            continue

        new_image_name = "pipe_" + os.path.basename(image_file)
        new_label_name = "pipe_" + label_file

        dst_image = os.path.join(dst_images, new_image_name)
        dst_label = os.path.join(dst_labels, new_label_name)

        # Already copied earlier
        if os.path.isfile(dst_image) and os.path.isfile(dst_label):
            already_exists += 1
            continue

        try:
            shutil.copy2(image_file, dst_image)

            with open(dst_label, "w") as f:
                f.writelines(new_lines)

            added += 1

        except Exception as e:
            print(f"Copy error: {image_file}")
            print(f"Reason: {e}")
            errors += 1

    print()
    print(f"{split}:")
    print(f"  Added: {added}")
    print(f"  Already existed: {already_exists}")
    print(f"  Skipped: {skipped}")
    print(f"  Errors: {errors}")

print()
print("Pipe Leak processing completed.")