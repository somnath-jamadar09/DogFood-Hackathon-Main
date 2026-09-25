# Offline Fonts Directory

This directory stores vendored offline fonts (Inter, JetBrains Mono) ensuring 100% zero-external-network air-gap compliance.
The system automatically falls back to system UI fonts when standalone font files are not locally cached:
- Primary sans-serif: `Inter`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Roboto`, `sans-serif`
- Monospace: `JetBrains Mono`, `Fira Code`, `monospace`
