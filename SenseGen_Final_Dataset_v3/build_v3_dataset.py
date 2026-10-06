from pathlib import Path
import shutil

# ============================================================
# PATHS
# ============================================================

V2 = Path(r"C:\Users\pindi\OneDrive\Desktop\SenseGen_Final_Dataset\SenseGen_Final_Dataset_v2")

V3 = Path(r"C:\Users\pindi\OneDrive\Desktop\SenseGen_Final_Dataset\SenseGen_Final_Dataset_v3")

LIGHTS = Path(r"C:\Users\pindi\Downloads\Damaged Lights.v1i.yolov11")


# ============================================================
# CREATE V3 FOLDERS
# ============================================================

for split in ["train", "valid", "test"]:
    (V3 / split / "images").mkdir(parents=True, exist_ok=True)
    (V3 / split / "labels").mkdir(parents=True, exist_ok=True)


# ============================================================
# COPY EXISTING 5-CLASS SENSEGEN DATASET
# ============================================================

print("\nCopying existing SenseGen v2 dataset...")

for split in ["train", "valid", "test"]:

    src_images = V2 / split / "images"
    src_labels = V2 / split / "labels"

    dst_images = V3 / split / "images"
    dst_labels = V3 / split / "labels"

    copied = 0

    for label_file in src_labels.glob("*.txt"):

        image_found = None

        for ext in [".jpg", ".jpeg", ".png", ".webp"]:
            candidate = src_images / (label_file.stem + ext)

            if candidate.exists():
                image_found = candidate
                break

        if image_found is None:
            continue

        shutil.copy2(image_found, dst_images / image_found.name)
        shutil.copy2(label_file, dst_labels / label_file.name)

        copied += 1

    print(f"{split}: {copied} SenseGen images copied")


# ============================================================
# ADD STREETLIGHT "NOT WORKING" DATA
# ============================================================

print("\nAdding Street Light data...")

# Original classes:
# 0 = Not Working
# 1 = Working
#
# We only want:
# 0 = Not Working
#
# New SenseGen class:
# 5 = streetlight_failure


def add_streetlight(split):

    src_images = LIGHTS / split / "images"
    src_labels = LIGHTS / split / "labels"

    dst_images = V3 / split / "images"
    dst_labels = V3 / split / "labels"

    copied = 0
    skipped = 0

    for label_file in src_labels.glob("*.txt"):

        selected_lines = []

        with open(label_file, "r", encoding="utf-8") as f:
            for line in f:
                parts = line.strip().split()

                if not parts:
                    continue

                # Keep only "Not Working" class (original class 0)
                if parts[0] == "0":
                    parts[0] = "5"
                    selected_lines.append(" ".join(parts))

        # Skip images that contain no Not Working annotation
        if not selected_lines:
            skipped += 1
            continue

        image_found = None

        for ext in [".jpg", ".jpeg", ".png", ".webp"]:
            candidate = src_images / (label_file.stem + ext)

            if candidate.exists():
                image_found = candidate
                break

        if image_found is None:
            continue

        # Prefix prevents filename collisions
        new_stem = "streetlight_" + label_file.stem

        shutil.copy2(
            image_found,
            dst_images / (new_stem + image_found.suffix)
        )

        with open(
            dst_labels / (new_stem + ".txt"),
            "w",
            encoding="utf-8"
        ) as f:
            f.write("\n".join(selected_lines) + "\n")

        copied += 1

    print(f"{split}: {copied} Street Light images added, {skipped} skipped")


# Friend dataset has train + valid only
add_streetlight("train")
add_streetlight("valid")


# ============================================================
# CREATE FINAL DATA.YAML
# ============================================================

data_yaml = """train: train/images
val: valid/images
test: test/images

nc: 6

names:
  0: water_leakage
  1: garbage_overflow
  2: fire_accident
  3: fallen_tree
  4: road_damage
  5: streetlight_failure
"""

with open(V3 / "data.yaml", "w", encoding="utf-8") as f:
    f.write(data_yaml)


print("\n============================================================")
print("V3 DATASET BUILD COMPLETED")
print("============================================================")
print(f"Location: {V3}")
print("Classes: 6")
print("5 existing SenseGen classes + Street Light")
print("============================================================")