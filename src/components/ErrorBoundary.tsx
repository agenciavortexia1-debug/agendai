import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-red-50 p-8 flex flex-col items-center justify-center font-sans">
                    <div className="bg-white p-6 rounded-xl shadow-xl max-w-2xl w-full border border-red-100">
                        <h1 className="text-2xl font-bold text-red-600 mb-4">Erro Crítico no Aplicativo</h1>
                        <pre className="text-sm bg-red-50 p-4 rounded text-red-900 overflow-auto whitespace-pre-wrap mb-4 font-mono">
                            {this.state.error && this.state.error.toString()}
                        </pre>
                        <h2 className="font-bold text-zinc-700 mb-2">Stack de Componentes:</h2>
                        <pre className="text-xs bg-zinc-50 p-4 rounded text-zinc-600 overflow-auto whitespace-pre-wrap font-mono">
                            {this.state.errorInfo && this.state.errorInfo.componentStack}
                        </pre>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
