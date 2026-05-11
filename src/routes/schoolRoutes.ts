import { Router, Request, Response } from "express";
import pool from "../db.js";
import { ResultSetHeader, RowDataPacket } from "mysql2";

const router = Router();

interface SchoolRow extends RowDataPacket {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

interface AddSchoolBody {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; 
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

router.post("/addSchool", async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, address, latitude, longitude } = req.body as AddSchoolBody;

    const errors: string[] = [];

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      errors.push("'name' is required and must not be a empty string.");
    }

    if (!address || typeof address !== "string" || address.trim().length === 0) {
      errors.push("'address' is required and must not be a empty string.");
    }

    if (latitude === undefined || typeof latitude !== "number" || isNaN(latitude)) {
      errors.push("'latitude' is required and must be a valid number");
    } else if (latitude < -90 || latitude > 90) {
      errors.push("'latitude' must be between -90 and 90.");
    }

    if (longitude === undefined || typeof longitude !== "number" || isNaN(longitude)) {
      errors.push("'longitude' is required and must be a valid number");
    } else if (longitude < -180 || longitude > 180) {
      errors.push("'longitude' must be between -180 and 180");
    }

    if (errors.length > 0) {
      res.status(400).json({ success: false, errors });
      return;
    }

    const [result] = await pool.execute<ResultSetHeader>(
      "INSERT INTO schools (name, address, latitude, longitude) VALUES (?, ?, ?, ?)",
      [name.trim(), address.trim(), latitude, longitude],
    );

    res.status(201).json({
      success: true,
      message: "School added successfully.",
      data: { id: result.insertId, name: name.trim(), address: address.trim(), latitude, longitude },
    });
  } catch (error) {
    console.error("Error adding school:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});

router.get("/listSchools", async (req: Request, res: Response): Promise<void> => {
  try {
    const lat = parseFloat(req.query.latitude as string);
    const lon = parseFloat(req.query.longitude as string);

    if (isNaN(lat) || isNaN(lon)) {
      res.status(400).json({
        success: false,
        message: "'latitude' and 'longitude'  are required and must be valid numbers",
      });
      return;
    }

    if (lat < -90 || lat > 90) {
      res.status(400).json({ success: false, message: "'latitude' must be between -90 and 90." });
      return;
    }

    if (lon < -180 || lon > 180) {
      res.status(400).json({ success: false, message: "'longitude' must be between -180 and 180." });
      return;
    }

    const [rows] = await pool.execute<SchoolRow[]>("SELECT * FROM schools");

    const schoolsWithDistance = rows.map((school) => ({
      id: school.id,
      name: school.name,
      address: school.address,
      latitude: school.latitude,
      longitude: school.longitude,
      distance_km: parseFloat(
        haversineDistance(lat, lon, school.latitude, school.longitude).toFixed(2),
      ),
    }));

    schoolsWithDistance.sort((a, b) => a.distance_km - b.distance_km);

    res.status(200).json({
      success: true,
      count: schoolsWithDistance.length,
      data: schoolsWithDistance,
    });
  } catch (error) {
    console.error("Error listing schools:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});

export default router;
