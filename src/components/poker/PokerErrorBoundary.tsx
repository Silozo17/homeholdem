import React, { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  onReconnect?: () => void;
  onLeave?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class PokerErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[PokerErrorBoundary] Render crash:', error, info.componentStack);
  }

  handleReconnect = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReconnect?.();
  };

  handleLeave = () => {
    this.setState({ hasError: false, error: null });
    this.props.onLeave?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 flex flex-col items-center justify-center gap-6 bg-background/95 backdrop-blur-sm" style={{ zIndex: 9999 }}>
          <AlertTriangle className="w-12 h-12 text-destructive animate-pulse" />
          <p className="text-lg font-bold text-foreground">Something went wrong</p>
          <p className="text-sm text-muted-foreground text-center max-w-[280px]">
            The poker table encountered an error. Tap below to reconnect.
          </p>
          <div className="flex gap-3">
            <button
              onClick={this.handleReconnect}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Reconnect
            </button>
            <button
              onClick={this.handleLeave}
              className="px-5 py-2.5 rounded-lg bg-muted text-muted-foreground font-medium text-sm"
            >
              Leave Table
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
