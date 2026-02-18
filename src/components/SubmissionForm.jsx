import React, { useState, useEffect } from 'react'
import { X, Save, MapPin } from 'lucide-react'

const PREFECTURES = [
    "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
    "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
    "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県",
    "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府", "兵庫県",
    "奈良県", "和歌山県", "鳥取県", "島根県", "岡山県", "広島県", "山口県",
    "徳島県", "香川県", "愛媛県", "高知県", "福岡県", "佐賀県", "長崎県",
    "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県"
]

const SubmissionForm = ({ isOpen, onClose, onSubmit, initialLocation }) => {
    const [formData, setFormData] = useState({
        name: '',
        prefecture: '',
        address: '',
        latitude: 35.681,
        longitude: 139.767,
        fab_available: false,
        armory_available: false,
        format_text: '',
        notes: '',
        author: ''
    })

    useEffect(() => {
        if (initialLocation) {
            setFormData(prev => ({
                ...prev,
                latitude: initialLocation.lat,
                longitude: initialLocation.lng
            }))
        }
    }, [initialLocation])

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }))
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!formData.name || !formData.prefecture) {
            alert('店舗名と都道府県は必須です')
            return
        }
        onSubmit(formData)
    }

    return (
        <div className={`fullscreen-modal fixed inset-0 z-[60] bg-background ${isOpen ? 'open' : ''}`}>
            <div className="flex flex-col h-full">
                {/* Top bar */}
                <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-gold/20">
                    <h2 className="text-lg font-serif text-gold">店舗情報を投稿</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X size={22} className="text-gold/60" />
                    </button>
                </div>

                {/* Scrollable form body */}
                <div className="flex-1 overflow-y-auto px-5 py-5">
                    <form id="submission-form" onSubmit={handleSubmit} className="space-y-5">
                        {/* 店舗名 */}
                        <div>
                            <label className="text-xs text-gold/60 block mb-1.5">店舗名（必須）</label>
                            <input
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="例: Flesh and Blood 日本店"
                                required
                                className="w-full h-11 rounded-lg border border-white/10 bg-white/5 px-4 text-sm text-gold-light placeholder:text-neutral-500 outline-none focus:border-gold/40 transition-colors"
                            />
                        </div>

                        {/* 都道府県 + 住所 */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-gold/60 block mb-1.5">都道府県（必須）</label>
                                <select
                                    name="prefecture"
                                    value={formData.prefecture}
                                    onChange={handleChange}
                                    required
                                    className="w-full h-11 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-gold-light outline-none focus:border-gold/40 transition-colors"
                                >
                                    <option value="">選択</option>
                                    {PREFECTURES.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-gold/60 block mb-1.5">住所（任意）</label>
                                <input
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    placeholder="市区町村、番地"
                                    className="w-full h-11 rounded-lg border border-white/10 bg-white/5 px-4 text-sm text-gold-light placeholder:text-neutral-500 outline-none focus:border-gold/40 transition-colors"
                                />
                            </div>
                        </div>

                        {/* 座標情報 */}
                        <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                            <div className="flex items-center gap-2 text-xs text-gold/60">
                                <MapPin size={14} />
                                <span>座標: {formData.latitude.toFixed(4)}, {formData.longitude.toFixed(4)}</span>
                            </div>
                            <p className="text-[10px] text-neutral-500 mt-1">
                                ※ 地図上をタップしてから開くと自動設定されます
                            </p>
                        </div>

                        {/* チェックボックス */}
                        <div className="flex gap-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="fab_available"
                                    checked={formData.fab_available}
                                    onChange={handleChange}
                                    className="w-5 h-5 accent-[#d4af37] rounded"
                                />
                                <span className="text-sm text-gold-light">FAB取扱あり</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="armory_available"
                                    checked={formData.armory_available}
                                    onChange={handleChange}
                                    className="w-5 h-5 accent-[#d4af37] rounded"
                                />
                                <span className="text-sm text-gold-light">アーモリー開催あり</span>
                            </label>
                        </div>

                        {/* フォーマット */}
                        <div>
                            <label className="text-xs text-gold/60 block mb-1.5">フォーマット（自由記述）</label>
                            <input
                                name="format_text"
                                value={formData.format_text}
                                onChange={handleChange}
                                placeholder="例: Classic Constructed, Silver AGE"
                                className="w-full h-11 rounded-lg border border-white/10 bg-white/5 px-4 text-sm text-gold-light placeholder:text-neutral-500 outline-none focus:border-gold/40 transition-colors"
                            />
                        </div>

                        {/* 備考 */}
                        <div>
                            <label className="text-xs text-gold/60 block mb-1.5">備考</label>
                            <textarea
                                name="notes"
                                value={formData.notes}
                                onChange={handleChange}
                                rows={3}
                                placeholder="営業時間やイベント情報など"
                                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-gold-light placeholder:text-neutral-500 outline-none focus:border-gold/40 transition-colors resize-none"
                            />
                        </div>

                        {/* 投稿者名 */}
                        <div>
                            <label className="text-xs text-gold/60 block mb-1.5">投稿者名（任意）</label>
                            <input
                                name="author"
                                value={formData.author}
                                onChange={handleChange}
                                placeholder="ニックネーム"
                                className="w-full h-11 rounded-lg border border-white/10 bg-white/5 px-4 text-sm text-gold-light placeholder:text-neutral-500 outline-none focus:border-gold/40 transition-colors"
                            />
                        </div>
                    </form>
                </div>

                {/* Fixed submit button at bottom */}
                <div className="shrink-0 px-5 py-4 border-t border-gold/20 bg-card">
                    <button
                        type="submit"
                        form="submission-form"
                        className="w-full h-12 rounded-xl bg-gold text-black font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-[0_0_20px_rgba(212,175,55,0.2)]"
                    >
                        <Save size={18} />
                        審査リクエストを送信
                    </button>
                </div>
            </div>
        </div>
    )
}

export default SubmissionForm
