require('dotenv').config()
require('ts-node/register/transpile-only')

const express = require('express')
const cookieParser = require('cookie-parser')
const cors = require('cors')

const authRoutes = require('./src/routes/auth').default

const app = express()

app.use(express.json())
app.use(cookieParser())

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
}))

app.get('/health', (req, res) => res.json({ ok: true }))

app.use('/api/auth', authRoutes)

const port = process.env.PORT || 3001
app.listen(port, () => console.log(`Server listening on http://localhost:${port}`))
