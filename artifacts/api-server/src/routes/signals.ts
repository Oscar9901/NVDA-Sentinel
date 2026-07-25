import { Router, type IRouter } from "express";
import { getNvdaSignal } from "../lib/nvda-signal";

const router: IRouter = Router();

// GET /signals/nvda
router.get("/signals/nvda", async (req, res): Promise<void> => {
  try {
    const signal = await getNvdaSignal();
    res.json(signal);
  } catch (err) {
    req.log.error({ err }, "NVDA signal generation failed");
    res.status(500).json({
      error: "Failed to generate NVDA signal",
    });
  }
});

export default router;
