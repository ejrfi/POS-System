import { db } from "../db";
import { users } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";

export class InitializationService {
  /**
   * Ensures the default admin user exists
   * Creates admin account if no users exist in the system
   */
  static async ensureDefaultAdmin() {
    try {
      const existingUsers = await db.select().from(users).limit(1);

      if (existingUsers.length > 0) {
        // Users already exist, skip
        return { created: false, message: "System already initialized" };
      }

      // No users exist, create default admin
      const hashedPassword = await bcrypt.hash("admin123", 10);

      await db.insert(users).values({
        username: "admin",
        password: hashedPassword,
        fullName: "Administrator",
        role: "admin",
      });

      return {
        created: true,
        message: "Default admin account created successfully",
        credentials: {
          username: "admin",
          password: "admin123",
          note: "Please change this password immediately after login",
        },
      };
    } catch (error) {
      console.error("Error ensuring default admin:", error);
      return { created: false, error: (error as Error).message };
    }
  }

  /**
   * Check if system is fresh (has no users)
   */
  static async isSystemFresh(): Promise<boolean> {
    try {
      const count = await db
        .select({ count: sql<number>`count(*)` })
        .from(users);
      return count[0]?.count === 0;
    } catch (error) {
      console.error("Error checking system status:", error);
      return false;
    }
  }

  /**
   * Get system information
   */
  static async getSystemInfo() {
    try {
      const isFresh = await this.isSystemFresh();
      const userCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(users);

      return {
        appName: "POS System",
        version: process.env.APP_VERSION || "1.0.0",
        author: process.env.APP_AUTHOR || "GJarfy",
        description: process.env.APP_DESCRIPTION || "Sistem POS Desktop Profesional",
        platform: process.platform,
        nodeEnv: process.env.NODE_ENV,
        isFresh: isFresh,
        totalUsers: userCount[0]?.count || 0,
        installDate: new Date().toISOString(),
        lastBackup: null, // Will be fetched from backup service
      };
    } catch (error) {
      console.error("Error getting system info:", error);
      return null;
    }
  }
}
