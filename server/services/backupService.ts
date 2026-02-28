import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export class BackupService {
  private static readonly BACKUP_DIR =
    process.env.BACKUP_DIR || "./backups";
  private static readonly RETENTION_DAYS =
    parseInt(process.env.BACKUP_RETENTION_DAYS || "30", 10);

  /**
   * Initialize backup directory
   */
  static async initializeBackupDir() {
    try {
      if (!fs.existsSync(this.BACKUP_DIR)) {
        fs.mkdirSync(this.BACKUP_DIR, { recursive: true });
      }
      return true;
    } catch (error) {
      console.error("Error initializing backup directory:", error);
      return false;
    }
  }

  /**
   * Create a database backup
   */
  static async createBackup(): Promise<{
    success: boolean;
    message: string;
    backupFile?: string;
    timestamp?: string;
  }> {
    try {
      await this.initializeBackupDir();

      const databaseUrl =
        process.env.DATABASE_URL || "mysql://root:@localhost:3306/pos_system";
      const dbName = new URL(databaseUrl).pathname.slice(1) || "pos_system";

      // Parse connection string
      const url = new URL(databaseUrl);
      const user = url.username || "root";
      const password = url.password;
      const host = url.hostname || "localhost";
      const port = url.port || "3306";

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupFileName = `backup_${dbName}_${timestamp}.sql`;
      const backupFilePath = path.join(this.BACKUP_DIR, backupFileName);

      // Use mysqldump to create backup
      let command = `mysqldump -h ${host} -u ${user}`;
      if (password) {
        command += ` -p${password}`;
      }
      command += ` -P ${port} ${dbName} > "${backupFilePath}"`;

      await execAsync(command, { shell: true });

      // Verify backup file was created
      if (fs.existsSync(backupFilePath)) {
        const fileSize = fs.statSync(backupFilePath).size;
        return {
          success: true,
          message: `Backup created successfully (${(fileSize / 1024 / 1024).toFixed(2)} MB)`,
          backupFile: backupFileName,
          timestamp: new Date().toISOString(),
        };
      } else {
        return {
          success: false,
          message: "Backup file was not created",
        };
      }
    } catch (error) {
      console.error("Backup creation error:", error);
      return {
        success: false,
        message: `Backup failed: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Restore database from backup
   */
  static async restoreBackup(backupFileName: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const backupFilePath = path.join(this.BACKUP_DIR, backupFileName);

      // Verify backup file exists
      if (!fs.existsSync(backupFilePath)) {
        return {
          success: false,
          message: `Backup file not found: ${backupFileName}`,
        };
      }

      const databaseUrl =
        process.env.DATABASE_URL || "mysql://root:@localhost:3306/pos_system";
      const dbName = new URL(databaseUrl).pathname.slice(1) || "pos_system";

      // Parse connection string
      const url = new URL(databaseUrl);
      const user = url.username || "root";
      const password = url.password;
      const host = url.hostname || "localhost";
      const port = url.port || "3306";

      // Use mysql to restore backup
      let command = `mysql -h ${host} -u ${user}`;
      if (password) {
        command += ` -p${password}`;
      }
      command += ` -P ${port} ${dbName} < "${backupFilePath}"`;

      await execAsync(command, { shell: true });

      return {
        success: true,
        message: `Database restored successfully from ${backupFileName}`,
      };
    } catch (error) {
      console.error("Backup restoration error:", error);
      return {
        success: false,
        message: `Restore failed: ${(error as Error).message}`,
      };
    }
  }

  /**
   * List all available backups
   */
  static async listBackups(): Promise<
    Array<{
      fileName: string;
      createdAt: Date;
      sizeInMB: number;
    }>
  > {
    try {
      await this.initializeBackupDir();

      const files = fs.readdirSync(this.BACKUP_DIR);
      const backups = files
        .filter((file) => file.endsWith(".sql"))
        .map((file) => {
          const filePath = path.join(this.BACKUP_DIR, file);
          const stats = fs.statSync(filePath);
          return {
            fileName: file,
            createdAt: stats.birthtime,
            sizeInMB: stats.size / 1024 / 1024,
          };
        })
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      return backups;
    } catch (error) {
      console.error("Error listing backups:", error);
      return [];
    }
  }

  /**
   * Get the latest backup info
   */
  static async getLatestBackupInfo(): Promise<{
    fileName: string;
    createdAt: string;
    sizeInMB: number;
  } | null> {
    try {
      const backups = await this.listBackups();
      if (backups.length === 0) {
        return null;
      }
      return {
        fileName: backups[0].fileName,
        createdAt: backups[0].createdAt.toISOString(),
        sizeInMB: backups[0].sizeInMB,
      };
    } catch (error) {
      console.error("Error getting latest backup:", error);
      return null;
    }
  }

  /**
   * Delete old backups based on retention policy
   */
  static async cleanupOldBackups() {
    try {
      const backups = await this.listBackups();
      const now = new Date();
      const retentionMs = this.RETENTION_DAYS * 24 * 60 * 60 * 1000;

      for (const backup of backups) {
        const age = now.getTime() - backup.createdAt.getTime();
        if (age > retentionMs) {
          const filePath = path.join(this.BACKUP_DIR, backup.fileName);
          fs.unlinkSync(filePath);
          console.log(`Deleted old backup: ${backup.fileName}`);
        }
      }
    } catch (error) {
      console.error("Error cleaning up old backups:", error);
    }
  }
}
