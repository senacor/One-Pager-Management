"""
train.py

This script sets up and trains a ResNet50-based classifier using the preprocessed data generators from preprocess.py.
"""

import os
import matplotlib.pyplot as plt
from tensorflow.keras.applications import ResNet50
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Dropout
from tensorflow.keras.models import Model
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint
from tensorflow.keras.models import load_model
from preprocess import get_data_generators
from live_plot_callback import LivePlotCallback
import argparse

# Model setup
base_model = ResNet50(weights='imagenet', include_top=False, input_shape=(224, 224, 3))
base_model.trainable = False  # Freeze base for transfer learning

x = base_model.output
x = GlobalAveragePooling2D()(x)
x = Dropout(0.3)(x)
x = Dense(128, activation='relu')(x)
x = Dropout(0.2)(x)
output = Dense(1, activation='sigmoid')(x)

model = Model(inputs=base_model.input, outputs=output)

model.compile(optimizer=Adam(learning_rate=1e-4),
              loss='binary_crossentropy',
              metrics=['accuracy'])

# Callbacks
callbacks = [
    EarlyStopping(monitor='val_loss', patience=5, restore_best_weights=True),
    ModelCheckpoint('best_model.keras', save_best_only=True)
]

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train or resume the ResNet50 classifier.")
    parser.add_argument('--resume', action='store_true', help='Resume training from best_model.keras if available')
    args = parser.parse_args()

    if args.resume and os.path.exists('best_model.keras'):
        print("Resuming from best_model.keras...")
        model = load_model('best_model.keras')
        # Re-compile in case optimizer/loss/metrics need to be reset
        model.compile(optimizer=Adam(learning_rate=1e-4),
                      loss='binary_crossentropy',
                      metrics=['accuracy'])
    else:
        print("Starting training from scratch...")

    train_generator, val_generator, steps_per_epoch = get_data_generators()

    live_plot = LivePlotCallback()
    # Training
    EPOCHS = 150
    history = model.fit(
        train_generator,
        validation_data=val_generator,
        steps_per_epoch=steps_per_epoch * 2,
        epochs=EPOCHS,
        callbacks=callbacks + [live_plot]
    )

    # Optionally, unfreeze some top layers for fine-tuning
    import tensorflow as tf
    tf.keras.backend.clear_session()
    base_model.trainable = True
    for layer in base_model.layers[:-30]:  # Freeze all but last 30 layers
        layer.trainable = False

    model.compile(optimizer=Adam(learning_rate=1e-5),
                  loss='binary_crossentropy',
                  metrics=['accuracy'])

    # Re-instantiate generators and callbacks for fine-tuning
    train_generator, val_generator, steps_per_epoch = get_data_generators()
    live_plot_finetune = LivePlotCallback()
    history_finetune = model.fit(
        train_generator,
        validation_data=val_generator,
        steps_per_epoch=steps_per_epoch * 2,
        epochs=100,
        callbacks=callbacks + [live_plot_finetune]
    )

    model.save('final_model.keras', include_optimizer=False)
    print("Training complete. Model saved as final_model.keras")
