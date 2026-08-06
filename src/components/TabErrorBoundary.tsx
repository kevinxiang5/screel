import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
  label?: string;
  onRetry?: () => void;
};

type State = { error: Error | null };

/** Keeps a single tab from blanking the whole shell when a chunk or render fails. */
export class TabErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[Screel] ${this.props.label ?? 'Tab'} crashed`, error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="screen">
        <div className="eyebrow">Something went wrong</div>
        <h1 className="display md">{this.props.label ?? 'This screen'} couldn’t load</h1>
        <p className="lede">
          A temporary error stopped this view. Your minute data is still on this device. Try again.
        </p>
        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={() => {
            this.setState({ error: null });
            this.props.onRetry?.();
          }}
        >
          Try again
        </button>
      </div>
    );
  }
}
