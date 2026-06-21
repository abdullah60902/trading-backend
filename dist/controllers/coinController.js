"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCoinData = void 0;
// Simple in-memory cache to avoid rate limits from public APIs
const cache = {
    data: null,
    lastFetch: 0,
};
const getCoinData = async (req, res) => {
    try {
        const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache
        if (cache.data && (Date.now() - cache.lastFetch) < CACHE_TTL) {
            res.status(200).json(cache.data);
            return;
        }
        // Since we don't have axios installed by default in this template, we use native fetch (Node 18+)
        // We'll fetch top 10 coins from CoinGecko
        const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=true');
        if (!response.ok) {
            // If rate limited, fallback to mock data
            throw new Error('CoinGecko API rate limit reached');
        }
        const data = await response.json();
        cache.data = data;
        cache.lastFetch = Date.now();
        res.status(200).json(data);
    }
    catch (error) {
        console.error('Coin API error:', error);
        // Return mock data for the chart if the API fails (e.g. rate limits)
        res.status(200).json([
            {
                id: "bitcoin",
                symbol: "btc",
                name: "Bitcoin",
                current_price: 65000,
                price_change_percentage_24h: 2.5,
                sparkline_in_7d: { price: Array.from({ length: 168 }, () => 64000 + Math.random() * 2000) }
            },
            {
                id: "ethereum",
                symbol: "eth",
                name: "Ethereum",
                current_price: 3500,
                price_change_percentage_24h: 1.2,
                sparkline_in_7d: { price: Array.from({ length: 168 }, () => 3400 + Math.random() * 200) }
            }
        ]);
    }
};
exports.getCoinData = getCoinData;
