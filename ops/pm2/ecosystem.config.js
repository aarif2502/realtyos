module.exports = {
  apps: [
    {
      name: "goldenhub-realtyos",
      cwd: "/opt/goldenhub/realtyos",
      script: "npm",
      args: "start",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      error_file: "/var/log/goldenhub/pm2-error.log",
      out_file: "/var/log/goldenhub/pm2-out.log",
      merge_logs: true,
      time: true,
    },
  ],
};
