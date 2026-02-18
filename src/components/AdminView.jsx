import React, { useState, useEffect } from 'react'
import { Check, X, ArrowLeft, Trash2, Edit2, Lock } from 'lucide-react'
import { Button } from './ui/Button'
import { Card } from './ui/Card'
import { supabase } from '../lib/supabaseClient'
import SubmissionForm from './SubmissionForm'

const AdminView = ({ onBack }) => {
    const [stores, setStores] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('pending') // 'pending' | 'approved'
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [password, setPassword] = useState('')
    const [editingStore, setEditingStore] = useState(null)
    const [isEditOpen, setIsEditOpen] = useState(false)

    // Check password on mount / when it changes
    useEffect(() => {
        const adminPass = import.meta.env.VITE_ADMIN_PASSWORD || 'admin123'
        const savedAuth = sessionStorage.getItem('admin_auth')
        if (savedAuth === 'true') {
            setIsAuthenticated(true)
        }
    }, [])

    const handleLogin = (e) => {
        e.preventDefault()
        const adminPass = import.meta.env.VITE_ADMIN_PASSWORD || 'admin123'
        if (password === adminPass) {
            setIsAuthenticated(true)
            sessionStorage.setItem('admin_auth', 'true')
        } else {
            alert('パスワードが違います')
        }
    }

    const fetchData = async () => {
        setIsLoading(true)
        const { data, error } = await supabase
            .from('stores')
            .select('*')
            .eq('status', activeTab)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching stores:', error)
        } else {
            setStores(data || [])
        }
        setIsLoading(false)
    }

    useEffect(() => {
        if (isAuthenticated) {
            fetchData()
        }
    }, [isAuthenticated, activeTab])

    const handleApprove = async (id) => {
        const { error } = await supabase
            .from('stores')
            .update({ status: 'approved' })
            .eq('id', id)

        if (error) {
            alert('承認に失敗しました: ' + error.message)
        } else {
            fetchData()
        }
    }

    const handleDelete = async (id) => {
        if (!confirm('本当にこのデータを削除しますか？')) return

        const { error } = await supabase
            .from('stores')
            .delete()
            .eq('id', id)

        if (error) {
            alert('削除に失敗しました: ' + error.message)
        } else {
            fetchData()
        }
    }

    const handleEditSave = async (formData) => {
        // Filter out system columns and non-existent columns
        const validColumns = [
            'name', 'prefecture', 'address', 'latitude', 'longitude',
            'fab_available', 'armory_available', 'format_text', 'notes',
            'status', 'source_type'
        ]

        const cleanData = {}
        validColumns.forEach(col => {
            if (formData[col] !== undefined) {
                cleanData[col] = formData[col]
            }
        })

        const { error } = await supabase
            .from('stores')
            .update(cleanData)
            .eq('id', editingStore.id)

        if (error) {
            alert('保存に失敗しました: ' + error.message)
        } else {
            setIsEditOpen(false)
            fetchData()
        }
    }

    // Password Screen
    if (!isAuthenticated) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background p-6">
                <Card className="w-full max-w-md p-8 border-gold/20 bg-card/50 backdrop-blur-xl">
                    <div className="flex flex-col items-center mb-6">
                        <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center mb-4">
                            <Lock className="text-gold" size={32} />
                        </div>
                        <h1 className="text-2xl font-serif text-gold">Administrator</h1>
                        <p className="text-neutral-500 text-sm mt-1">管理画面にアクセスするにはパスワードが必要です</p>
                    </div>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="パスワードを入力..."
                            className="w-full h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-gold-light outline-none focus:border-gold/40 transition-colors"
                            autoFocus
                        />
                        <button
                            type="submit"
                            className="w-full h-12 rounded-xl bg-gold text-black font-bold active:scale-95 transition-transform"
                        >
                            ログイン
                        </button>
                    </form>
                    <button onClick={onBack} className="w-full mt-4 text-gold/40 text-sm hover:text-gold transition-colors">
                        地図に戻る
                    </button>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background p-4 pb-20 sm:p-6 sm:pt-12">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                            <ArrowLeft className="text-gold" />
                        </button>
                        <h1 className="text-2xl font-serif text-gold">管理者メニュー</h1>
                    </div>

                    {/* Tab Switcher */}
                    <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
                        <button
                            onClick={() => setActiveTab('pending')}
                            className={`px-4 py-2 rounded-md text-sm transition-all ${activeTab === 'pending' ? 'bg-gold text-black font-bold' : 'text-gold/50 hover:text-gold'
                                }`}
                        >
                            承認待ち
                        </button>
                        <button
                            onClick={() => setActiveTab('approved')}
                            className={`px-4 py-2 rounded-md text-sm transition-all ${activeTab === 'approved' ? 'bg-gold text-black font-bold' : 'text-gold/50 hover:text-gold'
                                }`}
                        >
                            公開済み
                        </button>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-gold"></div>
                    </div>
                ) : stores.length === 0 ? (
                    <div className="text-center py-20 bg-white/5 rounded-2xl border border-dashed border-white/10">
                        <p className="text-neutral-500">
                            {activeTab === 'pending' ? '承認待ちの投稿はありません。' : '公開済みの店舗はありません。'}
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {stores.map((store) => (
                            <Card key={store.id} className="p-4 border-gold/10 hover:border-gold/30 transition-all bg-card/30 group">
                                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-lg font-bold text-gold-light">{store.name}</h3>
                                            <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-neutral-400">
                                                ID: {store.id.slice(0, 8)}
                                            </span>
                                        </div>
                                        <div className="text-sm text-neutral-400">
                                            <p>{store.prefecture} {store.address}</p>
                                        </div>
                                        <div className="flex gap-4 text-[10px] font-mono uppercase">
                                            <span className={store.fab_available ? 'text-green-400' : 'text-red-400'}>
                                                FAB: {store.fab_available ? 'YES' : 'NO'}
                                            </span>
                                            <span className={store.armory_available ? 'text-green-400' : 'text-red-400'}>
                                                Armory: {store.armory_available ? 'YES' : 'NO'}
                                            </span>
                                        </div>
                                        {store.format_text && (
                                            <p className="text-xs bg-white/5 p-2 rounded text-neutral-300">
                                                Format: {store.format_text}
                                            </p>
                                        )}
                                        {store.notes && (
                                            <p className="text-xs italic text-neutral-400">Memo: {store.notes}</p>
                                        )}
                                    </div>

                                    <div className="flex sm:flex-col gap-2 w-full sm:w-auto self-stretch">
                                        {activeTab === 'pending' && (
                                            <button
                                                onClick={() => handleApprove(store.id)}
                                                className="flex-1 sm:w-12 h-10 rounded-lg bg-green-600/80 hover:bg-green-600 text-white flex items-center justify-center transition-colors shadow-lg"
                                                title="承認する"
                                            >
                                                <Check size={20} />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => {
                                                setEditingStore(store)
                                                setIsEditOpen(true)
                                            }}
                                            className="flex-1 sm:w-12 h-10 rounded-lg bg-white/10 hover:bg-white/20 text-gold flex items-center justify-center transition-colors"
                                            title="編集する"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(store.id)}
                                            className="flex-1 sm:w-12 h-10 rounded-lg bg-red-900/30 hover:bg-red-900 text-red-400 flex items-center justify-center transition-colors"
                                            title="削除する"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Editing Form Modal */}
            <SubmissionForm
                isOpen={isEditOpen}
                onClose={() => {
                    setIsEditOpen(false)
                    setEditingStore(null)
                }}
                onSubmit={handleEditSave}
                initialData={editingStore}
            />
        </div>
    )
}

export default AdminView
