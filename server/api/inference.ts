import { Router, Request, Response } from 'express';
import { runInference, getOrInitializeModel } from '../models/mnistModel';

const router = Router();

router.post('/inference', async (req: Request, res: Response) => {
  try {
    const { pixels } = req.body;
    if (!pixels || !Array.isArray(pixels))
      return res.status(400).json({ error: 'Pixels array is required' });
    if (pixels.length !== 784)
      return res.status(400).json({ error: `Pixels array must have 784 values, got ${pixels.length}` });

    const normalizedPixels = pixels.map(p => {
      const val = Number(p);
      return isNaN(val) ? 0 : Math.max(0, Math.min(1, val));
    });

    const result = await runInference(normalizedPixels);
    return res.json(result);
  } catch (error: any) {
    console.error('Inference error:', error);
    return res.status(500).json({ error: error.message || 'Inference failed' });
  }
});

// Returns "ready" once model is loaded, "training" while it is being trained
router.get('/model-info', async (_req: Request, res: Response) => {
  try {
    // Try a lightweight check — if model is loaded this resolves instantly
    await getOrInitializeModel();
    return res.json({
      status: 'ready',
      architecture: { input: 784, hidden1: 256, hidden2: 128, hidden3: 64, hidden4: 32, output: 10 }
    });
  } catch {
    return res.json({ status: 'training' });
  }
});

export default router;
