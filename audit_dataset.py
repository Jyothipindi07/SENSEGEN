import os

ROOT = r"C:\Users\pindi\OneDrive\Desktop\SenseGen_Final_Dataset"

splits = ["train", "valid", "test"]

for split in splits:
    image_dir = os.path.join(ROOT, split, "images")
    label_dir = os.path.join(ROOT, split, "labels")

    images = {
        os.path.splitext(f)[0]
        for f in os.listdir(image_dir)
        if f.lower().endswith((".jpg", ".jpeg", ".png", ".webp"))
    }

    labels = {
        os.path.splitext(f)[0]
        for f in os.listdir(label_dir)
        if f.lower().endswith(".txt")
    }

    missing_labels = images - labels
    missing_images = labels - images

    print(f"\n{split.upper()}")
    print("Images:", len(images))
    print("Labels:", len(labels))
    print("Images without labels:", len(missing_labels))
    print("Labels without images:", len(missing_images))

print("\nDataset audit completed.")