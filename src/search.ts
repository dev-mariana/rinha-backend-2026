import { Index, MetricKind, ScalarKind } from "usearch";
import fs from "fs";
import path from "path";

const indexPath = path.join(process.cwd(), "resources", "index.usearch");
const labelsPath = path.join(process.cwd(), "resources", "labels.bin");

let index: Index | null = null;
let labels: Uint8Array | null = null;

export let isReady = false;

export async function loadReferences() {
    try {
        index = new Index({
            metric: MetricKind.L2sq,
            connectivity: 4,
            dimensions: 14,
            quantization: ScalarKind.I8,
            expansion_add: 200,
            expansion_search: 32,
            multi: false
        });

        index.view(indexPath);

        const labelsBuffer = await fs.promises.readFile(labelsPath);
        labels = new Uint8Array(labelsBuffer);

        isReady = true;
        console.log(`Vector index loaded: ${index.size()} vectors`);
    } catch (error) {
        console.error("Failed to load vector index or labels:", error);
    }
}

export function knn(vector: number[], k: number): { label: 'fraud' | 'legit' }[] {
    if (!isReady || !index || !labels) {
        throw new Error("Index not loaded yet");
    }

    const vec32 = new Float32Array(vector);
    const matches = index.search(vec32, k, 0);

    const result = [];

    for (let i = 0; i < matches.keys.length; i++) {
        const id = Number(matches.keys[i]);
        const isFraud = labels[id] === 1;

        result.push({ label: isFraud ? 'fraud' : 'legit' });
    }

    return result as { label: 'fraud' | 'legit' }[];
}