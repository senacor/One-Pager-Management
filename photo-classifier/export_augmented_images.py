"""
export_augmented_images.py

Generates and saves 2000 augmented images per category using the same preprocessing and augmentation as in preprocess.py.
"""
import os
import numpy as np
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from PIL import Image
from preprocess import intelligent_center_crop, IMG_SIZE

# Parameters
SRC_DIR = 'dataset'
DST_DIR = 'augmented_dataset'
N_IMAGES_PER_CLASS = 2000
BATCH_SIZE = 32

# Augmentation configs (same as preprocess.py)
compliant_datagen = ImageDataGenerator(
    rescale=1./255,
    rotation_range=10,
    width_shift_range=0.1,
    height_shift_range=0.1,
    brightness_range=(0.8, 1.2),
    zoom_range=0.1,
    horizontal_flip=True,
    preprocessing_function=lambda img: intelligent_center_crop(img, IMG_SIZE)
)
noncompliant_datagen = ImageDataGenerator(
    rescale=1./255,
    rotation_range=20,
    width_shift_range=0.2,
    height_shift_range=0.2,
    brightness_range=(0.6, 1.4),
    zoom_range=0.3,
    shear_range=20,
    horizontal_flip=True,
    fill_mode='nearest',
    preprocessing_function=lambda img: intelligent_center_crop(img, IMG_SIZE)
)

os.makedirs(DST_DIR, exist_ok=True)
for cls, datagen in zip(['compliant', 'non-compliant'], [compliant_datagen, noncompliant_datagen]):
    src_path = os.path.join(SRC_DIR, cls)
    dst_path = os.path.join(DST_DIR, cls)
    os.makedirs(dst_path, exist_ok=True)
    generator = datagen.flow_from_directory(
        SRC_DIR,
        classes=[cls],
        target_size=(IMG_SIZE, IMG_SIZE),
        batch_size=BATCH_SIZE,
        class_mode=None,
        shuffle=True,
        seed=42
    )
    saved = 0
    img_idx = 0
    while saved < N_IMAGES_PER_CLASS:
        batch = next(generator)
        for img in batch:
            # Undo rescale for saving
            img_uint8 = np.clip(img * 255, 0, 255).astype(np.uint8)
            im = Image.fromarray(img_uint8)
            im.save(os.path.join(dst_path, f'{cls}_{img_idx:05d}.jpg'))
            saved += 1
            img_idx += 1
            if saved >= N_IMAGES_PER_CLASS:
                break
    print(f"Saved {saved} images for class '{cls}' to {dst_path}")
print("Done.")
