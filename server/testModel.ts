import { getOrInitializeModel, runInference } from './models/mnistModel';

async function test() {
  console.log('--- Starting Backend Neural Network test ---');
  try {
    console.log('1. Initializing model...');
    await getOrInitializeModel();
    console.log('Initialization complete.');

    console.log('2. Running mock inference on empty grid (784 zeros)...');
    const mockPixels = new Array(784).fill(0);
    // Draw a small 1 inside the mock pixels (middle vertical line)
    for (let r = 5; r < 23; r++) {
      mockPixels[r * 28 + 14] = 1.0;
      mockPixels[r * 28 + 13] = 0.5; // slight blur
    }

    const result = await runInference(mockPixels);
    console.log('Inference complete! Results:');
    console.log(`- Predicted Digit: ${result.prediction}`);
    console.log(`- Confidence Score: ${(result.confidence * 100).toFixed(2)}%`);
    console.log(`- Processing Time: ${result.processingTime}ms`);
    console.log(`- Input Activation count (non-zero): ${result.layerActivations.input.filter(v => v > 0).length}`);
    console.log(`- Hidden 1 Activation count (non-zero): ${result.layerActivations.hidden1.filter(v => v > 0).length}`);
    console.log(`- Hidden 2 Activation count (non-zero): ${result.layerActivations.hidden2.filter(v => v > 0).length}`);
    console.log(`- Output Probabilities:`, result.layerActivations.output.map((v, i) => `${i}: ${(v * 100).toFixed(1)}%`).join(' | '));

    console.log('--- Test PASSED successfully! ---');
  } catch (error) {
    console.error('--- Test FAILED with error: ---', error);
  }
}

test();
