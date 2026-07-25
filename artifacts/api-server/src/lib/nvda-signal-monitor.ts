import { getNvdaSignal, type NvdaSignal } from "./nvda-signal";
import { logger } from "./logger";

const SIGNAL_CHECK_INTERVAL_MS = 60_000;
const MIN_SENTINEL_SCORE = 80;

let isChecking = false;
let initialized = false;
let previousQualifiedEntry = false;

async function sendIntelligenceAlert(signal: NvdaSignal): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl) {
    logger.warn("DISCORD_WEBHOOK_URL is not configured");
    return;
  }

  const confirmations =
    signal.reasons.length > 0
      ? signal.reasons.map((reason) => `✅ ${reason}`).join("\n")
      : "No confirmations available.";

  const warnings =
    signal.warnings.length > 0
      ? signal.warnings.map((warning) => `⚠️ ${warning}`).join("\n")
      : "No warnings.";

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username: "NVDA Sentinel",
      embeds: [
        {
          title:
            signal.direction === "call"
              ? "🟢 NVDA CALL ENTRY SIGNAL"
              : "🔴 NVDA PUT ENTRY SIGNAL",
          description:
            `**${signal.direction.toUpperCase()} opportunity detected.**\n` +
            "Review the setup before entering a trade.",
          fields: [
            {
             name: "Direction",
             value: signal.direction.toUpperCase(),
             inline: true,
            },
            {

             name: "Trade Grade",
             value: signal.tradeGrade,
             inline: true,
            },
            {

             name: "Confidence",
             value: `${signal.confidence}%`,
             inline: true,
            },
            {

             name: "Current Price",
             value: `$${signal.currentPrice.toFixed(2)}`,
             inline: true,
            },
            {

             name: "Suggested Entry Zone",
             value:
               `$${signal.entryLow.toFixed(2)} – ` +
               `$${signal.entryHigh.toFixed(2)}`,
             inline: false,
            },
            {

             name: "Suggested Stop Loss",
             value: `$${signal.stopLoss.toFixed(2)}`,
             inline: true,
            },
            {

             name: "Suggested Take Profit",
             value: `$${signal.takeProfit.toFixed(2)}`,
             inline: true,
            },
            {

             name: "Confirmations",
             value: confirmations.slice(0, 1024),
             inline: false,
            },
            {

             name: "Warnings",
             value: warnings.slice(0, 1024),
             inline: false,
            },
          ],

          footer: {
            text: "Signal assistant only — review before trading",
          },
          timestamp: signal.updatedAt,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Discord intelligence alert failed: ${response.status} ${response.statusText}`,
    );
  }
}

async function checkNvdaIntelligence(): Promise<void> {
  if (isChecking) return;

  isChecking = true;

  try {
    const signal = await getNvdaSignal();

    const qualifiedEntry =
      signal.direction !== "neutral" &&
      signal.sentinelScore >= MIN_SENTINEL_SCORE;

    // On server startup, record the current state without sending an old signal.
    if (!initialized) {
      initialized = true;
      previousQualifiedEntry = qualifiedEntry;

      logger.info(
        {
          signal: signal.signal,
          confidence: signal.confidence,
          qualifiedEntry,
        },
        "NVDA intelligence monitor initialized",
      );

      return;
    }

    // Send only when the setup changes from unqualified to qualified.
    if (qualifiedEntry && !previousQualifiedEntry) {
      await sendIntelligenceAlert(signal);

      logger.info(
        {
          signal: signal.signal,
          confidence: signal.confidence,
          currentPrice: signal.currentPrice,
          entryLow: signal.entryLow,
          entryHigh: signal.entryHigh,
          stopLoss: signal.stopLoss,
          takeProfit: signal.takeProfit,
        },
        "NVDA intelligence entry alert sent",
      );
    }

    previousQualifiedEntry = qualifiedEntry;
  } catch (err) {
    logger.error({ err }, "NVDA intelligence monitor check failed");
  } finally {
    isChecking = false;
  }
}

export function startNvdaSignalMonitor(): void {
  void checkNvdaIntelligence();

  setInterval(() => {
    void checkNvdaIntelligence();
  }, SIGNAL_CHECK_INTERVAL_MS);

  logger.info(
    {
      intervalMs: SIGNAL_CHECK_INTERVAL_MS,
      minimumSentinelScore: MIN_SENTINEL_SCORE,
    },
    "NVDA intelligence monitor started",
  );
}
