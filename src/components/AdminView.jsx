import React, { useState, useEffect } from 'react'
import { Check, X, ArrowLeft, Trash2, Edit2, Lock, MessageSquare } from 'lucide-react'
import { Button } from './ui/Button'
import { Card } from './ui/Card'
import { supabase } from '../lib/supabaseClient'
import SubmissionForm from './SubmissionForm'

const AdminView = ({ onBack, clickedLocation }) => {
    const [stores, setStores] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('pending') // 'pending' | 'approved' | 'comments'
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [password, setPassword] = useState('')
    const [editingStore, setEditingStore] = useState(null)
    const [isEditOpen, setIsEditOpen] = useState(false)
    const [itemToDelete, setItemToDelete] = useState(null)
    const [isPickingLocation, setIsPickingLocation] = useState(false)
    const [blockedIds, setBlockedIds] = useState([])
    const [comments, setComments] = useState([])
    const [commentFilter, setCommentFilter] = useState('pending') // 'pending' | 'approved'

    // Load blocked IDs
    useEffect(() => {
        const stored = localStorage.getItem('fab_map_blocked_ids')
        if (stored) {
            setBlockedIds(JSON.parse(stored))
        }
    }, [])

    const handleBlockUser = (submitterId) => {
        if (!submitterId) return
        if (!window.confirm('このユーザーをローカルブロックしますか？\n今後このユーザーからの投稿は強調表示されます。')) return

        const newBlocked = [...blockedIds, submitterId]
        setBlockedIds(newBlocked)
        localStorage.setItem('fab_map_blocked_ids', JSON.stringify(newBlocked))
    }

    const handleUnblockUser = (submitterId) => {
        if (!window.confirm('ブロックを解除しますか？')) return
        const newBlocked = blockedIds.filter(id => id !== submitterId)
        setBlockedIds(newBlocked)
        localStorage.setItem('fab_map_blocked_ids', JSON.stringify(newBlocked))
    }
    useEffect(() => {
        const adminPass = import.meta.env.VITE_ADMIN_PASSWORD || 'admin123'
        const savedAuth = sessionStorage.getItem('admin_auth')
        if (savedAuth === 'true') {
            setIsAuthenticated(true)
        }
    }, [])

    // Monitor clickedLocation for picking
    useEffect(() => {
        if (isPickingLocation && clickedLocation) {
            console.log('Picked location:', clickedLocation)
            // Update editingStore with new coordinates
            setEditingStore(prev => ({
                ...prev,
                latitude: clickedLocation.lat,
                longitude: clickedLocation.lng
            }))
            setIsPickingLocation(false)
            setIsEditOpen(true) // Re-open form
        }
    }, [clickedLocation, isPickingLocation])

    // SHA-256 hash helper using Web Crypto API
    const sha256 = async (message) => {
        const msgBuffer = new TextEncoder().encode(message)
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    }

    const handleLogin = async (e) => {
        e.preventDefault()
        try {
            const inputHash = await sha256(password)
            const storedHash = import.meta.env.VITE_ADMIN_HASH

            if (inputHash === storedHash) {
                setIsAuthenticated(true)
                sessionStorage.setItem('admin_auth', 'true')
            } else {
                alert('パスワードが違います')
            }
        } catch (err) {
            console.error('Login error:', err)
            alert('ログインの処理に失敗しました。')
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
            if (activeTab === 'comments') {
                fetchComments()
            } else {
                fetchData()
            }
        }
    }, [isAuthenticated, activeTab, commentFilter])

    // Fetch comments based on filter
    const fetchComments = async () => {
        setIsLoading(true)
        const { data, error } = await supabase
            .from('comments')
            .select('*, stores(name)')
            .eq('status', commentFilter)
            .order('created_at', { ascending: false })

        if (!error && data) {
            setComments(data)
        }
        setIsLoading(false)
    }

    // Approve comment
    const handleApproveComment = async (commentId) => {
        const { error } = await supabase
            .from('comments')
            .update({ status: 'approved' })
            .eq('id', commentId)

        if (error) {
            alert('承認に失敗しました: ' + error.message)
        } else {
            fetchComments()
        }
    }

    // Delete comment
    const handleDeleteComment = async (commentId) => {
        if (!window.confirm('このコメントを削除しますか？')) return
        const { error } = await supabase
            .from('comments')
            .delete()
            .eq('id', commentId)

        if (error) {
            alert('削除に失敗しました: ' + error.message)
        } else {
            fetchComments()
        }
    }

    // GSI Geocoding helper (same logic as SubmissionForm)
    const geocodeWithGSI = async (prefecture, cityTown, street) => {
        const toHalfWidth = (str) => {
            if (!str) return ''
            return str.replace(/[！-～]/g, (s) =>
                String.fromCharCode(s.charCodeAt(0) - 0xFEE0)
            ).replace(/　/g, ' ')
        }
        const normalizedStreet = toHalfWidth(street)
        const queries = []
        if (prefecture && cityTown && normalizedStreet) {
            queries.push(`${prefecture}${cityTown}${normalizedStreet}`)
            if (normalizedStreet.match(/^\d+-\d+(-\d+)?$/)) {
                const chomeStreet = normalizedStreet.replace(/^(\d+)-/, '$1丁目')
                queries.push(`${prefecture}${cityTown}${chomeStreet}`)
            }
        }
        if (prefecture && cityTown) {
            queries.push(`${prefecture}${cityTown}`)
        }

        for (const q of queries) {
            try {
                console.log('GSI geocode (approve):', q)
                const res = await fetch(`https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encodeURIComponent(q)}`)
                const data = await res.json()
                if (data && data.length > 0) {
                    const [lon, lat] = data[0].geometry.coordinates
                    return { lat, lon }
                }
            } catch (e) {
                console.error('GSI error:', e)
            }
        }
        return null
    }

    const handleApprove = async (id) => {
        // Find the store to get address info
        const store = stores.find(s => s.id === id)

        let updateData = { status: 'approved' }

        // Auto re-geocode using GSI before approving
        if (store && store.prefecture) {
            const coords = await geocodeWithGSI(
                store.prefecture,
                store.city_town || '',
                store.address_line1 || ''
            )
            if (coords) {
                updateData.latitude = coords.lat
                updateData.longitude = coords.lon
                console.log('Re-geocoded on approve:', coords)
            }
        }

        const { error } = await supabase
            .from('stores')
            .update(updateData)
            .eq('id', id)

        if (error) {
            alert('承認に失敗しました: ' + error.message)
        } else {
            fetchData()
        }
    }

    const handleDeleteClick = (store) => {
        console.log('Delete button clicked for:', store.name)
        setItemToDelete(store)
    }

    const handleConfirmDelete = async () => {
        if (!itemToDelete) return

        const id = itemToDelete.id
        setIsLoading(true)
        try {
            const { data, error } = await supabase
                .from('stores')
                .delete()
                .eq('id', id)
                .select()

            if (error) {
                console.error('Delete error details:', error)
                alert('削除に失敗しました（DBエラー）: ' + error.message)
            } else {
                setStores(prev => prev.filter(s => s.id !== id))
                setItemToDelete(null)
            }
        } catch (err) {
            console.error('Fatal delete error:', err)
            alert('削除中に予期せぬエラーが発生しました: ' + err.message)
        } finally {
            setIsLoading(false)
        }
    }

    const handleEditSave = async (formData) => {
        // Check if mode is location picking
        if (formData.mode === 'pick_location') {
            setIsEditOpen(false) // Hide form
            setIsPickingLocation(true) // Enable transparent mode
            // Preserve current form state in editingStore
            setEditingStore({
                ...editingStore,
                ...formData,
                mode: undefined // clear mode
            })
            return
        }

        console.log('Saving edit for:', editingStore.id, formData)

        // Filter out system columns and non-existent columns
        const validColumns = [
            'name', 'prefecture', 'address', 'latitude', 'longitude',
            'fab_available', 'armory_available', 'format_text', 'notes',
            'status', 'source_type', 'postal_code', 'city_town', 'address_line1', 'address_line2'
        ]

        const cleanData = {}
        validColumns.forEach(col => {
            if (formData[col] !== undefined) {
                cleanData[col] = formData[col]
            }
        })

        try {
            const { data, error } = await supabase
                .from('stores')
                .update(cleanData)
                .eq('id', editingStore.id)
                .select()

            if (error) {
                console.error('Admin update error object:', error)
                alert(`保存に失敗しました: ${error.message} (Code: ${error.code})`)
            } else {
                console.log('Update success:', data)
                setIsEditOpen(false)
                setEditingStore(null)
                fetchData()
            }
        } catch (err) {
            console.error('Fatal admin update error:', err)
            alert(`予期せぬエラーが発生しました: ${err.message}`)
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

    // If picking location, render hidden/transparent overlay
    if (isPickingLocation) {
        return (
            <div className="fixed inset-0 z-50 pointer-events-none flex flex-col items-center justify-start pt-20 bg-black/20">
                <div className="pointer-events-auto bg-black/80 text-gold px-6 py-3 rounded-full border border-gold shadow-lg backdrop-blur-md animate-bounce">
                    📍 地図上の正しい位置をタップしてください
                </div>
                <button
                    onClick={() => {
                        setIsPickingLocation(false)
                        setIsEditOpen(true)
                    }}
                    className="pointer-events-auto mt-4 text-sm text-white/80 underline hover:text-white"
                >
                    キャンセルして戻る
                </button>
            </div>
        )
    }

    return (
        <div className="h-screen overflow-y-auto bg-background p-4 pb-24 sm:p-6 sm:pt-12">
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
                        <button
                            onClick={() => setActiveTab('comments')}
                            className={`px-4 py-2 rounded-md text-sm transition-all flex items-center gap-1 ${activeTab === 'comments' ? 'bg-gold text-black font-bold' : 'text-gold/50 hover:text-gold'
                                }`}
                        >
                            <MessageSquare size={14} />
                            コメント
                        </button>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-gold"></div>
                    </div>
                ) : activeTab === 'comments' ? (
                    /* ===== Comments Management ===== */
                    <div className="space-y-4">
                        {/* Filter Toggles */}
                        <div className="flex gap-2 mb-4">
                            <button
                                onClick={() => setCommentFilter('pending')}
                                className={`px-3 py-1.5 rounded-full text-xs transition-colors ${commentFilter === 'pending'
                                    ? 'bg-gold text-black font-bold'
                                    : 'bg-white/5 text-gold/60 hover:text-gold'
                                    }`}
                            >
                                承認待ち
                            </button>
                            <button
                                onClick={() => setCommentFilter('approved')}
                                className={`px-3 py-1.5 rounded-full text-xs transition-colors ${commentFilter === 'approved'
                                    ? 'bg-gold text-black font-bold'
                                    : 'bg-white/5 text-gold/60 hover:text-gold'
                                    }`}
                            >
                                公開済み
                            </button>
                        </div>

                        {comments.length === 0 ? (
                            <div className="text-center py-20 bg-white/5 rounded-2xl border border-dashed border-white/10">
                                <MessageSquare size={32} className="mx-auto text-neutral-600 mb-3" />
                                <p className="text-neutral-500">
                                    {commentFilter === 'pending' ? '承認待ちのコメントはありません。' : '公開済みのコメントはありません。'}
                                </p>
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {comments.map(comment => (
                                    <Card key={comment.id} className="p-4 bg-card/30 border-gold/10 hover:border-gold/30 transition-all">
                                        <div className="flex flex-col gap-3">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <p className="text-xs text-gold/60 mb-1">
                                                        店舗: <span className="text-gold">{comment.stores?.name || '不明'}</span>
                                                    </p>
                                                    <p className="text-[11px] text-neutral-400">
                                                        投稿者: {comment.commenter_name || '匿名'} ・ {new Date(comment.created_at).toLocaleDateString('ja-JP')}
                                                    </p>
                                                </div>
                                                {comment.status === 'approved' && (
                                                    <span className="px-2 py-0.5 rounded text-[10px] bg-green-500/10 text-green-400 border border-green-500/20">
                                                        公開中
                                                    </span>
                                                )}
                                            </div>
                                            <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                                                <p className="text-sm text-gold-light/80 whitespace-pre-wrap">{comment.content}</p>
                                            </div>
                                            <div className="flex gap-2 justify-end">
                                                <button
                                                    onClick={() => handleDeleteComment(comment.id)}
                                                    className="px-3 py-1.5 rounded-md bg-red-500/10 text-red-400 text-xs hover:bg-red-500/20 transition-colors flex items-center gap-1"
                                                >
                                                    <Trash2 size={12} /> 削除
                                                </button>
                                                {comment.status === 'pending' && (
                                                    <button
                                                        onClick={() => handleApproveComment(comment.id)}
                                                        className="px-3 py-1.5 rounded-md bg-green-500/10 text-green-400 text-xs hover:bg-green-500/20 transition-colors flex items-center gap-1"
                                                    >
                                                        <Check size={12} /> 承認
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                ) : stores.length === 0 ? (
                    <div className="text-center py-20 bg-white/5 rounded-2xl border border-dashed border-white/10">
                        <p className="text-neutral-500">
                            {activeTab === 'pending' ? '承認待ちの投稿はありません。' : '公開済みの店舗はありません。'}
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {stores.map((store) => {
                            const isBlocked = blockedIds.includes(store.submitter_id)
                            return (
                                <Card key={store.id} className={`p-4 transition-all bg-card/30 group ${isBlocked ? 'border-red-500/50 bg-red-900/10' : 'border-gold/10 hover:border-gold/30'}`}>
                                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                                        <div className="flex-1 space-y-2">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="text-lg font-bold text-gold-light">{store.name}</h3>
                                                <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-neutral-400">
                                                    ID: {store.id.slice(0, 8)}
                                                </span>
                                                {store.submitter_id && (
                                                    <span className={`text-[10px] px-2 py-0.5 rounded cursor-help ${isBlocked ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-white/5 text-neutral-500'}`} title={store.submitter_id}>
                                                        User: {store.submitter_id.slice(0, 8)}
                                                    </span>
                                                )}
                                                {isBlocked && <span className="text-[10px] font-bold text-red-500">BLOCKED</span>}
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
                                                    console.log('Edit clicked', store.id)
                                                    setEditingStore(store)
                                                    setIsEditOpen(true)
                                                }}
                                                className="relative flex-1 sm:w-12 h-10 rounded-lg bg-white/10 hover:bg-white/20 text-gold flex items-center justify-center transition-colors cursor-pointer z-10"
                                                title="編集する"
                                            >
                                                <Edit2 size={18} className="pointer-events-none" />
                                            </button>

                                            {store.submitter_id && (
                                                <button
                                                    onClick={() => isBlocked ? handleUnblockUser(store.submitter_id) : handleBlockUser(store.submitter_id)}
                                                    className={`relative flex-1 sm:w-12 h-10 rounded-lg flex items-center justify-center transition-colors cursor-pointer z-10 ${isBlocked ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-white/5 hover:bg-white/10 text-neutral-500'}`}
                                                    title={isBlocked ? "ブロック解除" : "このユーザーをブロック"}
                                                >
                                                    <Lock size={16} className="pointer-events-none" />
                                                </button>
                                            )}

                                            <button
                                                onClick={() => handleDeleteClick(store)}
                                                className="relative flex-1 sm:w-12 h-10 rounded-lg bg-red-900/40 hover:bg-red-900 text-red-100 flex items-center justify-center transition-colors cursor-pointer z-10 border border-red-500/30"
                                                title="削除する"
                                            >
                                                <Trash2 size={18} className="pointer-events-none" />
                                            </button>
                                        </div>
                                    </div>
                                </Card>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Deletion Confirmation Modal */}
            {itemToDelete && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <Card className="w-full max-w-sm p-6 border-gold/30 bg-card shadow-2xl animate-fade-in">
                        <h3 className="text-xl font-serif text-gold mb-2">データを削除しますか？</h3>
                        <p className="text-sm text-neutral-400 mb-6">
                            「<span className="text-gold-light">{itemToDelete.name}</span>」のデータを完全に削除します。この操作は取り消せません。
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setItemToDelete(null)}
                                className="flex-1 h-12 rounded-xl bg-white/5 border border-white/10 text-gold-light hover:bg-white/10 transition-colors"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={handleConfirmDelete}
                                className="flex-1 h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-colors shadow-lg shadow-red-900/20"
                            >
                                削除する
                            </button>
                        </div>
                    </Card>
                </div>
            )}

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
