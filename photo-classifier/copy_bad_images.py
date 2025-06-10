import os
import pandas as pd
import shutil
import matplotlib.pyplot as plt
import matplotlib.image as mpimg
import random
import numpy as np

INFER_CSV = 'inference_results_multilabel.csv'
IMG_DIR = 'datasets/multi-label/photos'
BUCKETS_DIR = 'quality_buckets'
NUM_BUCKETS = 5

# Delete output dir before starting
if os.path.exists(BUCKETS_DIR):
    shutil.rmtree(BUCKETS_DIR)
os.makedirs(BUCKETS_DIR, exist_ok=True)

# Read inference results
results_df = pd.read_csv(INFER_CSV)

# Define weights for each label (must match order in CSV)
# Example: bright-background, neutral-background, white-shirt, high-quality, business-attire
LABEL_WEIGHTS = [2.0, 1.0, 1.0, 3.0, 3.0]  # Adjust as needed for your labels

# Gain function for label score transformation
def gain(x, k):
    a = 0.5 * np.power(2.0 * np.where(x < 0.5, x, 1.0 - x), k)
    return np.where(x < 0.5, a, 1.0 - a)

GAIN_K = 3.0  # You can adjust this value as needed

score_cols = [col for col in results_df.columns if col != 'filename']
results_df[score_cols] = gain(results_df[score_cols], GAIN_K)

# Compute a weighted quality score for each image as weighted sum / total weights * 100
weighted_sum = results_df[score_cols].mul(LABEL_WEIGHTS).sum(axis=1)
total_weight = sum(LABEL_WEIGHTS)
results_df['score'] = (weighted_sum / total_weight) * 100

# Dynamically compute bucket edges so buckets always go from 0-100
bucket_edges = [i * (100 / NUM_BUCKETS) for i in range(NUM_BUCKETS + 1)]
results_df['bucket'] = pd.cut(
    results_df['score'],
    bins=bucket_edges,
    labels=[f"{int(bucket_edges[i])}-{int(bucket_edges[i+1])}" for i in range(NUM_BUCKETS)],
    include_lowest=True,
    right=False
)

# Create bucket directories
for label in results_df['bucket'].cat.categories:
    os.makedirs(os.path.join(BUCKETS_DIR, label), exist_ok=True)

# Copy images to their respective buckets, skipping those starting with 'foo'
for _, row in results_df.iterrows():
    fname = row['filename']
    if fname.startswith('foo'):
        continue
    bucket_label = row['bucket']
    if pd.isna(bucket_label):
        continue
    bucket_path = os.path.join(BUCKETS_DIR, bucket_label)
    src = os.path.join(IMG_DIR, fname)
    dst = os.path.join(bucket_path, fname)
    try:
        shutil.copy2(src, dst)
        print(f"Copied {fname} to {bucket_path}")
    except Exception as e:
        print(f"Could not copy {fname}: {e}")

# Visualization: Show 5 random example images per bucket, label with stars
star = '\u2605'  # Unicode for yellow star
fig, axes = plt.subplots(NUM_BUCKETS, 5, figsize=(15, 3 * NUM_BUCKETS))
fig.suptitle('5 Random Example Images per Quality Bucket', fontsize=16)

for i, label in enumerate(results_df['bucket'].cat.categories):
    bucket_path = os.path.join(BUCKETS_DIR, label)
    images = [f for f in os.listdir(bucket_path) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
    random.shuffle(images)
    for j in range(5):
        ax = axes[i, j] if NUM_BUCKETS > 1 else axes[j]
        if j < len(images):
            img_path = os.path.join(bucket_path, images[j])
            try:
                img = mpimg.imread(img_path)
                ax.imshow(img)
                ax.set_title(images[j], fontsize=8)
                # Overlay label scores
                img_row = results_df[results_df['filename'] == images[j]]
                if not img_row.empty:
                    label_scores = img_row.iloc[0][score_cols].values
                    label_text = '\n'.join([
                        f"{col}: {score:.2f}" for col, score in zip(score_cols, label_scores)
                    ])
                    ax.text(0.02, 0.98, label_text, transform=ax.transAxes, fontsize=7, color='white',
                            verticalalignment='top', bbox=dict(facecolor='black', alpha=0.5, boxstyle='round,pad=0.2'))
            except Exception as e:
                ax.axis('off')
                ax.set_title('Error', fontsize=8)
        else:
            ax.axis('off')
        ax.set_xticks([])
        ax.set_yticks([])
    # Set stars as ylabel for each bucket row
    axes[i, 0].set_ylabel(star * (i + 1), rotation=0, size=24, labelpad=40, color='#FFD700')
plt.tight_layout(rect=[0, 0, 1, 0.97])
plt.show()

print("Done. Images distributed into quality buckets.")
