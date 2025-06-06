"""
quantize_model.py

Quantizes a Keras model to TensorFlow Lite format with post-training quantization.
Usage:
    python quantize_model.py --model final_model.keras
    # Output will be final_model.tflite
    python quantize_model.py --model best_model.keras
    # Output will be best_model.tflite
    python quantize_model.py --model my_model.h5
    # Output will be my_model.tflite
"""
import argparse
import tensorflow as tf
import os

parser = argparse.ArgumentParser(description="Quantize a Keras model to TFLite format.")
parser.add_argument('--model', type=str, required=True, help='Path to the Keras model file (.keras or .h5)')
args = parser.parse_args()

model_path = args.model
output_path = os.path.splitext(model_path)[0] + '.tflite'

print(f"Loading model from {model_path} ...")
model = tf.keras.models.load_model(model_path)

print("Converting to quantized TFLite format ...")
converter = tf.lite.TFLiteConverter.from_keras_model(model)
converter.optimizations = [tf.lite.Optimize.DEFAULT]
tflite_model = converter.convert()

with open(output_path, 'wb') as f:
    f.write(tflite_model)

print(f"Quantized model saved to {output_path}")
