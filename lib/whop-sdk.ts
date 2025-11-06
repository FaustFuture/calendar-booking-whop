import { Whop } from "@whop/sdk";

export const whopsdk = new Whop({
  appID: process.env.NEXT_PUBLIC_WHOP_APP_ID,
  apiKey: process.env.WHOP_API_KEY,
  webhookKey: Buffer.from(process.env.WHOP_WEBHOOK_SECRET || "", "utf-8").toString("base64"),
});
