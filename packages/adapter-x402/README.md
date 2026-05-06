# `@keeta-agent-stack/adapter-x402`

Simulated x402 agent-payment rail adapter for Keeta Agent Stack.

This package implements the existing `VenueAdapter` contract from `@keeta-agent-stack/adapter-base`.
In this alpha it quotes and simulates HTTP 402-gated API payment flows; live execution intentionally
returns a structured `X402_LIVE_NOT_CONFIGURED` failure.
