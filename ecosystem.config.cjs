module.exports = {
  apps: [
    {
      name: "realtyos",
      cwd: "/home/ubuntu/realtyos",
      script: "node_modules/next/dist/bin/next",
      args: "start --port 3000",
      env_file: "/home/ubuntu/realtyos/.env.local",
      env: {
        NODE_ENV: "production"
      },
      max_restarts: 5,
      min_uptime: "10s"
    }
  ]
};
