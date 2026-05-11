import express from "express";
import dotenv from "dotenv";
import { initializeDatabase } from "./db.js";
import schoolRoutes from "./routes/schoolRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/", schoolRoutes);

app.get("/", (_req, res) => {
  res.json({ status: "ok", message: " API is running" });
});

async function startServer() {
  try {
    await initializeDatabase();
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start", error);
  }
}

startServer();
