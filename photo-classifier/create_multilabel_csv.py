"""
create_multilabel_csv.py

Scans all image files in datasets/multi-label/ and creates a CSV template for multi-label annotation.
Edit the LABELS list to match your use case.
"""
import os
import csv

# Directory containing your images
IMG_DIR = 'datasets/multi-label/photos'
# Output CSV file
CSV_PATH = os.path.join(IMG_DIR, '..', 'labels_template.csv')
# List your multi-labels here
LABELS = ['dark-background', 'white-shirt', 'glasses']

# Find all image files
image_files = [f for f in os.listdir(IMG_DIR) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]

# Write CSV
with open(CSV_PATH, 'w', newline='') as csvfile:
    writer = csv.writer(csvfile)
    writer.writerow(['filename'] + LABELS)
    for fname in sorted(image_files):
        writer.writerow(['photos/' + fname] + [''] * len(LABELS))

print(f"CSV template created: {CSV_PATH} ({len(image_files)} images)")
