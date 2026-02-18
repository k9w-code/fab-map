import React, { useRef, useEffect } from 'react'
import { X, MapPin, ExternalLink, Edit3 } from 'lucide-react'

const StoreBottomSheet = ({ store, isOpen, onClose, onEdit }) => {
    const sheetRef = useRef(null)
    const startY = useRef(0)
    const currentY = useRef(0)

    // Swipe to close
    const handleTouchStart = (e) => {
        startY.current = e.touches[0].clientY
    }

    const handleTouchMove = (e) => {
        currentY.current = e.touches[0].clientY
        const diff = currentY.current - startY.current
        if (diff > 0 && sheetRef.current) {
            sheetRef.current.style.transform = `translateY(${diff}px)`
            sheetRef.current.style.transition = 'none'
        }
    }

    const handleTouchEnd = () => {
        const diff = currentY.current - startY.current
        if (sheetRef.current) {
            sheetRef.current.style.transition = ''
            sheetRef.current.style.transform = ''
        }
        if (diff > 100) {
            onClose()
        }
    }

    if (!store) return null

    return (
        <>
            {/* Overlay */}
            <div
                className={`sheet-overlay fixed inset-0 bg-black/60 backdrop-blur-sm z-40 ${isOpen ? 'open' : ''}`}
                onClick={onClose}
            />

            {/* Sheet */}
            <div
                ref={sheetRef}
                className={`bottom-sheet fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-gold/30 rounded-t-3xl max-h-[60vh] overflow-y-auto ${isOpen ? 'open' : ''}`}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {/* Drag handle */}
                <div className="flex justify-center pt-3 pb-1">
                    <div className="w-10 h-1 rounded-full bg-white/20" />
                </div>

                <div className="px-5 pb-8">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h2 className="text-xl font-serif text-gold-light mb-1">{store.name}</h2>
                            <div className="flex items-center text-neutral-400 text-sm">
                                <MapPin size={14} className="mr-1 shrink-0" />
                                <span>{store.prefecture} {store.address}</span>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-full transition-colors shrink-0"
                        >
                            <X size={20} className="text-gold/60" />
                        </button>
                    </div>

                    {/* Status cards */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                            <span className="text-[10px] text-neutral-500 block mb-1">FAB取扱</span>
                            <span className={store.fab_available ? 'text-green-400 font-bold text-sm' : 'text-neutral-400 text-sm'}>
                                {store.fab_available ? 'あり' : '不明'}
                            </span>
                        </div>
                        <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                            <span className="text-[10px] text-neutral-500 block mb-1">アーモリー開催</span>
                            <span className={store.armory_available ? 'text-green-400 font-bold text-sm' : 'text-neutral-400 text-sm'}>
                                {store.armory_available ? 'あり' : '不明'}
                            </span>
                        </div>
                    </div>

                    {/* Format */}
                    <div className="mb-4">
                        <h3 className="text-[11px] font-semibold text-gold/70 mb-1 uppercase tracking-wider">フォーマット</h3>
                        <p className="text-sm text-gold-light/80 bg-white/5 p-3 rounded-lg border border-white/5 leading-relaxed">
                            {store.format_text || '情報なし'}
                        </p>
                    </div>

                    {/* Meta */}
                    <div className="flex justify-between text-[10px] text-neutral-500 mb-5 pb-3 border-b border-white/10">
                        <span>情報ソース: {store.source_type === 'initial' ? '初期登録' : 'コミュニティ投稿'}</span>
                        <span>最終更新: {store.updated_at ? new Date(store.updated_at).toLocaleDateString('ja-JP') : '不明'}</span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-3">
                        <button
                            className="flex-1 h-11 rounded-lg bg-gold text-black font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
                            onClick={() => window.open(
                                `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(store.name + ' ' + (store.address || ''))}`,
                                '_blank'
                            )}
                        >
                            <ExternalLink size={16} />
                            Google Mapで開く
                        </button>
                        <button
                            className="h-11 px-4 rounded-lg bg-white/5 border border-white/10 text-gold-light/70 text-sm flex items-center gap-2 active:scale-95 transition-transform"
                            onClick={() => onEdit && onEdit(store)}
                        >
                            <Edit3 size={16} />
                            情報を修正
                        </button>
                    </div>
                </div>
            </div>
        </>
    )
}

export default StoreBottomSheet
