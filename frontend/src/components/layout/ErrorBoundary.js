import React from 'react';

class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
          <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
          <p className="text-gray-500 mb-4">Please refresh the page and try again.</p>
          <button
            onClick={() => window.location.assign('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Go home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
