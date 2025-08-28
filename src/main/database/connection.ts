import 'reflect-metadata'
import { DataSource } from 'typeorm'
import { app } from 'electron'
import path from 'path'
import { Agent, AgentRun, AppSettings, UserProject } from './entities'

class DatabaseManager {
  private dataSource: DataSource | null = null

  async initialize(): Promise<DataSource> {
    if (this.dataSource && this.dataSource.isInitialized) {
      return this.dataSource
    }

    // Get database path in user data directory
    const userDataPath = app.getPath('userData')
    const dbPath = path.join(userDataPath, 'claudiatron.db')

    this.dataSource = new DataSource({
      type: 'better-sqlite3',
      database: dbPath,
      entities: [Agent, AgentRun, AppSettings, UserProject],
      synchronize: true, // Auto-create tables in development
      logging: false, // Set to true for debugging SQL queries
      migrations: [],
      migrationsRun: true
    })

    try {
      await this.dataSource.initialize()
      console.log('Database connection initialized successfully')

      // Run any additional setup if needed
      await this.runPostInitializationSetup()

      return this.dataSource
    } catch (error) {
      console.error('Error during database initialization:', error)
      throw error
    }
  }

  async getDataSource(): Promise<DataSource> {
    if (!this.dataSource || !this.dataSource.isInitialized) {
      return await this.initialize()
    }
    return this.dataSource
  }

  async close(): Promise<void> {
    if (this.dataSource && this.dataSource.isInitialized) {
      await this.dataSource.destroy()
      this.dataSource = null
      console.log('Database connection closed')
    }
  }

  /**
   * Run any post-initialization setup (triggers, indexes, etc.)
   */
  private async runPostInitializationSetup(): Promise<void> {
    if (!this.dataSource) return

    try {
      // Create trigger for auto-updating updated_at in app_settings
      await this.dataSource.query(`
        CREATE TRIGGER IF NOT EXISTS update_app_settings_timestamp 
        AFTER UPDATE ON app_settings 
        FOR EACH ROW
        BEGIN
          UPDATE app_settings SET updated_at = CURRENT_TIMESTAMP WHERE key = NEW.key;
        END
      `)

      console.log('Post-initialization database setup completed')
    } catch (error) {
      console.error('Error during post-initialization setup:', error)
      // Don't throw here, as this is not critical for basic functionality
    }
  }

  /**
   * Get repository for an entity
   */
  async getRepository<T>(entity: new () => T) {
    const dataSource = await this.getDataSource()
    return dataSource.getRepository(entity) as any
  }

  /**
   * Execute raw SQL query (for complex queries)
   */
  async query(sql: string, parameters?: any[]): Promise<any> {
    const dataSource = await this.getDataSource()
    return dataSource.query(sql, parameters)
  }

  /**
   * Start a transaction
   */
  async transaction<T>(operation: (manager: any) => Promise<T>): Promise<T> {
    const dataSource = await this.getDataSource()
    return dataSource.transaction(operation)
  }
}

// Global instance
export const databaseManager = new DatabaseManager()

// Type-safe repository getters
export const getAgentRepository = () => databaseManager.getRepository(Agent)
export const getAgentRunRepository = () => databaseManager.getRepository(AgentRun)
export const getAppSettingsRepository = () => databaseManager.getRepository(AppSettings)
export const getUserProjectRepository = () => databaseManager.getRepository(UserProject)
