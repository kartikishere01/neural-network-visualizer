# 🧠 3D Neural Network Visualizer

A professional, interactive web application that provides a real-time, animated 3D visualization of a feed-forward Multi-Layer Perceptron (MLP) neural network processing handwritten digits from the MNIST dataset.

![UI Screenshot](https://raw.githubusercontent.com/tensorflow/tfjs-examples/master/mnist-core/screenshot.png) *(Placeholder image reference)*

## 🚀 Key Features

1. **Interactive Drawing Canvas**:
   - Draw digits (0–9) on a 280x280 grid.
   - Smooth rendering downsampled to a 28x28 grid internally to match MNIST formats.
   - Grayscale normalization between `0` (background) and `1` (brush).

2. **Express & TensorFlow.js Backend**:
   - On startup, the server automatically builds a new MLP model (784 → 128 → 64 → 10).
   - Dynamically trains the model in 5–10 seconds using the pre-packed local `mnist` dataset.
   - Saves/caches the model weights locally for instant subsequent loads.
   - Captures and returns intermediate activation layers (`input`, `hidden1`, `hidden2`, `output`) on every inference stroke.

3. **3D Interactive Scene**:
   - Rendered using **Three.js** and **React Three Fiber**.
   - Input layer rendered as a 28x28 layout mapping pixels in 3D space.
   - Synapse lines rendered using efficient `THREE.LineSegments` to achieve a smooth 60fps frame rate.
   - Synapse connections are dynamically rendered based on the active path of the signal propagation (only from active pixels/nodes).

4. **Detailed Controls & Heatmaps**:
   - Continuous propagation mode or Step-through mode.
   - Speed sliders for wave propagation.
   - Dense heatmaps of hidden layer neurons (128 and 64 grid tiles).
   - Concept tooltips explaining input layers, activations (ReLU, Softmax), and biases.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, TypeScript, Tailwind CSS v4, Three.js, React Three Fiber (R3F), @react-three/drei, Lucide React
- **Backend**: Node.js, Express, TensorFlow.js (TFJS), `mnist` dataset package
- **Installation tool**: Winget (Windows Package Manager)

---

## 💻 How to Run Locally

### Prerequisites
Ensure Node.js 18+ is installed on your computer.

### Step 1: Install Dependencies
From the project root directory, run:
```bash
npm run install:all
```
This script will install package dependencies in the root, the `client`, and the `server` workspaces.

### Step 2: Start Development Servers
To run both the client (port 3000) and the backend (port 3001) concurrently, run:
```bash
npm run dev
```

The app will start at [http://localhost:3000](http://localhost:3000). The backend API will automatically run on port 3001 and will be proxied by Vite.

---

## 📂 Project Structure

```text
neural-network-visualizer/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── DrawingCanvas.tsx               # Drawing logic and downscaling preview
│   │   │   ├── NeuralNetworkVisualization.tsx  # R3F 3D visualization scene
│   │   │   ├── ActivationHeatmap.tsx           # Dense heatmaps for hidden layer states
│   │   │   ├── ControlPanel.tsx                # Animation controls and metrics panel
│   │   │   └── Tooltip.tsx                     # Reusable definition popovers
│   │   ├── App.tsx                             # Main dashboard interface
│   │   ├── main.tsx                            # Vite entrypoint
│   │   └── index.css                           # Custom styling & Tailwind 4 imports
│   ├── index.html
│   └── vite.config.ts                          # Vite config with API proxy
├── server/
│   ├── api/
│   │   └── inference.ts                        # Inference endpoint
│   ├── models/
│   │   └── mnistModel.ts                       # TensorFlow.js MLP model setup
│   ├── index.ts                                # Server entrypoint
│   └── tsconfig.json
├── package.json
└── README.md
```
