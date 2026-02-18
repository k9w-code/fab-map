import React, { useState, useEffect, useCallback } from 'react'
import { Search, Plus, Crosshair, Settings } from 'lucide-react'
import Map from './components/Map'
import StoreBottomSheet from './components/StoreBottomSheet'
import SubmissionForm from './components/SubmissionForm'
import AdminView from './components/AdminView'
import { supabase } from './lib/supabaseClient'

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

    // Filter logic
    useEffect(() => {
        let result = stores
        if (searchTerm) {
            result = result.filter(s =>
                s.name.toLowerCase().includes(searchTerm.toLowerCase())
            )
        }
        if (selectedPrefecture !== 'すべて') {
            result = result.filter(s => s.prefecture === selectedPrefecture)
        }
        setFilteredStores(result)
    }, [searchTerm, selectedPrefecture, stores])

    // Handlers
    const handleMarkerClick = useCallback((store) => {
        setSelectedStore(store)
        setIsSheetOpen(true)
    }, [])

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
        const { error } = await supabase
            .from('stores')
            .insert([{
                ...formData,
                status: 'pending',
                source_type: 'community'
            }])

        if (error) {
            alert('送信に失敗しました: ' + error.message)
        } else {
            alert('投稿ありがとうございます。管理者の承認をお待ちください。')
            setIsFormOpen(false)
        }
    }

    // Admin view
    if (isAdminView) {
        return <AdminView onBack={() => window.location.hash = ''} />
    }

    return (
        <div className="flex flex-col h-full bg-background">
            {/* ===== HEADER (fixed height, pushes map down) ===== */}
            <header className="shrink-0 bg-card/90 backdrop-blur-lg border-b border-gold/20 px-4 py-3 z-20">
                {/* Title row */}
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

                {/* Search input */}
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

                {/* Prefecture filter - simple dropdown only */}
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

            {/* ===== MAP (fills remaining space) ===== */}
            <main className="flex-1 relative min-h-0">
                <Map
                    center={userLocation}
                    markers={filteredStores}
                    onMarkerClick={handleMarkerClick}
                    onMapClick={handleMapClick}
                />

                {/* Floating Controls */}
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

            {/* ===== BOTTOM SHEET ===== */}
            <StoreBottomSheet
                store={selectedStore}
                isOpen={isSheetOpen}
                onClose={() => setIsSheetOpen(false)}
                onEdit={(store) => {
                    setIsSheetOpen(false)
                    setClickedLocation({ lat: store.latitude, lng: store.longitude })
                    setIsFormOpen(true)
                }}
            />

            {/* ===== SUBMISSION FORM (Full Screen Modal) ===== */}
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
