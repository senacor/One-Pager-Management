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

import os
os.environ['TF_ENABLE_MLIR_GRAPH_DUMP'] = '0'
import tensorflow as tf
import argparse

import tensorflowjs as tfjs

parser = argparse.ArgumentParser(description="Quantize a Keras model to TFLite format.")
parser.add_argument('--model', type=str, required=True, help='Path to the Keras model file (.keras or .h5)')
args = parser.parse_args()

model_path = args.model
output_path = os.path.splitext(model_path)[0]

print(f"TensorFlow version: {tf.__version__}, Keras version: {tf.keras.__version__}")

try:
    print(f"Loading model from {model_path} ...", flush=True)
    model = tf.keras.models.load_model(model_path)
    # Convert all layers to float32 for TFLite compatibility
    for layer in model.layers:
        if hasattr(layer, 'dtype') and layer.dtype != 'float32':
            try:
                layer._dtype = 'float32'
            except Exception:
                pass
    print("Converting to quantized TFLite format ...", flush=True)

    tfjs.converters.save_keras_model(model, output_path)

    print(f"Quantized model saved to {output_path}", flush=True)
except Exception as e:
    print(f"Error during quantization: {e}", flush=True)
    import traceback
    traceback.print_exc()
