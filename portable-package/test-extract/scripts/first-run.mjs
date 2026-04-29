import { spawnSync } from "node:child_process";

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log("Running database migration...");
run("npm", ["run", "db:migrate"]);

console.log("Ensuring admin account...");
run("npm", ["run", "db:bootstrap-admin"]);

console.log("First-run setup complete.");
