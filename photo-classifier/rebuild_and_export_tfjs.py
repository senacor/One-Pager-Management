"""
rebuild_and_export_tfjs.py

Rebuilds the model architecture with explicit Input layer, loads trained weights, and exports to TensorFlow.js format.
"""
import os
os.environ['TF_USE_LEGACY_KERAS'] = '1' 
from tensorflow.keras.applications import ResNet50
from tensorflow.keras.layers import Input, GlobalAveragePooling2D, Dropout, Dense
from tensorflow.keras.models import Model
import tensorflowjs as tfjs

IMG_SIZE = 224
NUM_LABELS = 5  # Set this to your number of output labels
KERAS_WEIGHTS_PATH = 'models/final_model_multilabel.keras'  # Path to your trained weights
TFJS_EXPORT_PATH = 'models/tfjs/'  # Output directory for TFJS model

# 1. Build the model architecture with explicit Input layer
input_tensor = Input(shape=(224, 224, 3), name='input_layer')
base_model = ResNet50(weights='imagenet', include_top=False, input_shape=(224, 224, 3), input_tensor=input_tensor)
base_model.trainable = False
x = base_model.output
x = GlobalAveragePooling2D()(x)
x = Dropout(0.3)(x)
x = Dense(128, activation='relu')(x)
x = Dropout(0.2)(x)
output = Dense(NUM_LABELS, activation='sigmoid', dtype='float32')(x)
model = Model(inputs=base_model.input, outputs=output)

# 2. Load your trained weights
model.load_weights(KERAS_WEIGHTS_PATH)
print(f"Loaded weights from {KERAS_WEIGHTS_PATH}")

# 3. Export to TFJS
os.makedirs(TFJS_EXPORT_PATH, exist_ok=True)
tfjs.converters.save_keras_model(model, TFJS_EXPORT_PATH)
print(f"Model exported to TFJS format at {TFJS_EXPORT_PATH}")
