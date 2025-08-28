import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'

@Entity('app_settings')
export class AppSettings {
  @PrimaryColumn('text')
  key!: string

  @Column('text')
  value!: string

  @CreateDateColumn()
  created_at!: Date

  @UpdateDateColumn()
  updated_at!: Date
}

// UI Layout settings keys
export const UI_SETTINGS_KEYS = {
  LEFT_PANEL_COLLAPSED: 'ui.leftPanel.collapsed',
  RIGHT_PANEL_COLLAPSED: 'ui.rightPanel.collapsed',
  LEFT_PANEL_WIDTH: 'ui.leftPanel.width',
  RIGHT_PANEL_WIDTH: 'ui.rightPanel.width',
  CURRENT_PROJECT_ID: 'ui.currentProject.id',
  CURRENT_SESSION_ID: 'ui.currentSession.id',
  PROJECT_SEARCH_HISTORY: 'ui.projectSearch.history',
  CLAUDE_PROJECTS_COLLAPSED: 'ui.claudeProjects.collapsed'
} as const
