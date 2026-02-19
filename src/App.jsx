import React, { useState, useEffect, useCallback } from 'react'
import { Search, Plus, Crosshair, Settings, Navigation2, Heart } from 'lucide-react'
import Map from './components/Map'
import StoreBottomSheet from './components/StoreBottomSheet'
import SubmissionForm from './components/SubmissionForm'
import AdminView from './components/AdminView'
import ErrorBoundary from './components/ErrorBoundary'
import { supabase, isSupabaseConfigured } from './lib/supabaseClient'
import { calculateDistance } from './lib/utils'

const PREFECTURES = [
    "すべて", "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
    "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
    "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県",
    "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府", "兵庫県",
    "奈良県", "和歌山県", "鳥取県", "島根県", "岡山県", "広島県", "山口県",
    "徳島県", "香川県", "愛媛県", "高知県", "福岡県", "佐賀県", "長崎県",
    "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県"
]

function App() {
    const [stores, setStores] = useState([])
    const [filteredStores, setFilteredStores] = useState([])
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedPrefecture, setSelectedPrefecture] = useState('すべて')
    const [selectedStore, setSelectedStore] = useState(null)
    const [isSheetOpen, setIsSheetOpen] = useState(false)
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [isAdminView, setIsAdminView] = useState(false)
    const [userLocation, setUserLocation] = useState(null)
    const [clickedLocation, setClickedLocation] = useState(null)

    // Favorites (localStorage)
    const [favorites, setFavorites] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('fab_favorites') || '[]')
        } catch { return [] }
    })

    const toggleFavorite = useCallback((storeId) => {
        setFavorites(prev => {
            let next
            if (prev.includes(storeId)) {
                next = prev.filter(id => id !== storeId)
            } else {
                if (prev.length >= 3) {
                    alert('お気に入りは最大3件までです。\n既存のお気に入りを解除してから追加してください。')
                    return prev
                }
                next = [...prev, storeId]
            }
            localStorage.setItem('fab_favorites', JSON.stringify(next))
            return next
        })
    }, [])

    // Admin hash routing
    useEffect(() => {
        const handleHashChange = () => {
            setIsAdminView(window.location.hash === '#admin')
        }
        window.addEventListener('hashchange', handleHashChange)
        handleHashChange()
        return () => window.removeEventListener('hashchange', handleHashChange)
    }, [])

    // Fetch stores from Supabase
    const fetchStores = useCallback(async () => {
        if (!isSupabaseConfigured || !supabase) {
            console.warn('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
            return
        }
        try {
            const { data, error } = await supabase
                .from('stores')
                .select('*')
                .eq('status', 'approved')

            if (error) {
                console.error('Error fetching stores:', error)
            } else {
                setStores(data || [])
                setFilteredStores(data || [])
            }
        } catch (err) {
            console.error('Fetch error:', err)
        }
    }, [])

    useEffect(() => {
        fetchStores()
    }, [fetchStores])

    // Geolocation
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setUserLocation([pos.coords.longitude, pos.coords.latitude]),
                () => setUserLocation([139.767, 35.681])
            )
        } else {
            setUserLocation([139.767, 35.681])
        }
    }, [])

    // Filter and Sort logic
    useEffect(() => {
        let result = [...stores]

        // 1. Filter
        if (searchTerm) {
            result = result.filter(s =>
                s.name.toLowerCase().includes(searchTerm.toLowerCase())
            )
        }
        if (selectedPrefecture !== 'すべて') {
            result = result.filter(s => s.prefecture === selectedPrefecture)
        }

        // 2. Add distance and Sort
        if (userLocation) {
            const [uLng, uLat] = userLocation
            result = result.map(s => ({
                ...s,
                distance: calculateDistance(uLat, uLng, s.latitude, s.longitude)
            }))
            result.sort((a, b) => a.distance - b.distance)
        }

        setFilteredStores(result)
    }, [searchTerm, selectedPrefecture, stores, userLocation])

    // Handlers
    const handleMarkerClick = useCallback((store) => {
        setSelectedStore(store)
        setIsSheetOpen(true)
    }, [])

    const handleJumpToStore = (store) => {
        setSelectedStore(store)
        setUserLocation([store.longitude, store.latitude])
        setIsSheetOpen(true)
    }

    const handleMapClick = useCallback((lngLat) => {
        setClickedLocation(lngLat)
    }, [])

    const recenterMap = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setUserLocation([pos.coords.longitude, pos.coords.latitude]),
                () => { }
            )
        }
    }

    const handleSubmission = async (formData) => {
        if (!isSupabaseConfigured || !supabase) {
            alert('データベースが設定されていません。管理者にお問い合わせください。')
            return
        }

        // Filter out non-existent columns
        const validColumns = [
            'name', 'prefecture', 'address', 'latitude', 'longitude',
            'fab_available', 'armory_available', 'format_text', 'notes',
            'submitter_id', 'postal_code', 'city_town', 'address_line1', 'address_line2'
        ]

        const cleanData = {}
        validColumns.forEach(col => {
            if (formData[col] !== undefined) {
                cleanData[col] = formData[col]
            }
        })

        try {
            const { error } = await supabase
                .from('stores')
                .insert([{
                    ...cleanData,
                    status: 'pending',
                    source_type: 'community'
                }])

            if (error) {
                console.error('Submission error object:', error)
                alert(`送信に失敗しました: ${error.message} (Code: ${error.code})`)
            } else {
                alert('投稿ありがとうございます。管理者の承認をお待ちください。')
                setIsFormOpen(false)
            }
        } catch (err) {
            console.error('Fatal submission error:', err)
            alert(`予期せぬエラーが発生しました: ${err.message}`)
        }
    }

    // Admin view
    if (isAdminView) {
        return (
            <ErrorBoundary>
                <AdminView
                    onBack={() => {
                        window.location.hash = ''
                        fetchStores()
                    }}
                    clickedLocation={clickedLocation}
                />
            </ErrorBoundary>
        )
        )
    }

    return (
        <div className="flex flex-col h-full bg-background overflow-hidden text-gold-light">
            {/* ===== HEADER ===== */}
            <header className="shrink-0 bg-card/90 backdrop-blur-lg border-b border-gold/20 px-4 py-3 z-30">
                <div className="flex items-center justify-between mb-2">
                    <h1 className="text-lg font-serif text-gold tracking-widest drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]">
                        FaB Map
                    </h1>
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] text-gold/50">
                            {filteredStores.length} 店舗
                        </span>
                        <button
                            onClick={() => window.location.hash = '#admin'}
                            className="opacity-20 hover:opacity-100 transition-opacity"
                        >
                            <Settings size={16} className="text-gold" />
                        </button>
                    </div>
                </div>

                <div className="relative mb-2">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                        <Search size={16} className="text-gold/40" />
                    </div>
                    <input
                        type="text"
                        placeholder="店舗名を検索..."
                        className="w-full h-9 pl-9 pr-20 rounded-lg border border-white/10 bg-white/5 text-sm text-gold-light placeholder:text-neutral-500 outline-none focus:border-gold/40 transition-colors"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <div className="absolute inset-y-0 right-3 flex items-center">
                            <span className="text-[10px] text-gold/50">{filteredStores.length}件</span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <select
                        className="flex-1 h-8 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-gold-light outline-none focus:border-gold/40 transition-colors"
                        value={selectedPrefecture}
                        onChange={(e) => setSelectedPrefecture(e.target.value)}
                    >
                        <option value="すべて">すべての都道府県</option>
                        {PREFECTURES.slice(1).map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>
            </header>

            {/* ===== FAVORITES (Always visible) ===== */}
            {favorites.length > 0 && (
                <div className="shrink-0 bg-gradient-to-b from-gold/5 to-transparent border-b border-gold/10 py-2.5 z-20">
                    <div className="flex items-center gap-1.5 px-4 mb-2">
                        <Heart size={12} className="text-rose-400 fill-rose-400" />
                        <span className="text-[10px] text-gold/60 font-semibold tracking-wider">お気に入り</span>
                    </div>
                    <div className="flex gap-3 overflow-x-auto px-4 no-scrollbar">
                        {favorites.map(fId => {
                            const fStore = stores.find(s => s.id === fId)
                            if (!fStore) return null
                            return (
                                <button
                                    key={fStore.id}
                                    onClick={() => handleJumpToStore(fStore)}
                                    className="shrink-0 w-44 p-2.5 rounded-xl bg-card border border-gold/30 flex flex-col items-start gap-1 active:scale-95 transition-all text-left group hover:border-gold/50 relative"
                                >
                                    <Heart size={12} className="absolute top-2 right-2 text-rose-400 fill-rose-400" />
                                    <span className="text-xs font-bold text-gold truncate w-full pr-5 group-hover:text-gold-light">
                                        {fStore.name}
                                    </span>
                                    <span className="text-[10px] text-neutral-400 truncate w-full">
                                        {fStore.prefecture}
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* ===== LIST VIEW (Horizontal scroll) ===== */}
            {(searchTerm || selectedPrefecture !== 'すべて') && filteredStores.length > 0 && (
                <div className="shrink-0 bg-background/50 backdrop-blur-sm border-b border-gold/10 py-3 z-20">
                    <div className="flex gap-3 overflow-x-auto px-4 no-scrollbar">
                        {filteredStores.map(store => (
                            <button
                                key={store.id}
                                onClick={() => handleJumpToStore(store)}
                                className="shrink-0 w-48 p-3 rounded-xl bg-card border border-gold/20 flex flex-col items-start gap-1 active:scale-95 transition-all text-left group hover:border-gold/50"
                            >
                                <span className="text-xs font-bold text-gold truncate w-full group-hover:text-gold-light">
                                    {store.name}
                                </span>
                                <div className="flex items-center gap-1.5 w-full">
                                    <span className="text-[10px] text-neutral-400 truncate flex-1">
                                        {store.prefecture} {store.address?.split(' ')[0]}
                                    </span>
                                    {store.distance !== undefined && (
                                        <span className="text-[10px] text-gold/60 font-mono whitespace-nowrap">
                                            {store.distance < 1 ?
                                                `${(store.distance * 1000).toFixed(0)}m` :
                                                `${store.distance.toFixed(1)}km`
                                            }
                                        </span>
                                    )}
                                </div>
                                <div className="mt-1 flex items-center gap-1 text-[9px] text-gold/40">
                                    <Navigation2 size={10} />
                                    <span>地図で表示</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* ===== MAP ===== */}
            <main className="flex-1 relative min-h-0">
                <Map
                    center={userLocation}
                    markers={filteredStores}
                    onMarkerClick={handleMarkerClick}
                    onMapClick={handleMapClick}
                />

                <button
                    onClick={recenterMap}
                    className="absolute bottom-24 left-4 z-10 w-11 h-11 rounded-full bg-card/80 backdrop-blur-lg border border-gold/20 flex items-center justify-center text-gold hover:bg-card transition-colors active:scale-95"
                >
                    <Crosshair size={20} />
                </button>

                <button
                    onClick={() => setIsFormOpen(true)}
                    className="absolute bottom-24 right-4 z-10 w-14 h-14 rounded-2xl bg-gold text-black flex items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:bg-gold-dark transition-colors active:scale-95"
                >
                    <Plus size={28} />
                </button>
            </main>

            <ErrorBoundary>
                <StoreBottomSheet
                    store={selectedStore}
                    isOpen={isSheetOpen}
                    onClose={() => setIsSheetOpen(false)}
                    onEdit={(store) => {
                        setIsSheetOpen(false)
                        setClickedLocation({ lat: store.latitude, lng: store.longitude })
                        setIsFormOpen(true)
                    }}
                    favorites={favorites}
                    onToggleFavorite={toggleFavorite}
                />
            </ErrorBoundary>

            <SubmissionForm
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSubmit={handleSubmission}
                initialLocation={clickedLocation}
            />
        </div>
    )
}

export default App
