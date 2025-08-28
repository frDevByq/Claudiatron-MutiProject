import { ipcMain, dialog } from 'electron'
import { userProjectService, type UserProjectCreateData, type UserProjectUpdateData } from '../database/services/UserProjectService'
import { encodeProjectPath } from './claude'
import { promises as fs } from 'fs'
import { join } from 'path'

/**
 * User Projects Management IPC handlers
 */
export function setupUserProjectsHandlers() {
  // Get all user projects
  ipcMain.handle('get-user-projects', async () => {
    console.log('Main: get-user-projects called')
    try {
      const projects = await userProjectService.getAllUserProjects()
      console.log('Main: Retrieved', projects.length, 'user projects')

      // Convert to the same format as Claude projects
      return projects.map(project => ({
        id: encodeProjectPath(project.path), // Use encoded path as ID
        name: project.name,
        path: project.path,
        sessions: [], // User projects don't have sessions in the same way
        created_at: Math.floor(project.created_at.getTime() / 1000),
        isUserProject: true,
        databaseId: project.id // Keep the database ID for internal operations
      }))
    } catch (error) {
      console.error('Main: Failed to get user projects:', error)
      throw error
    }
  })

  // Add user project by selecting directory
  ipcMain.handle('add-user-project-by-dialog', async () => {
    console.log('Main: add-user-project-by-dialog called')
    try {
      const result = await dialog.showOpenDialog({
        title: 'Select Project Directory',
        properties: ['openDirectory'],
        buttonLabel: 'Select Project'
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { canceled: true }
      }

      const projectPath = result.filePaths[0]
      
      // Check if project already exists
      const existingProject = await userProjectService.getUserProjectByPath(projectPath)
      if (existingProject) {
        throw new Error('Project already exists in the list')
      }

      // Extract project name from path
      const projectName = projectPath.split(/[/\\]/).pop() || 'Unnamed Project'

      // Check if directory exists and is accessible
      try {
        await fs.access(projectPath)
        const stats = await fs.stat(projectPath)
        if (!stats.isDirectory()) {
          throw new Error('Selected path is not a directory')
        }
      } catch (error) {
        throw new Error('Cannot access the selected directory')
      }

      // Create user project
      const projectData: UserProjectCreateData = {
        name: projectName,
        path: projectPath,
        description: `User project: ${projectName}`
      }

      const project = await userProjectService.createUserProject(projectData)
      console.log('Main: Created user project:', project.id, project.name)

      // Use encoded project path as ID to match Claude Code's format
      const encodedProjectId = encodeProjectPath(project.path)

      return {
        canceled: false,
        project: {
          id: encodedProjectId,
          name: project.name,
          path: project.path,
          sessions: [], // User projects start with no sessions
          created_at: Math.floor(project.created_at.getTime() / 1000),
          isUserProject: true,
          databaseId: project.id // Keep the database ID for internal operations
        }
      }
    } catch (error) {
      console.error('Main: Failed to add user project:', error)
      throw error
    }
  })

  // Add user project by path
  ipcMain.handle('add-user-project', async (_, projectPath: string, projectName?: string) => {
    console.log('Main: add-user-project called with', projectPath, projectName)
    try {
      // Check if project already exists
      const existingProject = await userProjectService.getUserProjectByPath(projectPath)
      if (existingProject) {
        throw new Error('Project already exists in the list')
      }

      // Extract project name from path if not provided
      const name = projectName || projectPath.split(/[/\\]/).pop() || 'Unnamed Project'

      // Check if directory exists and is accessible
      try {
        await fs.access(projectPath)
        const stats = await fs.stat(projectPath)
        if (!stats.isDirectory()) {
          throw new Error('Path is not a directory')
        }
      } catch (error) {
        throw new Error('Cannot access the directory')
      }

      // Create user project
      const projectData: UserProjectCreateData = {
        name,
        path: projectPath,
        description: `User project: ${name}`
      }

      const project = await userProjectService.createUserProject(projectData)
      console.log('Main: Created user project:', project.id, project.name)

      // Use encoded project path as ID to match Claude Code's format
      const encodedProjectId = encodeProjectPath(project.path)

      return {
        id: encodedProjectId,
        name: project.name,
        path: project.path,
        sessions: [], // User projects start with no sessions
        created_at: Math.floor(project.created_at.getTime() / 1000),
        isUserProject: true,
        databaseId: project.id // Keep the database ID for internal operations
      }
    } catch (error) {
      console.error('Main: Failed to add user project:', error)
      throw error
    }
  })

  // Update user project
  ipcMain.handle('update-user-project', async (_, data: UserProjectUpdateData) => {
    console.log('Main: update-user-project called with', data)
    try {
      const project = await userProjectService.updateUserProject(data)
      console.log('Main: Updated user project:', project.id, project.name)
      return project
    } catch (error) {
      console.error('Main: Failed to update user project:', error)
      throw error
    }
  })

  // Remove user project
  ipcMain.handle('remove-user-project', async (_, projectId: number) => {
    console.log('Main: remove-user-project called with', projectId)
    try {
      await userProjectService.deleteUserProject(projectId)
      console.log('Main: Removed user project:', projectId)
      return { success: true }
    } catch (error) {
      console.error('Main: Failed to remove user project:', error)
      throw error
    }
  })

  // Create new Claude session for user project
  ipcMain.handle('create-user-project-session', async (_, projectPath: string) => {
    console.log('Main: create-user-project-session called with', projectPath)
    try {
      // This will create a new Claude Code session in the specified project directory
      // We'll use the existing Claude Code session creation logic
      const { v4: uuidv4 } = await import('uuid')
      const sessionId = uuidv4()
      
      // For user projects, we don't create actual .claude/projects structure
      // Instead, we'll start a Claude Code session directly in the project directory
      return {
        sessionId,
        projectPath,
        message: 'Session created for user project'
      }
    } catch (error) {
      console.error('Main: Failed to create user project session:', error)
      throw error
    }
  })
}
