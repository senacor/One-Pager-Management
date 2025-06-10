"""
infer.py

Batch classify all images in dataset/ and testset/ using the trained model.
Saves results to a CSV and prints images where the model is uncertain.
"""

import sys
import os
import numpy as np
import csv
from tensorflow.keras.models import load_model
from preprocess import intelligent_center_crop, IMG_SIZE
from PIL import Image

# Load the trained model
model = load_model('final_model_40+20.keras')

# Class labels (adjust if your class indices are different)
class_labels = {0: 'compliant', 1: 'non-compliant'}

# Threshold for "uncertain" predictions (change as needed)
UNCERTAIN_LOW = 0.4
UNCERTAIN_HIGH = 0.6


def predict_image(img_path):
    img = Image.open(img_path)
    img = intelligent_center_crop(img, IMG_SIZE)
    img = img / 255.0  # Rescale
    img = np.expand_dims(img, axis=0)  # Add batch dimension
    pred = model.predict(img, verbose=0)[0][0]
    label = class_labels[1] if pred > 0.5 else class_labels[0]
    return label, pred


def batch_infer(image_dirs, output_csv='inference_results.csv'):
    results = []
    for root_dir in image_dirs:
        for subdir, _, files in os.walk(root_dir):
            for fname in files:
                if fname.lower().endswith(('.jpg', '.jpeg', '.png')):
                    fpath = os.path.join(subdir, fname)
                    try:
                        label, score = predict_image(fpath)
                        results.append({'file': fpath, 'label': label, 'score': score})
                    except Exception as e:
                        print(f"Error processing {fpath}: {e}")
    # Save to CSV
    with open(output_csv, 'w', newline='') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=['file', 'label', 'score'])
        writer.writeheader()
        for row in results:
            writer.writerow(row)
    print(f"Results saved to {output_csv}")
    # Print uncertain predictions
    print("\nUncertain predictions (score between {:.2f} and {:.2f}):".format(UNCERTAIN_LOW, UNCERTAIN_HIGH))
    for row in results:
        if UNCERTAIN_LOW < row['score'] < UNCERTAIN_HIGH:
            print(f"{row['file']}: {row['label']} (score: {row['score']:.3f})")

if __name__ == "__main__":
    # By default, process both dataset/ and testset/
    batch_infer(['dataset', 'testset'])
