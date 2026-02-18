import React, { useState, useEffect } from 'react'
import { MessageSquare, Send, User } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'

const CommentSection = ({ storeId }) => {
    const [comments, setComments] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    const [showForm, setShowForm] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [formData, setFormData] = useState({ name: '', content: '' })
    const [submitSuccess, setSubmitSuccess] = useState(false)

    // Get or create anonymous submitter ID
    const getSubmitterId = () => {
        let id = localStorage.getItem('fab_submitter_id')
        if (!id) {
            id = crypto.randomUUID()
            localStorage.setItem('fab_submitter_id', id)
        }
        return id
    }

    // Fetch approved comments
    useEffect(() => {
        if (!storeId || !isSupabaseConfigured || !supabase) return

        const fetchComments = async () => {
            setIsLoading(true)
            const { data, error } = await supabase
                .from('comments')
                .select('*')
                .eq('store_id', storeId)
                .eq('status', 'approved')
                .order('created_at', { ascending: false })

            if (!error && data) {
                setComments(data)
            }
            setIsLoading(false)
        }

        fetchComments()
    }, [storeId])

    // Submit comment
    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!formData.content.trim()) return

        setIsSubmitting(true)
        try {
            const { error } = await supabase
                .from('comments')
                .insert({
                    store_id: storeId,
                    commenter_name: formData.name.trim() || '匿名',
                    content: formData.content.trim(),
                    status: 'pending',
                    submitter_id: getSubmitterId()
                })

            if (error) {
                alert('コメントの投稿に失敗しました: ' + error.message)
            } else {
                setSubmitSuccess(true)
                setFormData({ name: '', content: '' })
                setShowForm(false)
                setTimeout(() => setSubmitSuccess(false), 5000)
            }
        } catch (err) {
            alert('エラーが発生しました')
        }
        setIsSubmitting(false)
    }

    return (
        <div className="mt-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-[11px] font-semibold text-gold/70 uppercase tracking-wider flex items-center gap-1.5">
                    <MessageSquare size={13} />
                    コメント
                    {comments.length > 0 && (
                        <span className="text-gold/40">({comments.length})</span>
                    )}
                </h3>
                {!showForm && (
                    <button
                        onClick={() => setShowForm(true)}
                        className="text-[10px] text-gold/60 hover:text-gold transition-colors px-2 py-1 rounded-md border border-gold/20 hover:border-gold/40"
                    >
                        コメントを書く
                    </button>
                )}
            </div>

            {/* Success message */}
            {submitSuccess && (
                <div className="mb-3 p-2.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs">
                    コメントを投稿しました。管理者の承認後に表示されます。
                </div>
            )}

            {/* Comment form */}
            {showForm && (
                <form onSubmit={handleSubmit} className="mb-4 p-3 rounded-lg bg-white/5 border border-gold/20">
                    <div className="mb-2">
                        <input
                            type="text"
                            placeholder="名前（任意、空欄で「匿名」）"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full h-8 rounded-md border border-white/10 bg-white/5 px-3 text-xs text-gold-light placeholder:text-neutral-500 outline-none focus:border-gold/40 transition-colors"
                            maxLength={30}
                        />
                    </div>
                    <div className="mb-2">
                        <textarea
                            placeholder="コメントを入力..."
                            value={formData.content}
                            onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                            className="w-full h-20 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-gold-light placeholder:text-neutral-500 outline-none focus:border-gold/40 transition-colors resize-none"
                            maxLength={500}
                            required
                        />
                        <div className="text-right text-[9px] text-neutral-500 mt-0.5">
                            {formData.content.length}/500
                        </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                        <button
                            type="button"
                            onClick={() => { setShowForm(false); setFormData({ name: '', content: '' }) }}
                            className="px-3 py-1.5 text-[10px] text-neutral-400 hover:text-gold-light transition-colors"
                        >
                            キャンセル
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !formData.content.trim()}
                            className="px-3 py-1.5 rounded-md bg-gold/20 text-gold text-[10px] font-semibold hover:bg-gold/30 transition-colors disabled:opacity-40 flex items-center gap-1"
                        >
                            <Send size={10} />
                            {isSubmitting ? '送信中...' : '投稿する'}
                        </button>
                    </div>
                </form>
            )}

            {/* Comments list */}
            {isLoading ? (
                <div className="text-center text-[10px] text-neutral-500 py-4">読み込み中...</div>
            ) : comments.length > 0 ? (
                <div className="space-y-2.5">
                    {comments.map(comment => (
                        <div key={comment.id} className="p-3 rounded-lg bg-white/5 border border-white/5">
                            <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-1.5">
                                    <User size={12} className="text-gold/40" />
                                    <span className="text-[11px] font-semibold text-gold/80">
                                        {comment.commenter_name || '匿名'}
                                    </span>
                                </div>
                                <span className="text-[9px] text-neutral-500">
                                    {new Date(comment.created_at).toLocaleDateString('ja-JP')}
                                </span>
                            </div>
                            <p className="text-xs text-gold-light/70 leading-relaxed whitespace-pre-wrap">
                                {comment.content}
                            </p>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center text-[10px] text-neutral-500 py-3">
                    まだコメントはありません
                </div>
            )}
        </div>
    )
}

export default CommentSection
