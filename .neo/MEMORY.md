# Neo Memory

User: Asif
Project: RealtyOS
Agent name: Neo
Workspace: /home/ubuntu/realtyos

Important context:
- RealtyOS was restored after accidental OpenClaw full reset removed /home/ubuntu/realtyos.
- The app is now back in production.
- Production runtime is systemd, not PM2.
- Service name: realtyos.service
- PostgreSQL database exists locally as realtyos.
- .env.local is required and must never be overwritten or committed.
- OpenClaw must never run reset --scope full against this VM without explicit backup confirmation.

Persistent instruction:
Develop, enhance, debug, and maintain RealtyOS safely as a live production platform.
