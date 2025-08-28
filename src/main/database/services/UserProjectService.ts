import { Repository } from 'typeorm'
import { UserProject } from '../entities/UserProject'
import { databaseManager } from '../connection'

export interface UserProjectCreateData {
  name: string
  path: string
  description?: string
  is_active?: boolean
}

export interface UserProjectUpdateData extends Partial<UserProjectCreateData> {
  id: number
}

export class UserProjectService {
  private async getRepository(): Promise<Repository<UserProject>> {
    const dataSource = await databaseManager.getDataSource()
    return dataSource.getRepository(UserProject)
  }

  /**
   * Create a new user project
   */
  async createUserProject(data: UserProjectCreateData): Promise<UserProject> {
    const repository = await this.getRepository()

    const userProject = repository.create({
      ...data,
      is_active: data.is_active ?? true
    })

    return await repository.save(userProject)
  }

  /**
   * Get all user projects
   */
  async getAllUserProjects(): Promise<UserProject[]> {
    const repository = await this.getRepository()
    return await repository.find({
      where: { is_active: true },
      order: { created_at: 'DESC' }
    })
  }

  /**
   * Get user project by ID
   */
  async getUserProjectById(id: number): Promise<UserProject | null> {
    const repository = await this.getRepository()
    return await repository.findOne({ where: { id } })
  }

  /**
   * Get user project by path
   */
  async getUserProjectByPath(path: string): Promise<UserProject | null> {
    const repository = await this.getRepository()
    return await repository.findOne({ where: { path } })
  }

  /**
   * Update user project
   */
  async updateUserProject(data: UserProjectUpdateData): Promise<UserProject> {
    const repository = await this.getRepository()
    
    const userProject = await repository.findOne({ where: { id: data.id } })
    if (!userProject) {
      throw new Error(`User project with ID ${data.id} not found`)
    }

    Object.assign(userProject, data)
    return await repository.save(userProject)
  }

  /**
   * Delete user project (soft delete by setting is_active to false)
   */
  async deleteUserProject(id: number): Promise<void> {
    const repository = await this.getRepository()
    
    const userProject = await repository.findOne({ where: { id } })
    if (!userProject) {
      throw new Error(`User project with ID ${id} not found`)
    }

    userProject.is_active = false
    await repository.save(userProject)
  }

  /**
   * Hard delete user project
   */
  async hardDeleteUserProject(id: number): Promise<void> {
    const repository = await this.getRepository()
    await repository.delete(id)
  }

  /**
   * Check if project path already exists
   */
  async projectPathExists(path: string): Promise<boolean> {
    const repository = await this.getRepository()
    const count = await repository.count({ where: { path, is_active: true } })
    return count > 0
  }
}

// Export singleton instance
export const userProjectService = new UserProjectService()
