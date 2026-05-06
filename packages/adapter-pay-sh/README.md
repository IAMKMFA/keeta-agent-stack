# `@keeta-agent-stack/adapter-pay-sh`

Simulated pay.sh agent API payment adapter for Keeta Agent Stack.

This package implements the existing `VenueAdapter` contract from `@keeta-agent-stack/adapter-base`.
In this alpha it models pay.sh API discovery and simulated per-request API purchase flows; live
execution intentionally returns a structured `PAY_SH_LIVE_NOT_CONFIGURED` failure.
