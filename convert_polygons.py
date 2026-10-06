from pathlib import Path

ROOT = Path(r"C:\Users\pindi\OneDrive\Desktop\SenseGen_Final_Dataset")

splits = ["train", "valid", "test"]

converted_rows = 0
files_changed = 0

for split in splits:
    label_dir = ROOT / split / "labels"

    for label_file in label_dir.glob("*.txt"):

        lines = label_file.read_text().splitlines()
        new_lines = []
        changed = False

        for line in lines:
            parts = line.strip().split()

            if not parts:
                continue

            # Normal YOLO detection:
            # class x_center y_center width height
            if len(parts) == 5:
                new_lines.append(line)
                continue

            # Polygon:
            # class x1 y1 x2 y2 x3 y3 ...
            if len(parts) > 5 and (len(parts) - 1) % 2 == 0:
                class_id = parts[0]

                coords = list(map(float, parts[1:]))

                xs = coords[0::2]
                ys = coords[1::2]

                x_min = min(xs)
                x_max = max(xs)
                y_min = min(ys)
                y_max = max(ys)

                x_center = (x_min + x_max) / 2
                y_center = (y_min + y_max) / 2
                width = x_max - x_min
                height = y_max - y_min

                new_lines.append(
                    f"{class_id} "
                    f"{x_center:.6f} "
                    f"{y_center:.6f} "
                    f"{width:.6f} "
                    f"{height:.6f}"
                )

                converted_rows += 1
                changed = True

            else:
                print(f"WARNING: Unexpected label format: {label_file}")

        if changed:
            label_file.write_text("\n".join(new_lines) + "\n")
            files_changed += 1

print("Polygon conversion completed.")
print("Files changed:", files_changed)
print("Polygon rows converted:", converted_rows)