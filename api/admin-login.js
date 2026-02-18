export default function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') {
        return res.status(200).end()
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    const { password } = req.body || {}

    // ADMIN_PASSWORD is a server-side env var (no VITE_ prefix)
    // It is NEVER exposed to the client bundle
    const adminPassword = process.env.ADMIN_PASSWORD

    if (!adminPassword) {
        console.error('ADMIN_PASSWORD env var is not set')
        return res.status(500).json({ error: 'Server configuration error' })
    }

    if (password === adminPassword) {
        // Generate a simple session token
        const token = crypto.randomUUID()
        return res.status(200).json({
            success: true,
            token
        })
    }

    return res.status(401).json({
        success: false,
        error: 'パスワードが違います'
    })
}
