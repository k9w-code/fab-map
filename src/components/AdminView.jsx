import React, { useState, useEffect } from 'react'
import { Check, X, ArrowLeft, Trash2 } from 'lucide-react'
import { Button } from './ui/Button'
import { Card } from './ui/Card'
import { supabase } from '../lib/supabaseClient'

const AdminView = ({ onBack }) => {
    const [pendingStores, setPendingStores] = useState([])
    const [isLoading, setIsLoading] = useState(true)

    const fetchPending = async () => {
        setIsLoading(true)
        const { data, error } = await supabase
            .from('stores')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching pending stores:', error)
        } else {
            setPendingStores(data || [])
        }
        setIsLoading(false)
    }

    useEffect(() => {
        fetchPending()
    }, [])

    const handleApprove = async (id) => {
        const { error } = await supabase
            .from('stores')
            .update({ status: 'approved' })
            .eq('id', id)

        if (error) {
            alert('承認に失敗しました: ' + error.message)
        } else {
            fetchPending()
        }
    }

    const handleReject = async (id) => {
        if (!confirm('本当にこの投稿を却下（削除）しますか？')) return

        const { error } = await supabase
            .from('stores')
            .delete()
            .eq('id', id)

        if (error) {
            alert('却下に失敗しました: ' + error.message)
        } else {
            fetchPending()
        }
    }

    return (
        <div className="min-h-screen bg-background p-6 pt-12">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                            <ArrowLeft className="text-gold" />
                        </button>
                        <h1 className="text-2xl font-serif text-gold">管理者画面 (Pending Submissions)</h1>
                    </div>
                    <Button variant="secondary" onClick={fetchPending} size="sm">
                        再読み込み
                    </Button>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-gold"></div>
                    </div>
                ) : pendingStores.length === 0 ? (
                    <p className="text-center text-neutral-500 py-20">承認待ちの投稿はありません。</p>
                ) : (
                    <div className="space-y-4">
                        {pendingStores.map((store) => (
                            <Card key={store.id} className="p-4 border-gold/10 hover:border-gold/30 transition-colors">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-2">
                                        <h3 className="text-lg font-bold text-gold-light">{store.name}</h3>
                                        <div className="text-sm text-neutral-400">
                                            <p>{store.prefecture} {store.address}</p>
                                            <p className="text-xs mt-1">座標: {store.latitude}, {store.longitude}</p>
                                        </div>
                                        <div className="flex gap-4 text-xs">
                                            <span className={store.fab_available ? 'text-green-400' : 'text-red-400'}>
                                                FAB: {store.fab_available ? 'あり' : 'なし'}
                                            </span>
                                            <span className={store.armory_available ? 'text-green-400' : 'text-red-400'}>
                                                アーモリー: {store.armory_available ? 'あり' : 'なし'}
                                            </span>
                                        </div>
                                        {store.format_text && (
                                            <p className="text-sm bg-white/5 p-2 rounded">フォーマット: {store.format_text}</p>
                                        )}
                                        {store.notes && (
                                            <p className="text-sm italic text-neutral-300">備考: {store.notes}</p>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            onClick={() => handleApprove(store.id)}
                                            className="bg-green-600 hover:bg-green-700 text-white h-10 w-10 p-0"
                                        >
                                            <Check size={20} />
                                        </Button>
                                        <Button
                                            onClick={() => handleReject(store.id)}
                                            className="bg-red-900/50 hover:bg-red-800 text-white h-10 w-10 p-0"
                                        >
                                            <X size={20} />
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default AdminView
