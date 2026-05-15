import { FraudScoreRequest } from './types';
import mccRisk from '../resources/mcc_risk.json';

const clamp = (x: number) => Math.min(1, Math.max(0, x));

export function vectorize(req: FraudScoreRequest): number[] {
    const { transaction, customer, merchant, terminal, last_transaction } = req;

    const amount = clamp(transaction.amount / 10000);

    const installments = clamp(transaction.installments / 12);

    const amount_vs_avg = clamp((transaction.amount / customer.avg_amount) / 10);

    const date = new Date(transaction.requested_at);
    const hour_of_day = date.getUTCHours() / 23;

    const day_of_week = ((date.getUTCDay() + 6) % 7) / 6;

    let minutes_since_last_tx: number;
    let km_from_last_tx: number;

    if (last_transaction === null) {
        minutes_since_last_tx = -1;
        km_from_last_tx = -1;
    } else {
        const lastDate = new Date(last_transaction.timestamp);
        const diffMs = date.getTime() - lastDate.getTime();
        const diffMinutes = diffMs / 1000 / 60;

        minutes_since_last_tx = clamp(diffMinutes / 1440);

        km_from_last_tx = clamp(last_transaction.km_from_current / 1000);
    }

    const km_from_home = clamp(terminal.km_from_home / 1000);
    const tx_count_24h = clamp(customer.tx_count_24h / 20);
    const is_online = terminal.is_online ? 1 : 0;
    const card_present = terminal.card_present ? 1 : 0;

    const unknown_merchant = customer.known_merchants.includes(merchant.id) ? 0 : 1;
    const mcc_risk = (mccRisk as Record<string, number>)[merchant.mcc] ?? 0.5;
    const merchant_avg_amount = clamp(merchant.avg_amount / 10000);

    return [
        amount,
        installments,
        amount_vs_avg,
        hour_of_day,
        day_of_week,
        minutes_since_last_tx,
        km_from_last_tx,
        km_from_home,
        tx_count_24h,
        is_online,
        card_present,
        unknown_merchant,
        mcc_risk,
        merchant_avg_amount,
    ];
}
