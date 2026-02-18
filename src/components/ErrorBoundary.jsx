import React from 'react'
import { AlertTriangle } from 'lucide-react'

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error }
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an error", error, errorInfo)
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-4 m-4 bg-red-900/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
                    <div className="flex items-center gap-2 mb-2 font-bold text-red-400">
                        <AlertTriangle size={16} />
                        <span>エラーが発生しました</span>
                    </div>
                    <p className="mb-2">店舗情報の表示中に問題が発生しました。</p>
                    <pre className="bg-black/20 p-2 rounded text-[10px] overflow-auto max-h-20 whitespace-pre-wrap">
                        {this.state.error && this.state.error.toString()}
                    </pre>
                    <button
                        onClick={() => this.setState({ hasError: false })}
                        className="mt-2 px-3 py-1 bg-red-500/20 hover:bg-red-500/30 rounded text-xs transition-colors"
                    >
                        再試行
                    </button>
                </div>
            )
        }

        return this.props.children
    }
}

export default ErrorBoundary
