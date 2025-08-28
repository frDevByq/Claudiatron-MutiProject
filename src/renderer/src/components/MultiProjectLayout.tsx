import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  ChevronLeft,
  ChevronRight,
  Search,
  FolderOpen,
  History,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Plus,
  MessageSquare,
  Trash2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { api, type Project, type Session } from '@/lib/api'
import { ClaudeCodeSession } from './ClaudeCodeSession'

interface MultiProjectLayoutProps {
  onBack: () => void
  className?: string
}

interface UIState {
  leftPanelCollapsed: boolean
  rightPanelCollapsed: boolean
  leftPanelWidth: number
  rightPanelWidth: number
  claudeProjectsCollapsed: boolean
}

const DEFAULT_UI_STATE: UIState = {
  leftPanelCollapsed: false,
  rightPanelCollapsed: false,
  leftPanelWidth: 300,
  rightPanelWidth: 300,
  claudeProjectsCollapsed: true
}

export const MultiProjectLayout: React.FC<MultiProjectLayoutProps> = ({
  onBack,
  className
}) => {
  const { t } = useTranslation('ui')
  
  // UI State
  const [uiState, setUIState] = useState<UIState>(DEFAULT_UI_STATE)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Data State
  const [projects, setProjects] = useState<Project[]>([])
  const [userProjects, setUserProjects] = useState<Project[]>([])
  const [claudeProjects, setClaudeProjects] = useState<Project[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  
  // Current Selection
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [currentSession, setCurrentSession] = useState<Session | null>(null)

  // Load UI state from settings
  const loadUIState = useCallback(async () => {
    try {
      const settings = await api.getSettings([
        'ui.leftPanel.collapsed',
        'ui.rightPanel.collapsed', 
        'ui.leftPanel.width',
        'ui.rightPanel.width',
        'ui.claudeProjects.collapsed',
        'ui.currentProject.id',
        'ui.currentSession.id'
      ])
      
      const newUIState: UIState = {
        leftPanelCollapsed: settings['ui.leftPanel.collapsed'] === 'true',
        rightPanelCollapsed: settings['ui.rightPanel.collapsed'] === 'true',
        leftPanelWidth: parseInt(settings['ui.leftPanel.width']) || DEFAULT_UI_STATE.leftPanelWidth,
        rightPanelWidth: parseInt(settings['ui.rightPanel.width']) || DEFAULT_UI_STATE.rightPanelWidth,
        claudeProjectsCollapsed: settings['ui.claudeProjects.collapsed'] !== 'false'
      }
      
      setUIState(newUIState)
      
      // Restore current project and session
      const currentProjectId = settings['ui.currentProject.id']
      const currentSessionId = settings['ui.currentSession.id']
      
      if (currentProjectId) {
        // Will be set after projects are loaded
      }
      
    } catch (error) {
      console.error('Failed to load UI state:', error)
    }
  }, [])

  // Save UI state to settings
  const saveUIState = useCallback(async (newState: Partial<UIState>) => {
    try {
      const settingsToSave: Record<string, string> = {}
      
      if (newState.leftPanelCollapsed !== undefined) {
        settingsToSave['ui.leftPanel.collapsed'] = newState.leftPanelCollapsed.toString()
      }
      if (newState.rightPanelCollapsed !== undefined) {
        settingsToSave['ui.rightPanel.collapsed'] = newState.rightPanelCollapsed.toString()
      }
      if (newState.leftPanelWidth !== undefined) {
        settingsToSave['ui.leftPanel.width'] = newState.leftPanelWidth.toString()
      }
      if (newState.rightPanelWidth !== undefined) {
        settingsToSave['ui.rightPanel.width'] = newState.rightPanelWidth.toString()
      }
      if (newState.claudeProjectsCollapsed !== undefined) {
        settingsToSave['ui.claudeProjects.collapsed'] = newState.claudeProjectsCollapsed.toString()
      }
      
      await api.setSettings(settingsToSave)
    } catch (error) {
      console.error('Failed to save UI state:', error)
    }
  }, [])

  // Load projects
  const loadProjects = useCallback(async () => {
    try {
      setLoading(true)

      // Load Claude projects (from ~/.claude/projects)
      const claudeProjects = await api.listProjects()

      // Load user projects (from database)
      const userProjectsData = await api.getUserProjects()

      // User projects are already in the correct format from the API
      const userProjects = userProjectsData

      const allProjects = [...userProjects, ...claudeProjects]

      setProjects(allProjects)
      setUserProjects(userProjects)
      setClaudeProjects(claudeProjects)

    } catch (error) {
      console.error('Failed to load projects:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Load sessions for current project
  const loadSessions = useCallback(async (project: Project) => {
    try {
      const projectSessions = await api.getProjectSessions(project.id)
      setSessions(projectSessions)
    } catch (error) {
      console.error('Failed to load sessions:', error)
      setSessions([])
    }
  }, [])

  // Handle project selection
  const handleProjectSelect = useCallback(async (project: Project) => {
    setCurrentProject(project)
    setCurrentSession(null)
    await loadSessions(project)
    
    // Save current project
    try {
      await api.setSetting('ui.currentProject.id', project.id)
    } catch (error) {
      console.error('Failed to save current project:', error)
    }
  }, [loadSessions])

  // Handle session selection
  const handleSessionSelect = useCallback(async (session: Session) => {
    setCurrentSession(session)
    
    // Save current session
    try {
      await api.setSetting('ui.currentSession.id', session.id)
    } catch (error) {
      console.error('Failed to save current session:', error)
    }
  }, [])

  // Toggle panel collapse
  const toggleLeftPanel = useCallback(() => {
    const newState = { leftPanelCollapsed: !uiState.leftPanelCollapsed }
    setUIState(prev => ({ ...prev, ...newState }))
    saveUIState(newState)
  }, [uiState.leftPanelCollapsed, saveUIState])

  const toggleRightPanel = useCallback(() => {
    const newState = { rightPanelCollapsed: !uiState.rightPanelCollapsed }
    setUIState(prev => ({ ...prev, ...newState }))
    saveUIState(newState)
  }, [uiState.rightPanelCollapsed, saveUIState])

  const toggleClaudeProjects = useCallback(() => {
    const newState = { claudeProjectsCollapsed: !uiState.claudeProjectsCollapsed }
    setUIState(prev => ({ ...prev, ...newState }))
    saveUIState(newState)
  }, [uiState.claudeProjectsCollapsed, saveUIState])

  // Add user project
  const handleAddUserProject = useCallback(async () => {
    try {
      const result = await api.addUserProjectByDialog()
      if (!result.canceled && result.project) {
        // Reload projects to include the new one
        await loadProjects()
      }
    } catch (error) {
      console.error('Failed to add user project:', error)
      // TODO: Show error toast
    }
  }, [loadProjects])

  // Remove user project
  const handleRemoveUserProject = useCallback(async (project: Project) => {
    try {
      const confirmed = window.confirm('Are you sure you want to remove this project from the list?')
      if (confirmed) {
        // Find the database ID from the project object
        const databaseId = (project as any).databaseId
        if (databaseId) {
          await api.removeUserProject(databaseId)
          await loadProjects()
        } else {
          console.error('No database ID found for user project:', project)
        }
      }
    } catch (error) {
      console.error('Failed to remove user project:', error)
      // TODO: Show error toast
    }
  }, [loadProjects])

  // Create new session for project
  const handleCreateSession = useCallback(async (project: Project) => {
    try {
      if (project.isUserProject) {
        // For user projects, create a new Claude Code session
        const result = await api.createUserProjectSession(project.path)
        console.log('Created session for user project:', result)
        // TODO: Navigate to the new session
      } else {
        // For Claude projects, use existing logic
        // TODO: Implement Claude project session creation
      }
    } catch (error) {
      console.error('Failed to create session:', error)
      // TODO: Show error toast
    }
  }, [])

  // Create new session for current project
  const handleCreateNewSession = useCallback(async () => {
    if (!currentProject) return

    try {
      // Create a temporary session object for immediate UI feedback
      // Use a clearly non-UUID format to avoid confusion with real session IDs
      const tempSessionId = `new-session-${Date.now()}`
      const tempSession: Session = {
        id: tempSessionId,
        project_id: currentProject.id,
        project_path: currentProject.path,
        created_at: Math.floor(Date.now() / 1000),
        isTemporary: true, // Mark as temporary until Claude returns a real session ID
        first_message: undefined // No first message yet
      }

      // Set as current session immediately for better UX
      setCurrentSession(tempSession)

      // For user projects, we'll start a Claude Code session directly
      if (currentProject.isUserProject) {
        console.log('Starting new session for user project:', currentProject.path)
        // The actual session creation will happen when user sends first message
        // ClaudeCodeSession will treat this as a new session since session prop is undefined
      } else {
        // For Claude projects, we can create a session in the .claude/projects structure
        console.log('Starting new session for Claude project:', currentProject.path)
        // The actual session creation will happen when user sends first message
        // ClaudeCodeSession will treat this as a new session since session prop is undefined
      }

    } catch (error) {
      console.error('Failed to create new session:', error)
      // TODO: Show error toast
    }
  }, [currentProject])

  // Initialize
  useEffect(() => {
    loadUIState()
    loadProjects()
  }, [loadUIState, loadProjects])

  // Filter projects based on search
  const filteredUserProjects = userProjects.filter(project =>
    project.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredClaudeProjects = claudeProjects.filter(project =>
    project.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className={cn('flex h-full bg-background flex-col', className)}>
      {/* Header with back button */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('button.backToHome')}
          </Button>
          <h1 className="text-2xl font-bold">{t('multiProject.title')}</h1>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Project List */}
        <motion.div
          initial={false}
          animate={{
            width: uiState.leftPanelCollapsed ? 40 : uiState.leftPanelWidth
          }}
          transition={{ duration: 0.2 }}
          className="border-r border-border flex flex-col bg-muted/30"
        >
          {/* Left Panel Header */}
          <div className="p-2 border-b border-border flex items-center justify-between">
            {!uiState.leftPanelCollapsed && (
              <h2 className="font-semibold text-sm">Projects</h2>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLeftPanel}
              className="h-6 w-6 p-0"
            >
              {uiState.leftPanelCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
            </Button>
          </div>

        {!uiState.leftPanelCollapsed && (
          <>
            {/* Search */}
            <div className="p-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-7 h-7 text-xs"
                />
              </div>
            </div>

            {/* Project Lists */}
            <div className="flex-1 overflow-y-auto">
              {/* User Projects */}
              <div className="p-2">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-medium text-muted-foreground">
                    User Projects
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleAddUserProject}
                    className="h-5 w-5 p-0"
                    title="Add Project"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <div className="space-y-1">
                  {filteredUserProjects.length > 0 ? (
                    filteredUserProjects.map((project) => (
                      <UserProjectItem
                        key={project.id}
                        project={project}
                        isSelected={currentProject?.id === project.id}
                        onClick={() => handleProjectSelect(project)}
                        onRemove={() => handleRemoveUserProject(project)}
                        onCreateSession={() => handleCreateSession(project)}
                      />
                    ))
                  ) : (
                    <div className="text-xs text-muted-foreground text-center py-2">
                      No user projects
                    </div>
                  )}
                </div>
              </div>

              {/* Claude Projects */}
              {filteredClaudeProjects.length > 0 && (
                <div className="p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleClaudeProjects}
                    className="w-full justify-between h-6 px-2 mb-2"
                  >
                    <span className="text-xs font-medium text-muted-foreground">
                      Claude Projects
                    </span>
                    {uiState.claudeProjectsCollapsed ?
                      <ChevronDown className="h-3 w-3" /> :
                      <ChevronUp className="h-3 w-3" />
                    }
                  </Button>

                  <AnimatePresence>
                    {!uiState.claudeProjectsCollapsed && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-1 overflow-hidden"
                      >
                        {filteredClaudeProjects.map((project) => (
                          <ProjectItem
                            key={project.id}
                            project={project}
                            isSelected={currentProject?.id === project.id}
                            onClick={() => handleProjectSelect(project)}
                          />
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </>
        )}
      </motion.div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {currentProject && currentSession ? (
          <ClaudeCodeSession
            key={currentSession.isTemporary ? `temp-${currentProject.id}` : currentSession.id}
            // Don't pass session prop for temporary sessions - treat them as new sessions
            session={currentSession.isTemporary ? undefined : currentSession}
            // Always use projectPath for consistency
            projectPath={currentProject.path}
            onBack={() => setCurrentSession(null)}
            onStreamingChange={() => {}}
            onSessionCreated={(newSessionId) => {
              // When Claude returns a real session ID, add it to the sessions list
              // but don't change the current session to avoid component remounting
              if (currentSession?.isTemporary) {
                console.log('Received real session ID from Claude:', newSessionId)

                // Add to sessions list for future reference
                const newSession: Session = {
                  id: newSessionId,
                  project_id: currentProject.id,
                  project_path: currentProject.path,
                  created_at: Math.floor(Date.now() / 1000),
                  isNewlyCreated: true // Mark as newly created to avoid loading history immediately
                }
                setSessions(prev => [newSession, ...prev.filter(s => s.id !== newSessionId)])

                // Update the current session ID for display purposes, but keep the same key
                setCurrentSession(prev => prev ? {
                  ...prev,
                  id: newSessionId,
                  isNewlyCreated: true // Mark as newly created
                } : null)
              }
            }}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">
                {currentProject
                  ? 'Select a session to view or create a new one'
                  : 'Select a project to start'
                }
              </p>
              {currentProject && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCreateNewSession}
                  className="mt-4"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New Session
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right Panel - Session History */}
      <motion.div
        initial={false}
        animate={{
          width: uiState.rightPanelCollapsed ? 40 : uiState.rightPanelWidth
        }}
        transition={{ duration: 0.2 }}
        className="border-l border-border flex flex-col bg-muted/30"
      >
        {/* Right Panel Header */}
        <div className="p-2 border-b border-border flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleRightPanel}
            className="h-6 w-6 p-0"
          >
            {uiState.rightPanelCollapsed ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </Button>
          {!uiState.rightPanelCollapsed && (
            <div className="flex items-center justify-between flex-1 ml-2">
              <h2 className="font-semibold text-sm">Session History</h2>
              {currentProject && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCreateNewSession()}
                  className="h-5 w-5 p-0"
                  title="New Session"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}
        </div>

        {!uiState.rightPanelCollapsed && (
          <div className="flex-1 overflow-y-auto p-2">
            {currentProject ? (
              (() => {
                // Combine current session (if temporary) with existing sessions
                const allSessions = [...sessions]
                if (currentSession?.isTemporary) {
                  // Add temporary session at the beginning if it's not already in the list
                  const existingIndex = allSessions.findIndex(s => s.id === currentSession.id)
                  if (existingIndex === -1) {
                    allSessions.unshift(currentSession)
                  }
                }

                return allSessions.length > 0 ? (
                  <div className="space-y-1">
                    {allSessions.map((session) => (
                      <SessionItem
                        key={session.id}
                        session={session}
                        isSelected={currentSession?.id === session.id}
                        onClick={() => handleSessionSelect(session)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground text-xs py-4">
                    No sessions found
                    <br />
                    <span className="text-xs">Click + to create a new session</span>
                  </div>
                )
              })()
            ) : (
              <div className="text-center text-muted-foreground text-xs py-4">
                Select a project first
              </div>
            )}
          </div>
        )}
      </motion.div>
      </div>
    </div>
  )
}

// Project Item Component
interface ProjectItemProps {
  project: Project
  isSelected: boolean
  onClick: () => void
}

const ProjectItem: React.FC<ProjectItemProps> = ({ project, isSelected, onClick }) => {
  const projectName = project.path.split('/').pop() || project.id
  
  return (
    <Card
      className={cn(
        'p-2 cursor-pointer transition-all hover:bg-accent/50 text-xs',
        isSelected && 'bg-accent border-primary'
      )}
      onClick={onClick}
    >
      <CardContent className="p-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <FolderOpen className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="truncate font-medium">{projectName}</span>
          </div>
          {project.sessions?.length > 0 && (
            <Badge variant="secondary" className="text-xs h-4 px-1">
              {project.sessions.length}
            </Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground mt-1 truncate font-mono">
          {project.path}
        </div>
      </CardContent>
    </Card>
  )
}

// User Project Item Component
interface UserProjectItemProps {
  project: Project
  isSelected: boolean
  onClick: () => void
  onRemove: () => void
  onCreateSession: () => void
}

const UserProjectItem: React.FC<UserProjectItemProps> = ({
  project,
  isSelected,
  onClick,
  onRemove,
  onCreateSession
}) => {
  const projectName = project.name || project.path.split('/').pop() || project.id

  return (
    <Card
      className={cn(
        'p-2 transition-all hover:bg-accent/50 text-xs group',
        isSelected && 'bg-accent border-primary'
      )}
    >
      <CardContent className="p-0">
        <div className="flex items-center justify-between">
          <div
            className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer"
            onClick={onClick}
          >
            <FolderOpen className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="truncate font-medium">{projectName}</span>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onCreateSession()
              }}
              className="h-5 w-5 p-0"
              title="New Session"
            >
              <MessageSquare className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onRemove()
              }}
              className="h-5 w-5 p-0 text-destructive hover:text-destructive"
              title="Remove Project"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <div className="text-xs text-muted-foreground mt-1 truncate font-mono">
          {project.path}
        </div>
      </CardContent>
    </Card>
  )
}

// Session Item Component
interface SessionItemProps {
  session: Session
  isSelected: boolean
  onClick: () => void
}

const SessionItem: React.FC<SessionItemProps> = ({ session, isSelected, onClick }) => {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString()
  }

  return (
    <Card
      className={cn(
        'p-2 cursor-pointer transition-all hover:bg-accent/50 text-xs',
        isSelected && 'bg-accent border-primary',
        session.isTemporary && 'border-dashed border-orange-300'
      )}
      onClick={onClick}
    >
      <CardContent className="p-0">
        <div className="flex items-center gap-2 mb-1">
          <History className="h-3 w-3 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground">
            {formatDate(session.created_at)}
          </span>
          {session.isTemporary && (
            <Badge variant="outline" className="text-xs h-4 px-1 text-orange-600 border-orange-300">
              New
            </Badge>
          )}
        </div>
        <div className="font-mono text-xs truncate mb-1">
          {session.isTemporary ? 'New Session' : session.id}
        </div>
        {session.first_message ? (
          <div className="text-xs text-muted-foreground line-clamp-2">
            {session.first_message.substring(0, 60)}...
          </div>
        ) : session.isTemporary ? (
          <div className="text-xs text-muted-foreground italic">
            Start typing to begin...
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
