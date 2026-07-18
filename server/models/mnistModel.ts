import * as tf from '@tensorflow/tfjs';
// @ts-ignore
import * as mnist from 'mnist';
import * as path from 'path';
import * as fs from 'fs';

const projectRoot = process.cwd().endsWith('server') ? path.join(process.cwd(), '..') : process.cwd();
const MODEL_DIR  = path.join(projectRoot, 'server', 'mnist-model-cache');
const MODEL_PATH = `file://${MODEL_DIR.replace(/\\/g, '/')}`;

let model:        tf.LayersModel | null = null;
let h1Model:      tf.LayersModel | null = null;
let h2Model:      tf.LayersModel | null = null;
let h3Model:      tf.LayersModel | null = null;
let h4Model:      tf.LayersModel | null = null;
let initPromise:  Promise<void> | null = null;

// Helper to check if model cache exists
function doesCacheExist(): boolean {
  return fs.existsSync(MODEL_DIR) && fs.existsSync(path.join(MODEL_DIR, 'model.json'));
}

// 4-hidden-layer funnel architecture: 784 → 256 → 128 → 64 → 32 → 10
async function trainModel(): Promise<tf.LayersModel> {
  console.log('Training new 4-layer MNIST model (256→128→64→32) — 8 epochs…');

  const m = tf.sequential();

  m.add(tf.layers.dense({ inputShape: [784], units: 256, activation: 'relu', name: 'hidden1' }));
  m.add(tf.layers.dense({ units: 128, activation: 'relu', name: 'hidden2' }));
  m.add(tf.layers.dense({ units: 64,  activation: 'relu', name: 'hidden3' }));
  m.add(tf.layers.dense({ units: 32,  activation: 'relu', name: 'hidden4' }));
  m.add(tf.layers.dense({ units: 10,  activation: 'softmax', name: 'output' }));

  m.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy']
  });

  console.log('Loading 6000 training samples…');
  const set = mnist.set(6000, 1000);
  const xs    = tf.tensor2d(set.training.map((d: any) => d.input));
  const ys    = tf.tensor2d(set.training.map((d: any) => d.output));
  const valXs = tf.tensor2d(set.test.map((d: any) => d.input));
  const valYs = tf.tensor2d(set.test.map((d: any) => d.output));

  await m.fit(xs, ys, {
    epochs: 8,
    batchSize: 64,
    validationData: [valXs, valYs],
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        console.log(`Epoch ${epoch + 1}/8: loss=${logs?.loss?.toFixed(4)} val_acc=${logs?.val_acc?.toFixed(4)}`);
      }
    }
  });

  xs.dispose(); ys.dispose(); valXs.dispose(); valYs.dispose();

  console.log(`Saving model to ${MODEL_DIR}…`);
  await m.save({
    save: async (artifacts) => {
      if (!fs.existsSync(MODEL_DIR)) fs.mkdirSync(MODEL_DIR, { recursive: true });
      const modelJson = {
        modelTopology: artifacts.modelTopology,
        weightSpecs: artifacts.weightSpecs,
        format: 'layers-model',
        generatedBy: 'TensorFlow.js Node API'
      };
      fs.writeFileSync(path.join(MODEL_DIR, 'model.json'), JSON.stringify(modelJson, null, 2));
      if (artifacts.weightData) {
        fs.writeFileSync(path.join(MODEL_DIR, 'weights.bin'),
          Buffer.from(new Uint8Array(artifacts.weightData as any)));
      }
      return { modelArtifactsInfo: { dateSaved: new Date(), modelTopologyType: 'JSON' } };
    }
  });

  return m;
}

export async function getOrInitializeModel(): Promise<void> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    if (model) return;

    if (doesCacheExist()) {
      console.log(`Loading cached model from ${MODEL_DIR}…`);
      try {
        model = await tf.loadLayersModel({
          load: async () => {
            const modelJsonStr = fs.readFileSync(path.join(MODEL_DIR, 'model.json'), 'utf8');
            const modelJson    = JSON.parse(modelJsonStr);
            const weightBuffer = fs.readFileSync(path.join(MODEL_DIR, 'weights.bin'));
            return {
              modelTopology: modelJson.modelTopology,
              weightSpecs:   modelJson.weightSpecs,
              weightData:    weightBuffer.buffer.slice(
                weightBuffer.byteOffset,
                weightBuffer.byteOffset + weightBuffer.byteLength
              )
            };
          }
        });
        console.log('Model loaded successfully.');
      } catch (err) {
        console.error('Cache load failed, retraining:', err);
        model = await trainModel();
      }
    } else {
      model = await trainModel();
    }

    if (model) {
      const inp = model.inputs[0];
      h1Model = tf.model({ inputs: inp, outputs: model.getLayer('hidden1').output as tf.SymbolicTensor });
      h2Model = tf.model({ inputs: inp, outputs: model.getLayer('hidden2').output as tf.SymbolicTensor });
      h3Model = tf.model({ inputs: inp, outputs: model.getLayer('hidden3').output as tf.SymbolicTensor });
      h4Model = tf.model({ inputs: inp, outputs: model.getLayer('hidden4').output as tf.SymbolicTensor });
    }
  })();

  return initPromise;
}

export interface InferenceResult {
  prediction: number;
  confidence: number;
  confidences: number[];
  layerActivations: {
    input:   number[];
    hidden1: number[];
    hidden2: number[];
    hidden3: number[];
    hidden4: number[];
    output:  number[];
  };
  processingTime: number;
}

export async function runInference(pixels: number[]): Promise<InferenceResult> {
  const startTime = Date.now();
  await getOrInitializeModel();

  if (!model || !h1Model || !h2Model || !h3Model || !h4Model) {
    throw new Error('Model not initialised');
  }

  return tf.tidy(() => {
    const inputTensor = tf.tensor2d([pixels], [1, 784]);

    const h1Act  = h1Model!.predict(inputTensor) as tf.Tensor;
    const h2Act  = h2Model!.predict(inputTensor) as tf.Tensor;
    const h3Act  = h3Model!.predict(inputTensor) as tf.Tensor;
    const h4Act  = h4Model!.predict(inputTensor) as tf.Tensor;
    const outAct = model!.predict(inputTensor)   as tf.Tensor;

    const h1Vals  = Array.from(h1Act.dataSync());
    const h2Vals  = Array.from(h2Act.dataSync());
    const h3Vals  = Array.from(h3Act.dataSync());
    const h4Vals  = Array.from(h4Act.dataSync());
    const outVals = Array.from(outAct.dataSync());

    const prediction = outAct.argMax(1).dataSync()[0];
    const confidence = outVals[prediction];

    return {
      prediction,
      confidence,
      confidences: outVals,
      layerActivations: {
        input:   pixels,
        hidden1: h1Vals,
        hidden2: h2Vals,
        hidden3: h3Vals,
        hidden4: h4Vals,
        output:  outVals
      },
      processingTime: Date.now() - startTime
    };
  });
}
