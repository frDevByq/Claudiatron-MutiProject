import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  Circle,
  FileText,
  Settings,
  ExternalLink,
  BarChart3,
  Network,
  Info,
  Terminal,
  RotateCcw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { ThemeToggle } from './ThemeToggle'
import { api, type ClaudeVersionStatus, toggleDevTools, refreshPage } from '@/lib/api'
import { cn } from '@/lib/utils'
import { ClaudeIcon } from './ClaudeIcon'

interface TopbarProps {
  /**
   * Callback when CLAUDE.md is clicked
   */
  onClaudeClick: () => void
  /**
   * Callback when Settings is clicked
   */
  onSettingsClick: () => void
  /**
   * Callback when Usage Dashboard is clicked
   */
  onUsageClick: () => void
  /**
   * Callback when MCP is clicked
   */
  onMCPClick: () => void
  /**
   * Callback when Info is clicked
   */
  onInfoClick: () => void
  /**
   * Optional className for styling
   */
  className?: string
}

/**
 * Topbar component with status indicator and navigation buttons
 *
 * @example
 * <Topbar
 *   onClaudeClick={() => setView('editor')}
 *   onSettingsClick={() => setView('settings')}
 *   onUsageClick={() => setView('usage-dashboard')}
 *   onMCPClick={() => setView('mcp')}
 * />
 */
export const Topbar: React.FC<TopbarProps> = ({
  onClaudeClick,
  onSettingsClick,
  onUsageClick,
  onMCPClick,
  onInfoClick,
  className
}) => {
  const { t } = useTranslation('ui')
  const [versionStatus, setVersionStatus] = useState<ClaudeVersionStatus | null>(null)
  const [checking, setChecking] = useState(true)
  const [isConsoleOpen, setIsConsoleOpen] = useState(false)

  // Check Claude version on mount
  useEffect(() => {
    checkVersion()
  }, [])

  // Handle console toggle
  const handleConsoleToggle = async () => {
    try {
      const result = await toggleDevTools()
      setIsConsoleOpen(result.isOpen)
    } catch (error) {
      console.error('Failed to toggle console:', error)
    }
  }

  // Handle page refresh
  const handleRefresh = async () => {
    try {
      await refreshPage()
    } catch (error) {
      console.error('Failed to refresh page:', error)
    }
  }

  const checkVersion = async () => {
    try {
      setChecking(true)
      const status = await api.checkClaudeVersion()
      setVersionStatus(status)

      // If Claude is not installed and the error indicates it wasn't found
      if (!status.is_installed && status.output.includes('No such file or directory')) {
        // Emit an event that can be caught by the parent
        window.dispatchEvent(new CustomEvent('claude-not-found'))
      }
    } catch (err) {
      console.error('Failed to check Claude version:', err)
      setVersionStatus({
        is_installed: false,
        output: 'Failed to check version'
      })
    } finally {
      setChecking(false)
    }
  }

  const StatusIndicator = () => {
    if (checking) {
      return (
        <div className="flex items-center space-x-2 text-xs">
          <ClaudeIcon size={16} className="animate-pulse opacity-50" />
          <span className="text-muted-foreground">{t('topbar.status.checking')}</span>
        </div>
      )
    }

    if (!versionStatus) {
      return null
    }

    const statusContent = (
      <Button
        variant="ghost"
        size="sm"
        className="h-auto py-1 px-2 hover:bg-accent"
        onClick={onSettingsClick}
      >
        <div className="flex items-center space-x-2 text-xs">
          {versionStatus.is_installed ? (
            <ClaudeIcon size={16} className="translate-y-[1px]" />
          ) : (
            <Circle className="h-3 w-3 fill-red-500 text-red-500" />
          )}
          <span>
            {versionStatus.is_installed && versionStatus.version
              ? `${t('topbar.status.claudeCode')} v${versionStatus.version}`
              : t('topbar.status.claudeCode')}
          </span>
        </div>
      </Button>
    )

    if (!versionStatus.is_installed) {
      return (
        <Popover>
          <PopoverTrigger asChild>{statusContent}</PopoverTrigger>
          <PopoverContent align="start">
            <div className="space-y-3 max-w-xs">
              <p className="text-sm font-medium">{t('topbar.status.notFound')}</p>
              <div className="rounded-md bg-muted p-3">
                <pre className="text-xs font-mono whitespace-pre-wrap">{versionStatus.output}</pre>
              </div>
              <Button variant="outline" size="sm" className="w-full" onClick={onSettingsClick}>
                {t('topbar.status.selectInstallation')}
              </Button>
              <a
                href="https://www.anthropic.com/claude-code"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-1 text-xs text-primary hover:underline"
              >
                <span>{t('topbar.status.installClaudeCode')}</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </PopoverContent>
        </Popover>
      )
    }

    return statusContent
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'flex items-center justify-between px-4 py-2 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
        'app-region-drag select-none', // Enable window dragging
        className
      )}
    >
      {/* Status Indicator */}
      <div className="app-region-no-drag">
        <StatusIndicator />
      </div>

      {/* Action Buttons */}
      <div className="flex items-center space-x-2 app-region-no-drag">
        <Button variant="ghost" size="sm" onClick={onUsageClick} className="text-xs">
          <BarChart3 className="mr-2 h-3 w-3" />
          {t('topbar.buttons.usageDashboard')}
        </Button>

        <Button variant="ghost" size="sm" onClick={onClaudeClick} className="text-xs">
          <FileText className="mr-2 h-3 w-3" />
          {t('topbar.buttons.claudeMd')}
        </Button>

        <Button variant="ghost" size="sm" onClick={onMCPClick} className="text-xs">
          <Network className="mr-2 h-3 w-3" />
          {t('topbar.buttons.mcp')}
        </Button>

        <Button variant="ghost" size="sm" onClick={onSettingsClick} className="text-xs">
          <Settings className="mr-2 h-3 w-3" />
          {t('topbar.buttons.settings')}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleConsoleToggle}
          className={`text-xs ${isConsoleOpen ? 'bg-accent' : ''}`}
          title={t('topbar.buttons.console')}
        >
          <Terminal className="mr-2 h-3 w-3" />
          {t('topbar.buttons.console')}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          className="text-xs"
          title={t('topbar.buttons.refresh')}
        >
          <RotateCcw className="mr-2 h-3 w-3" />
          {t('topbar.buttons.refresh')}
        </Button>

        <ThemeToggle />

        <Button
          variant="ghost"
          size="icon"
          onClick={onInfoClick}
          className="h-8 w-8"
          title={t('topbar.buttons.about')}
        >
          <Info className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  )
}
