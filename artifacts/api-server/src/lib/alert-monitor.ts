import { eq } from "drizzle-orm";
import { db, alertsTable } from "@workspace/db";
import { yf as yahooFinance } from "./yahoo";
import { logger } from "./logger";

const CHECK_INTERVAL_MS = 30_000;

let isChecking = false;

async function sendDiscordAlert(params: {
  symbol: string;
  purpose: "entry" | "take_profit" | "stop_loss";
  condition: "above" | "below";
  targetPrice: number;
  currentPrice: number;
}): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl) {
    logger.warn("DISCORD_WEBHOOK_URL is not configured");
    return;
  }

  const purposeLabels = {
    entry: "🟢 ENTRY ALERT",
    take_profit: "🎯 TAKE PROFIT ALERT",
    stop_loss: "🛑 STOP LOSS ALERT",
  } as const;

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username: "NVDA Sentinel",
      embeds: [
        {
          title: purposeLabels[params.purpose],
          description: `**${params.symbol}** has reached its alert level.`,
          fields: [
            {
              name: "Current Price",
              value: `$${params.currentPrice.toFixed(2)}`,
              inline: true,
            },
            {
              name: "Target Price",
              value: `$${params.targetPrice.toFixed(2)}`,
              inline: true,
            },
            {
              name: "Condition",
              value:
                params.condition === "above"
                  ? "Above or equal"
                  : "Below or equal",
              inline: true,
            },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Discord webhook failed: ${response.status} ${response.statusText}`,
    );
  }
}

async function checkAlerts(): Promise<void> {
  if (isChecking) return;

  isChecking = true;

  try {
    const activeAlerts = await db
      .select()
      .from(alertsTable)
      .where(eq(alertsTable.isActive, true));

    if (activeAlerts.length === 0) return;

    const symbols = [...new Set(activeAlerts.map((alert) => alert.symbol))];

    const quotes = await Promise.allSettled(
      symbols.map((symbol) => yahooFinance.quote(symbol)),
    );

    const priceMap = new Map<string, number>();

    quotes.forEach((result, index) => {
      if (result.status !== "fulfilled") return;

      const quote = result.value as any;
      const price = quote?.regularMarketPrice;

      if (typeof price === "number") {
        priceMap.set(symbols[index], price);
      }
    });

    for (const alert of activeAlerts) {
      const currentPrice = priceMap.get(alert.symbol);
      if (currentPrice === undefined) continue;

      const targetPrice = Number(alert.targetPrice);

      const triggered =
        alert.condition === "above"
          ? currentPrice >= targetPrice
          : currentPrice <= targetPrice;

      if (!triggered) continue;

      await db
        .update(alertsTable)
        .set({
          isActive: false,
          triggeredAt: new Date(),
        })
        .where(eq(alertsTable.id, alert.id));

      try {
        await sendDiscordAlert({
          symbol: alert.symbol,
          purpose: alert.purpose,
          condition: alert.condition,
          targetPrice,
          currentPrice,
        });
      } catch (err) {
        logger.error(
          {
            err,
            alertId: alert.id,
            symbol: alert.symbol,
          },
          "Discord notification failed",
        );
      }

      logger.info(
        {
          alertId: alert.id,
          symbol: alert.symbol,
          purpose: alert.purpose,
          condition: alert.condition,
          targetPrice,
          currentPrice,
        },
        "Price alert triggered",
      );
    }
  } catch (err) {
    logger.error({ err }, "Alert monitor check failed");
  } finally {
    isChecking = false;
  }
}

export function startAlertMonitor(): void {
  void checkAlerts();

  setInterval(() => {
    void checkAlerts();
  }, CHECK_INTERVAL_MS);

  logger.info(
    { intervalMs: CHECK_INTERVAL_MS },
    "Alert monitor started",
  );
}
