import os
import pandas as pd
import numpy as np
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.image import img_to_array, load_img
from preprocess import intelligent_center_crop

IMG_DIR = 'datasets/multi-label/photos'
MODEL_PATH = 'final_model_multilabel.keras'
CSV_PATH = 'datasets/multi-label/labels_template.csv'
OUT_CSV = 'inference_results_multilabel.csv'
IMG_SIZE = 224

# Load model and labels
model = load_model(MODEL_PATH)
labels_df = pd.read_csv(CSV_PATH)
labels = labels_df.columns[1:]

results = []

for idx, row in labels_df.iterrows():
    fname = row['filename']
    img_path = os.path.join(IMG_DIR, fname)
    # Bash-style progress bar
    if idx % 10 == 0 or idx == len(labels_df) - 1:
        pct = int((idx + 1) / len(labels_df) * 100)
        bar = '=' * (pct // 2) + ' ' * (50 - pct // 2)
        print(f"\r[{bar}] {pct}% ({idx+1}/{len(labels_df)})", end='', flush=True)
    try:
        img = load_img(img_path)
        img = intelligent_center_crop(img, IMG_SIZE)
        x = img_to_array(img) / 255.0
        x = np.expand_dims(x, 0)
        preds = model.predict(x, verbose=0)[0]
        # Round to 3 decimals for CSV
        preds = [float(f'{p:.3f}') for p in preds]
        results.append([fname] + preds)
    except Exception as e:
        print(f"\nCould not process {img_path}: {e}")
        continue
print()  # Newline after progress bar

out_df = pd.DataFrame(results, columns=['filename'] + list(labels))
out_df.to_csv(OUT_CSV, index=False)
print(f"Inference complete. Results written to {OUT_CSV}")
