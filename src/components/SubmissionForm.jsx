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
        postal_code: '',
        prefecture: '',
        city_town: '',
        address_line1: '',
        address_line2: '',
        latitude: 35.681,
        longitude: 139.767,
        fab_available: false,
        armory_available: false,
        format_text: '',
        notes: '',
        submitter_id: ''
    })
    const [isGeocoding, setIsGeocoding] = useState(false)

    // Load or generate Submitter ID
    useEffect(() => {
        let sid = localStorage.getItem('fab_map_submitter_id')
        if (!sid) {
            sid = crypto.randomUUID()
            localStorage.setItem('fab_map_submitter_id', sid)
        }
        setFormData(prev => ({ ...prev, submitter_id: sid }))
    }, [])

    useEffect(() => {
        const sid = localStorage.getItem('fab_map_submitter_id') || ''

        const loadInitial = async () => {
            if (initialData) {
                const prefecture = initialData.prefecture || ''
                let cityTown = initialData.city_town || ''
                let streetAddr = initialData.address_line1 || ''
                let buildingInfo = initialData.address_line2 || ''

                // Fallback: If new columns are empty, try to parse from legacy 'address' column
                if (!cityTown && !streetAddr && initialData.address) {
                    let rawAddr = initialData.address

                    // 1. Separate building info if a space exists (handles "CityStreet Building")
                    const spaceIndex = rawAddr.lastIndexOf(' ')
                    if (spaceIndex !== -1) {
                        buildingInfo = rawAddr.substring(spaceIndex + 1).trim()
                        streetAddr = rawAddr.substring(0, spaceIndex).trim()
                    } else {
                        streetAddr = rawAddr
                    }

                    // 2. Fetch official city/town if postal code exists to help cleaning
                    if (initialData.postal_code) {
                        try {
                            const response = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${initialData.postal_code}`)
                            const data = await response.json()
                            if (data.results && data.results[0]) {
                                const { address2, address3 } = data.results[0]
                                cityTown = `${address2}${address3}`

                                // Aggressively strip prefecture and cityTown from the start of streetAddr
                                while (streetAddr.startsWith(prefecture) && prefecture.length > 0) {
                                    streetAddr = streetAddr.substring(prefecture.length).trim()
                                }
                                while (streetAddr.startsWith(cityTown) && cityTown.length > 0) {
                                    streetAddr = streetAddr.substring(cityTown.length).trim()
                                }
                            }
                        } catch (error) {
                            console.error('Initial address split error:', error)
                        }
                    }
                }

                setFormData({
                    ...initialData,
                    name: initialData.name || '',
                    postal_code: initialData.postal_code || '',
                    prefecture: prefecture,
                    city_town: cityTown,
                    address_line1: streetAddr,
                    address_line2: buildingInfo,
                    latitude: initialData.latitude || 35.681,
                    longitude: initialData.longitude || 139.767,
                    fab_available: !!initialData.fab_available,
                    armory_available: !!initialData.armory_available,
                    format_text: initialData.format_text || '',
                    notes: initialData.notes || '',
                    submitter_id: initialData.submitter_id || sid
                })
            }
            else if (initialLocation) {
                setFormData(prev => ({
                    ...prev,
                    latitude: initialLocation.lat,
                    longitude: initialLocation.lng,
                    submitter_id: sid
                }))
            } else if (!isOpen) {
                // Reset form
                setFormData({
                    name: '',
                    postal_code: '',
                    prefecture: '',
                    city_town: '',
                    address_line1: '',
                    address_line2: '',
                    latitude: 35.681,
                    longitude: 139.767,
                    fab_available: false,
                    armory_available: false,
                    format_text: '',
                    notes: '',
                    submitter_id: sid
                })
            }
        }

        loadInitial()
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
        setFormData(prev => ({ ...prev, postal_code: value }))

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
                        city_town: `${address2}${address3}`,
                        address_line1: '' // Clear street for new entry
                    }))
                }
            } catch (error) {
                console.error('Postal code search error:', error)
            }
        }
    }

    // Shared Geocoding Logic - Uses GSI (国土地理院) API as primary, Nominatim as fallback
    const performGeocoding = async (params) => {
        const { prefecture, cityTown, street, postal_code, address_line2 } = params

        const toHalfWidth = (str) => {
            if (!str) return ''
            return str.replace(/[！-～]/g, (s) => {
                return String.fromCharCode(s.charCodeAt(0) - 0xFEE0)
            }).replace(/　/g, ' ')
        }

        const normalizedStreet = toHalfWidth(street)

        // --- Primary: GSI (国土地理院) API ---
        // https://msearch.gsi.go.jp/address-search/AddressSearch
        // Accurate to street/block level for Japanese addresses
        const searchGSI = async (q) => {
            console.log('Trying GSI search:', q)
            try {
                const response = await fetch(
                    `https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encodeURIComponent(q)}`
                )
                const data = await response.json()
                if (data && data.length > 0) {
                    // GSI returns GeoJSON features with [lng, lat] coordinates
                    const feature = data[0]
                    const [lon, lat] = feature.geometry.coordinates
                    return {
                        lat: lat.toString(),
                        lon: lon.toString(),
                        display_name: feature.properties.title || q
                    }
                }
            } catch (error) {
                console.error('GSI search error:', error)
            }
            return null
        }

        // Build GSI query strings (simple concatenation works best)
        const gsiQueries = []
        if (prefecture && cityTown && normalizedStreet) {
            // Full address: "東京都千代田区神田須田町1-7-1"
            gsiQueries.push(`${prefecture}${cityTown}${normalizedStreet}`)
            // With 丁目 notation: "東京都千代田区神田須田町1丁目7-1"
            if (normalizedStreet.match(/^\d+-\d+(-\d+)?$/)) {
                const chomeStreet = normalizedStreet.replace(/^(\d+)-/, '$1丁目')
                gsiQueries.push(`${prefecture}${cityTown}${chomeStreet}`)
            }
        }
        if (prefecture && cityTown) {
            gsiQueries.push(`${prefecture}${cityTown}`)
        }

        // Try GSI first
        for (const q of gsiQueries) {
            const result = await searchGSI(q)
            if (result) return result
        }

        // --- Fallback: Nominatim (for edge cases / non-Japanese addresses) ---
        const searchNominatim = async (q) => {
            console.log('Trying Nominatim fallback:', q)
            try {
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`,
                    {
                        headers: {
                            'Accept-Language': 'ja',
                            'User-Agent': 'FaB-Map-App'
                        }
                    }
                )
                const data = await response.json()
                if (data && data.length > 0) return data[0]
            } catch (error) {
                console.error('Nominatim search error:', error)
            }
            return null
        }

        const nominatimQueries = []
        if (prefecture && cityTown && normalizedStreet) {
            nominatimQueries.push(`${prefecture} ${cityTown} ${normalizedStreet}`)
        }
        if (prefecture && cityTown) {
            nominatimQueries.push(`${prefecture} ${cityTown}`)
        }
        if (postal_code) {
            nominatimQueries.push(postal_code)
        }

        for (const q of nominatimQueries) {
            const result = await searchNominatim(q)
            if (result) return result
        }

        return null
    }

    const handleGeocode = async () => {
        if (!formData.prefecture && !formData.postal_code) {
            alert('郵便番号、または都道府県と住所を入力してください')
            return
        }

        setIsGeocoding(true)

        try {
            const result = await performGeocoding({
                prefecture: formData.prefecture,
                cityTown: formData.city_town || '',
                street: formData.address_line1 || '',
                postal_code: formData.postal_code,
                address_line2: formData.address_line2
            })

            if (result) {
                const { lat, lon } = result
                setFormData(prev => ({
                    ...prev,
                    latitude: parseFloat(lat),
                    longitude: parseFloat(lon)
                }))
                // Use substring to avoid too long messages
                alert(`位置を取得しました: ${result.display_name.substring(0, 50)}...\n※正確でない場合は手動で位置を修正してください。`)
                console.log('Geocoding success:', result)
            }
            else {
                alert('住所から位置を特定できませんでした。\n「地図上で位置を修正」ボタンから手動で設定してください。')
            }
        } catch (error) {
            console.error('Geocoding error:', error)
            alert('位置情報の取得中にエラーが発生しました')
        } finally {
            setIsGeocoding(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!formData.name || !formData.prefecture) {
            alert('店舗名と都道府県は必須です')
            return
        }

        let finalLatitude = formData.latitude
        let finalLongitude = formData.longitude

        const isDefaultLocation =
            Math.abs(formData.latitude - 35.681) < 0.0001 &&
            Math.abs(formData.longitude - 139.767) < 0.0001

        // Auto-geocode if coordinates are still at default Tokyo Station

        // Force auto-geocode if location is default and we have address data
        if (isDefaultLocation && formData.prefecture) {
            // Show a non-blocking toast or just log? 
            // Since we can't show toast easily without UI lib, we just proceed.
            // We'll use a blocking loading state if needed, but for now await is fine.
            try {
                const result = await performGeocoding({
                    prefecture: formData.prefecture,
                    cityTown: formData.city_town || '',
                    street: formData.address_line1 || '',
                    postal_code: formData.postal_code,
                    address_line2: formData.address_line2
                })

                if (result) {
                    finalLatitude = parseFloat(result.lat)
                    finalLongitude = parseFloat(result.lon)
                    // console.log('Auto-geocoded to:', finalLatitude, finalLongitude)
                } else {
                    // Only alert if we REALLY can't find anything AND the user hasn't set a pin
                    const proceed = window.confirm('住所から位置を特定できませんでした。\n現在の位置（東京駅）のまま登録しますか？\n\nキャンセルして地図上で位置を修正する場合は「キャンセル」を押してください。')
                    if (!proceed) return
                }

            } catch (error) {
                console.error("Auto-geocode error", error)
                // If error, just list user know or proceed?
                // Better to let them know.
                alert('位置情報の自動取得に失敗しました。')
                return
            }
        }

        const fullAddress = `${formData.city_town || ''} ${formData.address_line1 || ''} ${formData.address_line2 || ''}`.replace(/\s+/g, ' ').trim()

        const submissionPayload = {
            ...formData,
            latitude: finalLatitude,
            longitude: finalLongitude,
            address: fullAddress,
        }

        onSubmit(submissionPayload)
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
                            <div>
                                <label className="text-xs text-gold/60 block mb-1.5">郵便番号</label>
                                <input
                                    name="postal_code"
                                    value={formData.postal_code}
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
                                <div>
                                    <label className="text-xs text-gold/60 block mb-1.5">市区町村（自動入力）</label>
                                    <input
                                        name="city_town"
                                        value={formData.city_town}
                                        onChange={handleChange}
                                        placeholder="千代田区外神田"
                                        className={`w-full h-11 rounded-lg border border-white/10 bg-white/5 px-4 text-sm text-gold-light opacity-80 outline-none focus:border-gold/40 transition-colors`}
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col">
                                <label className="text-xs text-gold/60 block mb-1.5">番地（必須）</label>
                                <div className="relative group/address">
                                    <input
                                        name="address_line1"
                                        value={formData.address_line1}
                                        onChange={handleChange}
                                        placeholder="例: 1-6-3"
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
                                <p className="text-[10px] text-neutral-500 mt-1">
                                    例: 1-2-3 ※すべて半角数字とハイフンで入力してください
                                </p>
                            </div>

                            <div>
                                <label className="text-xs text-gold/60 block mb-1.5">建物名・部屋番号（任意）</label>
                                <input
                                    name="address_line2"
                                    value={formData.address_line2}
                                    onChange={handleChange}
                                    placeholder="例: アキバプレイス 4F"
                                    className="w-full h-11 rounded-lg border border-white/10 bg-white/5 px-4 text-sm text-gold-light placeholder:text-neutral-500 outline-none focus:border-gold/40 transition-colors"
                                />
                                <p className="text-[10px] text-neutral-500 mt-1">
                                    ※ 建物名は地図検索には使用されません。
                                </p>
                            </div>

                            <p className="text-[10px] text-neutral-500">
                                ※ 郵便番号を入力すると市区町村まで自動入力されます。
                                <br />
                                ※ ピンアイコンを押すと、入力された情報（市区町村＋番地）から座標を再取得します。
                            </p>
                        </div>

                        {/* 座標情報 + 地図修正ボタン */}
                        <div className="bg-white/5 p-3 rounded-lg border border-white/5 flex items-center justify-between">
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2 text-xs text-gold/60">
                                    <MapPin size={14} />
                                    <span>座標: {formData.latitude?.toFixed(5)}, {formData.longitude?.toFixed(5)}</span>
                                </div>
                                <p className="text-[10px] text-neutral-500">
                                    {isGeocoding ? '位置を検索中...' : '※ 自動設定された位置がズレている場合は手動で修正してください'}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => onSubmit({ ...formData, mode: 'pick_location' })}
                                className="px-3 py-1.5 rounded-md bg-gold/10 hover:bg-gold/20 text-xs text-gold border border-gold/30 transition-colors"
                            >
                                地図上で位置を修正
                            </button>
                        </div>

                        {/* checkbox and other inputs remain same... */}
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
