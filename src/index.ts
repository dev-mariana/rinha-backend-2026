import { Hono } from 'hono'
import { loadReferences, isReady } from './search'

const app = new Hono()

loadReferences()

app.get('/ready', (c) => {
    return isReady ? c.text('OK', 200) : c.text('Loading', 503)
})

export default app
