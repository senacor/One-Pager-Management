"""
preprocess.py

This script uses Keras to load images from the dataset, applies data augmentation, and resizes/crops images to 224x224 for ResNet50.
It uses intelligent center cropping to preserve the face region as much as possible.
"""

import os
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.preprocessing import image
from PIL import Image
import numpy as np
import random

# Parameters
IMG_SIZE = 224
BATCH_SIZE = 32
DATASET_DIR = 'dataset'

def intelligent_center_crop(img, target_size):
    # Convert NumPy array to PIL Image if needed
    if isinstance(img, np.ndarray):
        img = Image.fromarray((img * 255).astype(np.uint8)) if img.max() <= 1.0 else Image.fromarray(img.astype(np.uint8))
    img = img.convert("RGB")  # Ensure image is in RGB mode
    width, height = img.size
    min_dim = min(width, height)
    left = (width - min_dim) // 2
    top = (height - min_dim) // 2
    right = left + min_dim
    bottom = top + min_dim
    img = img.crop((left, top, right, bottom))
    img = img.resize((target_size, target_size), Image.LANCZOS)
    arr = np.array(img).astype(np.float32)
    return arr

def get_data_generators():
    # Standard augmentation for 'compliant'
    compliant_datagen = ImageDataGenerator(
        rescale=1./255,
        rotation_range=10,
        width_shift_range=0.1,
        height_shift_range=0.1,
        brightness_range=(0.8, 1.2),
        zoom_range=0.1,
        horizontal_flip=True,
        validation_split=0.2,
        preprocessing_function=lambda img: intelligent_center_crop(img, IMG_SIZE)
    )
    # More aggressive augmentation for 'non-compliant'
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
        validation_split=0.2,
        preprocessing_function=lambda img: intelligent_center_crop(img, IMG_SIZE)
    )
    # Generators for each class
    compliant_train_gen = compliant_datagen.flow_from_directory(
        os.path.join(DATASET_DIR),
        target_size=(IMG_SIZE, IMG_SIZE),
        batch_size=BATCH_SIZE // 2,
        classes=['compliant'],
        class_mode='binary',
        subset='training',
        interpolation='lanczos',
        shuffle=True,
        seed=42
    )
    noncompliant_train_gen = noncompliant_datagen.flow_from_directory(
        os.path.join(DATASET_DIR),
        target_size=(IMG_SIZE, IMG_SIZE),
        batch_size=BATCH_SIZE // 2,
        classes=['non-compliant'],
        class_mode='binary',
        subset='training',
        interpolation='lanczos',
        shuffle=True,
        seed=42
    )
    # Validation generator (standard, both classes)
    val_datagen = ImageDataGenerator(
        rescale=1./255,
        validation_split=0.2,
        preprocessing_function=lambda img: intelligent_center_crop(img, IMG_SIZE)
    )
    val_generator = val_datagen.flow_from_directory(
        os.path.join(DATASET_DIR),
        target_size=(IMG_SIZE, IMG_SIZE),
        batch_size=BATCH_SIZE,
        class_mode='binary',
        subset='validation',
        interpolation='lanczos',
        shuffle=False
    )
    # Custom generator to yield balanced batches
    def balanced_train_generator():
        while True:
            x_c, _ = next(compliant_train_gen)
            x_nc, _ = next(noncompliant_train_gen)
            y_c = np.zeros(len(x_c), dtype=np.float32)  # compliant = 0
            y_nc = np.ones(len(x_nc), dtype=np.float32) # non-compliant = 1
            x = np.concatenate([x_c, x_nc], axis=0)
            y = np.concatenate([y_c, y_nc], axis=0)
            # Shuffle batch
            idx = np.arange(len(x))
            np.random.shuffle(idx)
            yield x[idx], y[idx]
    steps_per_epoch = min(len(compliant_train_gen), len(noncompliant_train_gen))
    return balanced_train_generator(), val_generator, steps_per_epoch

if __name__ == "__main__":
    # Show random batches repeatedly
    train_generator, _, _ = get_data_generators()
    import matplotlib.pyplot as plt
    while True:
        x_batch, y_batch = next(train_generator)
        plt.figure(figsize=(12, 6))
        indices = random.sample(range(len(x_batch)), min(8, len(x_batch)))
        for i, idx in enumerate(indices):
            plt.subplot(2, 4, i + 1)
            plt.imshow(x_batch[idx])
            plt.title(f"Label: {int(y_batch[idx])}")
            plt.axis('off')
        plt.tight_layout()
        plt.show()
        cont = input("Show another random batch? (y/n): ")
        if cont.lower() != 'y':
            break
