"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallbackMessage: string;
}

interface State {
  hasError: boolean;
}

// Keeps a crash inside one section (e.g. checkout) from unmounting the whole
// page — Header/Footer live outside this boundary in each page, so they stay
// visible even if this section throws.
export class SectionErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Section crashed:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-2xl border border-(--coral-600)/30 bg-(--coral-600)/5 p-6 text-center font-sans text-sm text-(--coral-600)">
          {this.props.fallbackMessage}
        </div>
      );
    }
    return this.props.children;
  }
}
