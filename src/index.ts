import { Hono } from 'hono'
import { loadReferences, isReady, knn } from './search'
import { vectorize } from './vectorize'
import type { FraudScoreRequest, FraudScoreResponse } from './types'

const app = new Hono()

loadReferences()

app.get('/ready', (c) => {
    return isReady ? c.text('OK', 200) : c.text('Loading', 503)
})

app.post('/fraud-score', async (c) => {
    if (!isReady) {
        return c.json({ error: "Service Unavailable" }, 503)
    }

    try {
        const body = await c.req.json<FraudScoreRequest>()
        const vector = vectorize(body)
        const neighbors = knn(vector, 5)
        
        const fraudCount = neighbors.filter(n => n.label === 'fraud').length
        const fraud_score = fraudCount / 5
        const approved = fraud_score < 0.6
        
        const response: FraudScoreResponse = { approved, fraud_score }
        return c.json(response)
    } catch (e) {
        return c.json({ error: "Internal Server Error" }, 500)
    }
})

export default app
