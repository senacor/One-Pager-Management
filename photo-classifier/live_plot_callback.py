import matplotlib.pyplot as plt
from tensorflow.keras.callbacks import Callback

class LivePlotCallback(Callback):
    def on_train_begin(self, logs=None):
        self.losses = []
        self.val_losses = []
        self.accs = []
        self.val_accs = []
        if not hasattr(self, 'fig') or not plt.fignum_exists(getattr(self, 'fig', None)):
            self.fig, self.ax = plt.subplots(1, 2, figsize=(12, 4))
            self.loss_line, = self.ax[0].plot([], [], label='Train Loss')
            self.val_loss_line, = self.ax[0].plot([], [], label='Val Loss')
            self.acc_line, = self.ax[1].plot([], [], label='Train Acc')
            self.val_acc_line, = self.ax[1].plot([], [], label='Val Acc')
            self.ax[0].set_title('Loss')
            self.ax[1].set_title('Accuracy')
            self.ax[0].legend()
            self.ax[1].legend()
            plt.ion()
            plt.show()

    def on_epoch_end(self, epoch, logs=None):
        # Robustly handle missing keys
        self.losses.append(logs.get('loss', None))
        self.val_losses.append(logs.get('val_loss', None))
        self.accs.append(logs.get('accuracy', None))
        self.val_accs.append(logs.get('val_accuracy', None))
        self.loss_line.set_data(range(len(self.losses)), self.losses)
        self.val_loss_line.set_data(range(len(self.val_losses)), self.val_losses)
        self.acc_line.set_data(range(len(self.accs)), self.accs)
        self.val_acc_line.set_data(range(len(self.val_accs)), self.val_accs)
        self.ax[0].relim()
        self.ax[0].autoscale_view()
        self.ax[1].relim()
        self.ax[1].autoscale_view()
        self.fig.canvas.draw()
        self.fig.canvas.flush_events()
        plt.pause(0.01)

    def on_train_end(self, logs=None):
        plt.ioff()
