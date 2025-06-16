"""
train_multilabel.py

Train a multi-label image classifier using the labels_template.csv and images in datasets/multi-label/photos/.
"""
import os
import pandas as pd
import numpy as np
from tensorflow.keras.applications import ResNet50
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Dropout
from tensorflow.keras.models import Model
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from sklearn.model_selection import train_test_split
from preprocess import intelligent_center_crop
from live_plot_callback import LivePlotCallback
from sklearn.metrics import classification_report
from tensorflow.keras.models import load_model
import argparse

IMG_DIR = 'datasets/multi-label/augmented'
CSV_PATH = 'datasets/multi-label/labels_augmented.csv'
IMG_SIZE = 224
BATCH_SIZE = 256
EPOCHS = 60

# Load CSV
labels_df = pd.read_csv(CSV_PATH)
labels = labels_df.columns[1:]

# Check for NaNs or invalid values in labels
nan_rows = labels_df[list(labels)].isnull().any(axis=1)
if nan_rows.any():
    print("Rows with NaN values in label columns:")
    print(labels_df[nan_rows])
    raise ValueError("NaN values found in label columns!")
non_binary_mask = ~((labels_df[list(labels)] == 0) | (labels_df[list(labels)] == 1)).all(axis=1)
if non_binary_mask.any():
    print("Rows with non-binary values in label columns:")
    print(labels_df[non_binary_mask])
    raise ValueError("Non-binary values found in label columns!")

# Split train/val
train_df, val_df = train_test_split(labels_df, test_size=0.2, random_state=42)

# Data generators
idg = ImageDataGenerator(
    rescale=1./255
)
train_gen = idg.flow_from_dataframe(
    train_df,
    directory=IMG_DIR,  # FIX: Use the actual image directory
    x_col='filename',
    y_col=list(labels),
    target_size=(IMG_SIZE, IMG_SIZE),
    batch_size=BATCH_SIZE,
    class_mode='raw',
    shuffle=True
)

x_batch, y_batch = next(iter(train_gen))
print("Batch X min/max:", np.min(x_batch), np.max(x_batch))
print("Batch Y unique:", np.unique(y_batch))

val_gen = idg.flow_from_dataframe(
    val_df,
    directory=IMG_DIR,  # FIX: Use the actual image directory
    x_col='filename',
    y_col=list(labels),
    target_size=(IMG_SIZE, IMG_SIZE),
    batch_size=BATCH_SIZE,
    class_mode='raw',
    shuffle=False
)

parser = argparse.ArgumentParser(description="Train or resume the multi-label classifier.")
parser.add_argument('--resume', action='store_true', help='Resume training from best_model_multilabel.keras if available')
args = parser.parse_args()

checkpoint_path = 'best_model_multilabel.keras'
if args.resume and os.path.exists(checkpoint_path):
    print(f"Resuming from checkpoint: {checkpoint_path}")
    model = load_model(checkpoint_path)
    # Retrieve base_model from loaded model
    base_model = model.get_layer('resnet50')
else:
    input_tensor = Input(shape=(IMG_SIZE, IMG_SIZE, 3), name='input_layer')
    base_model = ResNet50(weights='imagenet', include_top=False, input_shape=(224, 224, 3), input_tensor=input_tensor, name='resnet50')
    base_model.trainable = False
    x = base_model.output
    x = GlobalAveragePooling2D()(x)
    x = Dropout(0.3)(x)
    x = Dense(128, activation='relu')(x)
    x = Dropout(0.2)(x)
    output = Dense(len(labels), activation='sigmoid', dtype='float32')(x)
    model = Model(inputs=base_model.input, outputs=output)

model.compile(optimizer=Adam(learning_rate=1e-4, clipnorm=1.0),
              loss='binary_crossentropy',
              metrics=['accuracy'])

callbacks = [
    EarlyStopping(monitor='val_loss', patience=10, restore_best_weights=True),
    ModelCheckpoint('best_model_multilabel.keras', save_best_only=True)
]

history = model.fit(
    train_gen,
    validation_data=val_gen,
    epochs=EPOCHS,
    callbacks=callbacks + [LivePlotCallback()]
)

# Optionally, unfreeze some top layers for fine-tuning
base_model.trainable = True
for layer in base_model.layers[:-30]:
    layer.trainable = False
model.compile(optimizer=Adam(learning_rate=1e-5), loss='binary_crossentropy', metrics=['accuracy'])

history_finetune = model.fit(
    train_gen,
    validation_data=val_gen,
    epochs=int(EPOCHS / 3),
    callbacks=callbacks + [LivePlotCallback()]
)

# After training, evaluate per-label performance on validation set
def evaluate_per_label(model, val_gen, labels):
    # Get all validation data
    val_gen.reset()
    y_true = []
    y_pred = []
    for i in range(len(val_gen)):
        x_batch, y_batch = val_gen[i]
        preds = model.predict(x_batch, verbose=0)
        y_true.append(y_batch)
        y_pred.append(preds)
    y_true = np.vstack(y_true)
    y_pred = np.vstack(y_pred)
    # Binarize predictions at 0.5
    y_pred_bin = (y_pred > 0.5).astype(int)
    print("\nPer-label classification report (validation set):")
    print(classification_report(y_true, y_pred_bin, target_names=list(labels)))

model.save('final_model_multilabel.keras', include_optimizer=False)
print('Training complete. Model saved as final_model_multilabel.keras')

evaluate_per_label(model, val_gen, labels)
