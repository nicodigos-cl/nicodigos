import { execSync } from "node:child_process";
import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const LOCK_PATH = join(process.cwd(), ".next/dev/lock");

type DevLockInfo = {
  pid?: number;
  port?: number;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readDevLock(): DevLockInfo | null {
  if (!existsSync(LOCK_PATH)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(LOCK_PATH, "utf8")) as DevLockInfo;
  } catch {
    return null;
  }
}

function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function stopProcess(pid: number) {
  try {
    process.kill(pid, "SIGTERM");
  } catch {
    return;
  }
}

async function waitForProcessExit(pid: number, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (!isProcessRunning(pid)) {
      return true;
    }
    await sleep(200);
  }

  if (isProcessRunning(pid)) {
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      // ignore
    }
  }

  return !isProcessRunning(pid);
}

function removeStaleLock() {
  if (existsSync(LOCK_PATH)) {
    unlinkSync(LOCK_PATH);
  }
}

function getPortOwnerPid(port: number): number | null {
  try {
    const output = execSync(`ss -ltnp 'sport = :${port}'`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const match = output.match(/pid=(\d+)/);
    return match ? Number.parseInt(match[1], 10) : null;
  } catch {
    return null;
  }
}

export async function ensureDevPortFree(port = 3000): Promise<void> {
  const lock = readDevLock();

  if (lock?.pid && isProcessRunning(lock.pid)) {
    console.log(
      `[dev] Deteniendo next dev anterior (PID ${lock.pid}, puerto ${lock.port ?? port})…`,
    );
    stopProcess(lock.pid);
    await waitForProcessExit(lock.pid, 4000);
  }

  removeStaleLock();

  const ownerPid = getPortOwnerPid(port);
  if (ownerPid && isProcessRunning(ownerPid)) {
    throw new Error(
      `El puerto ${port} sigue en uso por PID ${ownerPid}. Detén ese proceso antes de continuar (kill ${ownerPid}).`,
    );
  }
}
