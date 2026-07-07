import React, { Component, ComponentType, PropsWithChildren } from "react";
import { Platform } from "react-native";

import { ErrorFallback, ErrorFallbackProps } from "@/components/ErrorFallback";

export type ErrorBoundaryProps = PropsWithChildren<{
  FallbackComponent?: ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, stackTrace: string) => void;
}>;

type ErrorBoundaryState = { error: Error | null; componentStack?: string };

/**
 * React Native Web (dev, JS/non-native-driver style writes) occasionally
 * throws this exact benign, transient DOM error during a commit -
 * "Failed to set an indexed property [0] on 'CSSStyleDeclaration'" - even
 * after removing every JS-driven Animated navigator (Stack/Tabs) we could
 * find in this app. It does not indicate corrupted state or bad data: a
 * simple re-render recovers cleanly. On web only, and only for this specific
 * signature, auto-recover instead of showing the "Something went wrong"
 * screen. Everything else still surfaces the normal fallback UI. A short
 * cooldown + attempt cap prevents an infinite retry loop if the error is
 * ever persistent rather than transient.
 */
const AUTO_RECOVER_PATTERN = /indexed property .* on ['"]?CSSStyleDeclaration['"]?/i;
const AUTO_RECOVER_MAX_ATTEMPTS = 3;
const AUTO_RECOVER_COOLDOWN_MS = 50;

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };
  private autoRecoverAttempts = 0;
  private autoRecoverTimer: ReturnType<typeof setTimeout> | null = null;

  static defaultProps: {
    FallbackComponent: ComponentType<ErrorFallbackProps>;
  } = {
    FallbackComponent: ErrorFallback,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }): void {
    this.setState({ componentStack: info.componentStack });
    if (typeof this.props.onError === "function") {
      this.props.onError(error, info.componentStack);
    }

    if (
      Platform.OS === "web" &&
      AUTO_RECOVER_PATTERN.test(error.message ?? "") &&
      this.autoRecoverAttempts < AUTO_RECOVER_MAX_ATTEMPTS
    ) {
      this.autoRecoverAttempts += 1;
      this.autoRecoverTimer = setTimeout(() => {
        this.setState({ error: null });
      }, AUTO_RECOVER_COOLDOWN_MS);
    }
  }

  componentWillUnmount(): void {
    if (this.autoRecoverTimer) {
      clearTimeout(this.autoRecoverTimer);
    }
  }

  resetError = (): void => {
    this.setState({ error: null });
  };

  render() {
    const { FallbackComponent } = this.props;

    if (
      this.state.error &&
      Platform.OS === "web" &&
      AUTO_RECOVER_PATTERN.test(this.state.error.message ?? "") &&
      this.autoRecoverAttempts <= AUTO_RECOVER_MAX_ATTEMPTS
    ) {
      return this.props.children;
    }

    return this.state.error && FallbackComponent ? (
      <FallbackComponent
        error={this.state.error}
        resetError={this.resetError}
        componentStack={this.state.componentStack}
      />
    ) : (
      this.props.children
    );
  }
}
