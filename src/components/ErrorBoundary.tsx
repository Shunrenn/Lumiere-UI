import React, { Component, type ReactNode } from 'react'
import { ErrorFallback } from './ErrorFallback'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[ErrorBoundary] Uncaught rendering error:', error, errorInfo)
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }
      return (
        <ErrorFallback
          title="Component Render Error"
          message={this.state.error?.message || 'An unexpected error occurred while rendering this component.'}
          onRetry={() => {
            this.setState({ hasError: false, error: null })
          }}
        />
      )
    }

    return this.props.children
  }
}
