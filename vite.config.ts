import { defineConfig, loadEnv, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import Razorpay from "razorpay";
import crypto from "crypto";

function razorpayDevApiPlugin(env: Record<string, string>): Plugin {
  return {
    name: "razorpay-dev-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/api/")) {
          return next();
        }

        const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
        const pathname = url.pathname;

        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");

        if (req.method === "OPTIONS") {
          res.statusCode = 200;
          res.end();
          return;
        }

        const readBody = () =>
          new Promise<any>((resolve, reject) => {
            let data = "";
            req.on("data", (chunk: any) => {
              data += chunk;
            });
            req.on("end", () => {
              try {
                resolve(data ? JSON.parse(data) : {});
              } catch (e) {
                reject(e);
              }
            });
            req.on("error", reject);
          });

        const keyId = env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || env.VITE_RAZORPAY_KEY_ID;
        const keySecret = env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET;

        if (pathname === "/api/create-order" && req.method === "POST") {
          try {
            if (!keyId || !keySecret) {
              res.statusCode = 401;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: "Razorpay credentials not configured in environment" }));
              return;
            }

            const body = await readBody();
            const { amount, currency = "INR", receipt, notes } = body;

            if (amount === undefined || amount === null || typeof amount !== "number" || isNaN(amount) || amount < 100) {
              res.statusCode = 400;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: "Invalid amount. Minimum amount is 100 paise (₹1.00)." }));
              return;
            }

            const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
            const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
              method: 'POST',
              headers: {
                Authorization: `Basic ${auth}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                amount: Math.round(amount),
                currency: currency || 'INR',
                receipt: receipt || `rcpt_${Date.now()}`,
                notes: notes || {},
              }),
            });

            const data = await razorpayResponse.json();

            if (!razorpayResponse.ok) {
              res.statusCode = razorpayResponse.status || 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  error: data?.error?.description || data?.error || 'Failed to create order on Razorpay',
                })
              );
              return;
            }

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                order_id: data.id,
                amount: data.amount,
                currency: data.currency,
                receipt: data.receipt,
                key_id: keyId,
              })
            );
          } catch (error: any) {
            console.error("Razorpay order creation error:", error);
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                error: error?.error?.description || error?.message || "Internal server error creating order",
              })
            );
          }
          return;
        }

        if (pathname === "/api/verify-payment" && req.method === "POST") {
          try {
            if (!keySecret) {
              res.statusCode = 401;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: "Razorpay secret not configured in environment" }));
              return;
            }

            const body = await readBody();
            const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

            if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
              res.statusCode = 400;
              res.setHeader("Content-Type", "application/json");
              res.end(
                JSON.stringify({
                  success: false,
                  error: "Missing required fields: razorpay_order_id, razorpay_payment_id, and razorpay_signature are all required.",
                })
              );
              return;
            }

            const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
            const generatedSignature = crypto
              .createHmac("sha256", keySecret)
              .update(payload)
              .digest("hex");

            const isMatch =
              generatedSignature.length === razorpay_signature.length &&
              crypto.timingSafeEqual(
                Buffer.from(generatedSignature, "utf-8"),
                Buffer.from(razorpay_signature, "utf-8")
              );

            if (!isMatch) {
              res.statusCode = 400;
              res.setHeader("Content-Type", "application/json");
              res.end(
                JSON.stringify({
                  success: false,
                  error: "Payment verification failed: Signature mismatch",
                })
              );
              return;
            }

            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                success: true,
                message: "Payment verified successfully",
                razorpay_order_id,
                razorpay_payment_id,
              })
            );
          } catch (error: any) {
            console.error("Razorpay verification error:", error);
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                success: false,
                error: error?.message || "Internal server error verifying payment",
              })
            );
          }
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    server: {
      host: "::",
      port: 8080,
      hmr: { overlay: true },
    },
    plugins: [react(), razorpayDevApiPlugin(env)],
    resolve: {
      alias: { "@": path.resolve(__dirname, "./src") },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    build: {
      target: "es2020",
      minify: "esbuild",
      sourcemap: false,
      chunkSizeWarningLimit: 600,
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            // Source files: group all admin code together
            if (!id.includes("node_modules")) {
              if (
                id.includes("/pages/admin/") ||
                id.includes("/components/admin/")
              )
                return "admin";
              return undefined;
            }

            // npm packages: each key domain as its own cacheable chunk
            if (id.includes("recharts") || id.includes("/d3-"))
              return "charts";
            if (id.includes("framer-motion")) return "animations";
            if (id.includes("@supabase/")) return "supabase";
            if (
              id.includes("@radix-ui/") ||
              id.includes("cmdk") ||
              id.includes("vaul") ||
              id.includes("embla-carousel") ||
              id.includes("input-otp") ||
              id.includes("react-resizable-panels") ||
              id.includes("react-day-picker")
            )
              return "ui";
            if (id.includes("lucide-react")) return "icons";
            if (
              id.includes("react-router-dom") ||
              id.includes("react-router/")
            )
              return "router";
            if (id.includes("@tanstack/")) return "query";
            if (
              id.includes("zustand") ||
              id.includes("zod") ||
              id.includes("react-hook-form") ||
              id.includes("@hookform/")
            )
              return "state";
            if (id.includes("date-fns")) return "datefns";
            return "vendor";
          },
          chunkFileNames: "assets/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash][extname]",
          entryFileNames: "assets/[name]-[hash].js",
        },
      },
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-router-dom",
        "@tanstack/react-query",
        "framer-motion",
        "zustand",
        "@supabase/supabase-js",
      ],
    },
  };
});
