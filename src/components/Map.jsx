import React, { useEffect, useRef, useCallback } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

const Map = ({ center, markers, onMarkerClick, onMapClick }) => {
    const mapContainer = useRef(null)
    const map = useRef(null)
    const markersRef = useRef([])
    // Use ref to always have the latest callback without re-creating markers
    const onMarkerClickRef = useRef(onMarkerClick)
    onMarkerClickRef.current = onMarkerClick

    // Initialize map
    useEffect(() => {
        if (map.current) return

        map.current = new maplibregl.Map({
            container: mapContainer.current,
            style: 'https://tile.openstreetmap.jp/styles/osm-bright-ja/style.json',
            center: [139.767, 35.681],
            zoom: 10,
            attributionControl: false
        })

        map.current.addControl(new maplibregl.NavigationControl(), 'top-right')
        map.current.addControl(new maplibregl.AttributionControl({ compact: true }))

        map.current.on('click', (e) => {
            if (onMapClick) {
                onMapClick(e.lngLat)
            }
        })
    }, [])

    // Fly to center when it changes
    useEffect(() => {
        if (!map.current || !center) return
        map.current.flyTo({ center, zoom: 14 })
    }, [center])

    // Update markers when data changes
    useEffect(() => {
        if (!map.current) return

        // Remove old markers
        markersRef.current.forEach(m => m.remove())
        markersRef.current = []

        if (!markers || markers.length === 0) return

        markers.forEach((storeData) => {
            // Create simple gold circle pin
            const el = document.createElement('div')
            el.className = 'gold-pin'

            // Click handler using ref for always-fresh callback
            el.addEventListener('click', (e) => {
                e.stopPropagation()
                e.preventDefault()
                if (onMarkerClickRef.current) {
                    onMarkerClickRef.current(storeData)
                }
            })

            const m = new maplibregl.Marker({ element: el })
                .setLngLat([storeData.longitude, storeData.latitude])
                .addTo(map.current)

            markersRef.current.push(m)
        })
    }, [markers]) // Only re-run when markers data changes, NOT when callback changes

    return (
        <div className="w-full h-full">
            <div ref={mapContainer} className="w-full h-full" />
        </div>
    )
}

export default Map
