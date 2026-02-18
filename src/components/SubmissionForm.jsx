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

const SubmissionForm = ({ isOpen, onClose, onSubmit, initialLocation, initialData }) => {
    const [formData, setFormData] = useState({
        name: '',
        postalCode: '',
        prefecture: '',
        address: '',
        latitude: 35.681,
        longitude: 139.767,
        fab_available: false,
        armory_available: false,
        format_text: '',
        notes: ''
    })
    const [isGeocoding, setIsGeocoding] = useState(false)

    useEffect(() => {
        if (initialData) {
            setFormData({
                ...initialData,
                name: initialData.name || '',
                postalCode: initialData.postal_code || '', // Support existing data if any
                prefecture: initialData.prefecture || '',
                address: initialData.address || '',
                latitude: initialData.latitude || 35.681,
                longitude: initialData.longitude || 139.767,
                fab_available: !!initialData.fab_available,
                armory_available: !!initialData.armory_available,
                format_text: initialData.format_text || '',
                notes: initialData.notes || ''
            })
        } else if (initialLocation) {
            setFormData(prev => ({
                ...prev,
                latitude: initialLocation.lat,
                longitude: initialLocation.lng
            }))
        } else if (!isOpen) {
            // Reset form
            setFormData({
                name: '',
                postalCode: '',
                prefecture: '',
                address: '',
                latitude: 35.681,
                longitude: 139.767,
                fab_available: false,
                armory_available: false,
                format_text: '',
                notes: ''
            })
        }
    }, [initialData, initialLocation, isOpen])

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }))
    }

    // Auto-fill address from Postal Code
    const handlePostalCodeChange = async (e) => {
        const value = e.target.value
        setFormData(prev => ({ ...prev, postalCode: value }))

        // Trigger search when 7 digits are entered
        if (value.replace(/-/g, '').length === 7) {
            try {
                const response = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${value}`)
                const data = await response.json()
                if (data.results && data.results[0]) {
                    const { address1, address2, address3 } = data.results[0]
                    setFormData(prev => ({
                        ...prev,
                        prefecture: address1,
                        address: `${address2}${address3}`
                    }))
                }
            } catch (error) {
                console.error('Postal code search error:', error)
            }
        }
    }

    const handleGeocode = async () => {
        if (!formData.prefecture && !formData.postalCode) {
            alert('郵便番号、または都道府県と住所を入力してください')
            return
        }

        setIsGeocoding(true)

        // Nominatim search helper
        const searchLocation = async (q) => {
            console.log('Trying Nominatim search:', q)
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`,
                {
                    headers: {
                        'Accept-Language': 'ja',
                        'User-Agent': 'FaB-Map-App'
                    }
                }
            )
            return await response.json()
        }

        const prefecture = formData.prefecture
        const address = formData.address
        const postalCode = formData.postalCode

        try {
            let queries = []

            // Priority 1: Prefecture + Address (if core address exists)
            // e.g. "東京都 千代田区外神田1-6-3"
            if (prefecture && address) {
                // Clean up common noise
                const cleanAddress = address
                    .replace(/[0-9]+F/gi, '')
                    .replace(/ビル.*$/g, '')
                    .trim()
                queries.push(`${prefecture} ${cleanAddress}`)
            }

            // Priority 2: Postal Code + Address (Without building info)
            // If user entered postal code, use it!
            if (postalCode && address) {
                const cleanAddress = address
                    .replace(/[0-9]+F/gi, '')
                    .replace(/ビル.*$/g, '')
                    .trim()
                // Nominatim often understands "101-0021 1-6-3"
                queries.push(`${postalCode} ${cleanAddress}`)
            }

            // Priority 3: Just Postal Code (Fallback)
            if (postalCode) {
                queries.push(postalCode)
            }

            // Deduplicate
            const uniqueQueries = [...new Set(queries)].filter(q => q && q.trim().length > 0)
            console.log('Generated queries:', uniqueQueries)

            let result = null
            for (const q of uniqueQueries) {
                const data = await searchLocation(q)
                if (data && data.length > 0) {
                    result = data[0]
                    break
                }
            }

            if (result) {
                const { lat, lon } = result
                setFormData(prev => ({
                    ...prev,
                    latitude: parseFloat(lat),
                    longitude: parseFloat(lon)
                }))
                console.log('Geocoding success:', result.display_name)
            } else {
                alert('場所を特定できませんでした。手動でピンを設定してください。')
            }
        } catch (error) {
            console.error('Geocoding error:', error)
            alert('位置情報の取得中にエラーが発生しました')
        } finally {
            setIsGeocoding(false)
        }
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
        <div
            className={`fullscreen-modal fixed inset-0 z-[60] bg-background ${isOpen ? 'open' : 'pointer-events-none'}`}
            style={{ visibility: isOpen ? 'visible' : 'hidden' }}
        >
            <div className="flex flex-col h-full">
                {/* Top bar */}
                <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-gold/20">
                    <h2 className="text-lg font-serif text-gold">
                        {initialData ? '店舗情報を編集' : '店舗情報を投稿'}
                    </h2>
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

                        {/* 郵便番号 + 都道府県 + 住所 */}
                        <div className="space-y-3">
                            {/* 郵便番号 */}
                            <div>
                                <label className="text-xs text-gold/60 block mb-1.5">郵便番号</label>
                                <input
                                    name="postalCode"
                                    value={formData.postalCode}
                                    onChange={handlePostalCodeChange}
                                    placeholder="例: 101-0021 (住所が自動入力されます)"
                                    className="w-full h-11 rounded-lg border border-white/10 bg-white/5 px-4 text-sm text-gold-light placeholder:text-neutral-500 outline-none focus:border-gold/40 transition-colors"
                                />
                            </div>

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
                                <div className="flex flex-col">
                                    <label className="text-xs text-gold/60 block mb-1.5">住所（以降）</label>
                                    <div className="relative group/address">
                                        <input
                                            name="address"
                                            value={formData.address}
                                            onChange={handleChange}
                                            placeholder="市区町村、番地"
                                            className="w-full h-11 rounded-lg border border-white/10 bg-white/5 pl-4 pr-12 text-sm text-gold-light placeholder:text-neutral-500 outline-none focus:border-gold/40 transition-colors"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleGeocode}
                                            disabled={isGeocoding}
                                            title="住所から座標を取得"
                                            className="absolute right-1 top-1 bottom-1 px-3 rounded-md bg-gold/10 hover:bg-gold/20 text-gold transition-colors flex items-center justify-center disabled:opacity-50"
                                        >
                                            {isGeocoding ? (
                                                <div className="w-4 h-4 border-2 border-gold/20 border-t-gold animate-spin rounded-full" />
                                            ) : (
                                                <MapPin size={16} />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <p className="text-[10px] text-neutral-500">
                                ※ 郵便番号を入力すると住所が自動補完されます。
                                <br />
                                ※ ピンアイコンを押すと、入力された情報から座標を再取得します。
                            </p>
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
                        {initialData ? '変更を保存する' : '審査リクエストを送信'}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default SubmissionForm
