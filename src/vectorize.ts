import type { FraudScoreRequest } from './types';
import mccRisk from '../resources/mcc_risk.json';
import norm from '../resources/normalization.json';

// clamp(x) — mantém o valor no intervalo [0.0, 1.0] conforme especificação
const clamp = (x: number) => Math.min(1, Math.max(0, x));

export function vectorize(req: FraudScoreRequest): number[] {
    const { transaction, customer, merchant, terminal, last_transaction } = req;

    // dim 0 — amount: limitar(transaction.amount / max_amount)
    const amount = clamp(transaction.amount / norm.max_amount);

    // dim 1 — installments: limitar(transaction.installments / max_installments)
    const installments = clamp(transaction.installments / norm.max_installments);

    // dim 2 — amount_vs_avg: limitar((amount / avg_amount) / amount_vs_avg_ratio)
    const amount_vs_avg = clamp((transaction.amount / customer.avg_amount) / norm.amount_vs_avg_ratio);

    // dim 3 — hour_of_day: hora UTC / 23
    const date = new Date(transaction.requested_at);
    const hour_of_day = date.getUTCHours() / 23;

    // dim 4 — day_of_week: (getUTCDay() + 6) % 7 / 6  (seg=0, dom=6)
    const day_of_week = ((date.getUTCDay() + 6) % 7) / 6;

    // dims 5 e 6 — sentinela -1 quando last_transaction é null
    let minutes_since_last_tx: number;
    let km_from_last_tx: number;

    if (last_transaction === null) {
        minutes_since_last_tx = -1;
        km_from_last_tx = -1;
    } else {
        const lastDate = new Date(last_transaction.timestamp);
        const diffMs = date.getTime() - lastDate.getTime();
        const diffMinutes = diffMs / 1000 / 60;

        // dim 5 — minutes_since_last_tx: limitar(minutos / max_minutes)
        minutes_since_last_tx = clamp(diffMinutes / norm.max_minutes);

        // dim 6 — km_from_last_tx: limitar(km / max_km)
        km_from_last_tx = clamp(last_transaction.km_from_current / norm.max_km);
    }

    // dim 7 — km_from_home: limitar(km / max_km)
    const km_from_home = clamp(terminal.km_from_home / norm.max_km);

    // dim 8 — tx_count_24h: limitar(count / max_tx_count_24h)
    const tx_count_24h = clamp(customer.tx_count_24h / norm.max_tx_count_24h);

    // dim 9 — is_online: 1 se online, 0 caso contrário
    const is_online = terminal.is_online ? 1 : 0;

    // dim 10 — card_present: 1 se presente, 0 caso contrário
    const card_present = terminal.card_present ? 1 : 0;

    // dim 11 — unknown_merchant: 1 se não está em known_merchants, 0 se está
    const unknown_merchant = customer.known_merchants.includes(merchant.id) ? 0 : 1;

    // dim 12 — mcc_risk: valor do mcc_risk.json, default 0.5
    const mcc_risk = (mccRisk as Record<string, number>)[merchant.mcc] ?? 0.5;

    // dim 13 — merchant_avg_amount: limitar(merchant.avg_amount / max_merchant_avg_amount)
    const merchant_avg_amount = clamp(merchant.avg_amount / norm.max_merchant_avg_amount);

    return [
        amount,           // 0
        installments,     // 1
        amount_vs_avg,    // 2
        hour_of_day,      // 3
        day_of_week,      // 4
        minutes_since_last_tx, // 5  (pode ser -1)
        km_from_last_tx,  // 6  (pode ser -1)
        km_from_home,     // 7
        tx_count_24h,     // 8
        is_online,        // 9
        card_present,     // 10
        unknown_merchant, // 11
        mcc_risk,         // 12
        merchant_avg_amount, // 13
    ];
}

