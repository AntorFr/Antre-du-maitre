import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { chmod, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';

import { env } from '../config/env.js';

// Pilote `claude setup-token` (binaire Claude Code embarqué par le SDK agent)
// pour générer un token OAuth d'abonnement depuis l'interface admin, sans
// terminal. Le TUI (Ink) exige un pseudo-terminal : on passe par `script(1)`
// — util-linux dans l'image Docker, BSD en dev macOS — vérifié dans l'image
// node:20-bookworm-slim (2026-08-06).

const TOKEN_PATTERN = /sk-ant-oat01-[A-Za-z0-9_-]{20,}/;
const SESSION_TTL_MS = 10 * 60 * 1_000;
const URL_TIMEOUT_MS = 30 * 1_000;
const EXCHANGE_TIMEOUT_MS = 60 * 1_000;

export type ClaudeSetupState =
  | 'starting'
  | 'awaiting-code'
  | 'exchanging'
  | 'done'
  | 'error';

// ---------------------------------------------------------------------------
// Stockage du token (fichier local, jamais renvoyé au client)
// ---------------------------------------------------------------------------

function tokenDir(): string {
  return env.NODE_ENV === 'production'
    ? '/data/claude'
    : resolve(process.cwd(), '.claude-setup');
}

function tokenFilePath(): string {
  return resolve(tokenDir(), 'oauth-token');
}

function setupConfigDir(): string {
  return resolve(tokenDir(), 'config');
}

let cachedToken: string | null | undefined;

export async function getStoredClaudeToken(): Promise<string | null> {
  if (cachedToken !== undefined) {
    return cachedToken;
  }

  try {
    const raw = await readFile(tokenFilePath(), 'utf8');
    cachedToken = raw.trim() || null;
  } catch {
    cachedToken = null;
  }

  return cachedToken;
}

export async function saveClaudeToken(token: string): Promise<void> {
  await mkdir(tokenDir(), { recursive: true });
  await writeFile(tokenFilePath(), `${token}\n`, 'utf8');
  await chmod(tokenFilePath(), 0o600);
  cachedToken = token;
}

export async function getClaudeTokenStatus(): Promise<{
  tokenPresent: boolean;
  savedAt: string | null;
}> {
  const token = await getStoredClaudeToken();

  if (!token) {
    return { tokenPresent: false, savedAt: null };
  }

  try {
    const info = await stat(tokenFilePath());
    return { tokenPresent: true, savedAt: info.mtime.toISOString() };
  } catch {
    return { tokenPresent: true, savedAt: null };
  }
}

// ---------------------------------------------------------------------------
// Session setup-token (une seule à la fois)
// ---------------------------------------------------------------------------

export interface ClaudeSetupSessionView {
  sessionId: string;
  state: ClaudeSetupState;
  authorizeUrl: string | null;
  error: string | null;
}

class ClaudeSetupSession {
  readonly id = randomUUID();
  state: ClaudeSetupState = 'starting';
  authorizeUrl: string | null = null;
  error: string | null = null;

  private child: ChildProcessWithoutNullStreams;
  private buffer = '';
  private urlWaiters: Array<() => void> = [];
  private exitWaiters: Array<() => void> = [];
  private exited = false;
  private readonly ttlTimer: NodeJS.Timeout;

  constructor() {
    const bin = resolveClaudeBinary();
    // `stty cols 500` : évite le repli de l'URL à la largeur du pseudo-tty.
    const command = `stty cols 500 2>/dev/null; "${bin}" setup-token`;
    const args =
      process.platform === 'darwin'
        ? ['-q', '/dev/null', 'sh', '-c', command]
        : ['-qec', command, '/dev/null'];

    this.child = spawn('script', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        TERM: 'xterm-256color',
        // Pas de tentative d'ouverture de navigateur dans le conteneur.
        BROWSER: '/bin/false',
        CLAUDE_CONFIG_DIR: setupConfigDir(),
      },
    });

    this.child.stdout.on('data', (chunk: Buffer) => this.onData(chunk));
    this.child.stderr.on('data', (chunk: Buffer) => this.onData(chunk));
    this.child.on('error', (error) => {
      this.fail(`Lancement impossible : ${error.message}`);
    });
    this.child.on('exit', () => {
      this.exited = true;
      void this.onExit();
    });

    this.ttlTimer = setTimeout(() => {
      this.fail('Session expirée (10 min), relance la génération.');
    }, SESSION_TTL_MS);
    this.ttlTimer.unref();
  }

  view(): ClaudeSetupSessionView {
    return {
      sessionId: this.id,
      state: this.state,
      authorizeUrl: this.authorizeUrl,
      error: this.error,
    };
  }

  /** Résout quand l'URL d'autorisation a été détectée (ou échec/timeout). */
  async waitForUrl(): Promise<void> {
    if (this.authorizeUrl || this.state === 'error') {
      return;
    }

    await new Promise<void>((resolvePromise) => {
      const timer = setTimeout(() => {
        this.fail("L'URL d'autorisation n'est pas apparue à temps.");
        resolvePromise();
      }, URL_TIMEOUT_MS);
      timer.unref();
      this.urlWaiters.push(() => {
        clearTimeout(timer);
        resolvePromise();
      });
    });
  }

  /** Colle le code d'autorisation et attend la fin de l'échange. */
  async submitCode(code: string): Promise<void> {
    if (this.state !== 'awaiting-code') {
      throw new Error(`Session pas prête pour un code (état : ${this.state}).`);
    }

    this.state = 'exchanging';
    // Deux subtilités du TUI, chacune vécue en prod :
    // 1. la touche Entrée d'un pty brut est \r, pas \n (v0.4.1) ;
    // 2. un \r collé DANS le même flot que le code est avalé par la garde
    //    anti-collage — il faut l'envoyer séparément, après une pause (v0.5.1 ;
    //    un code court y échappait, d'où un test conteneur trompeusement vert).
    this.child.stdin.write(code);
    const enter = setTimeout(() => this.child.stdin.write('\r'), 500);
    enter.unref();
    // Filet : certains écrans redemandent une validation.
    const retry = setTimeout(() => {
      if (this.state === 'exchanging' && !this.exited) {
        this.child.stdin.write('\r');
      }
    }, 6_000);
    retry.unref();

    await new Promise<void>((resolvePromise) => {
      const timer = setTimeout(() => {
        // Sur code invalide le CLI re-prompte sans sortir : on retombe ici.
        this.fail(
          "L'échange n'a pas abouti — code invalide ou expiré ? Relance la génération.",
        );
        resolvePromise();
      }, EXCHANGE_TIMEOUT_MS);
      timer.unref();
      this.exitWaiters.push(() => {
        clearTimeout(timer);
        resolvePromise();
      });
    });
  }

  dispose() {
    clearTimeout(this.ttlTimer);
    if (!this.exited) {
      this.child.kill('SIGKILL');
    }
  }

  private onData(chunk: Buffer) {
    this.buffer += chunk.toString('utf8');
    const clean = stripAnsi(this.buffer);

    if (!this.authorizeUrl) {
      const match = clean.match(/https:\/\/[^\s"'<>]+oauth[^\s"'<>]*/i);

      if (match) {
        this.authorizeUrl = match[0];
        this.urlWaiters.splice(0).forEach((notify) => notify());
      }
    }

    if (this.state === 'starting' && /Paste\s*code\s*here/i.test(clean)) {
      this.state = 'awaiting-code';
    }
  }

  private async onExit() {
    clearTimeout(this.ttlTimer);

    if (this.state === 'done' || this.state === 'error') {
      this.exitWaiters.splice(0).forEach((notify) => notify());
      return;
    }

    let token = stripAnsi(this.buffer).match(TOKEN_PATTERN)?.[0] ?? null;

    // Filet : selon les versions, le token peut n'être que dans le fichier de
    // credentials écrit par le CLI.
    if (!token) {
      try {
        const credentials = await readFile(
          resolve(setupConfigDir(), '.credentials.json'),
          'utf8',
        );
        token = credentials.match(TOKEN_PATTERN)?.[0] ?? null;
      } catch {
        // pas de fichier : on tranchera ci-dessous
      }
    }

    if (token) {
      await saveClaudeToken(token);
      this.state = 'done';
    } else {
      this.error =
        this.state === 'exchanging'
          ? "Le CLI s'est terminé sans produire de token — code invalide ?"
          : "Le CLI s'est terminé prématurément.";
      this.state = 'error';
    }

    this.exitWaiters.splice(0).forEach((notify) => notify());
  }

  private fail(message: string) {
    if (this.state === 'done' || this.state === 'error') {
      return;
    }

    this.state = 'error';
    this.error = message;
    this.urlWaiters.splice(0).forEach((notify) => notify());
    this.exitWaiters.splice(0).forEach((notify) => notify());
    this.dispose();
  }
}

let activeSession: ClaudeSetupSession | null = null;

export async function startClaudeSetupSession(): Promise<ClaudeSetupSessionView> {
  activeSession?.dispose();
  await mkdir(setupConfigDir(), { recursive: true });
  activeSession = new ClaudeSetupSession();
  await activeSession.waitForUrl();

  return activeSession.view();
}

export function getClaudeSetupSession(
  sessionId: string,
): ClaudeSetupSession | null {
  return activeSession && activeSession.id === sessionId ? activeSession : null;
}

// ---------------------------------------------------------------------------
// Binaire Claude Code embarqué par le SDK agent
// ---------------------------------------------------------------------------

export function resolveClaudeBinary(): string {
  // Échappatoire ops/tests : chemin explicite du binaire Claude Code.
  if (process.env.CLAUDE_CODE_BIN) {
    return process.env.CLAUDE_CODE_BIN;
  }

  const platformDir = `claude-agent-sdk-${process.platform}-${process.arch}`;
  const candidates: string[] = [];

  // 1) Depuis l'entrée du SDK (require.resolve du package.json est interdit
  //    par ses `exports` — vécu en prod v0.4.0) : le paquet plateforme est un
  //    frère dans le même scope @anthropic-ai.
  try {
    const require = createRequire(import.meta.url);
    const sdkEntry = require.resolve('@anthropic-ai/claude-agent-sdk');
    candidates.push(resolve(dirname(sdkEntry), '..', platformDir, 'claude'));
  } catch {
    // SDK non résolvable d'ici : on tente les node_modules connus.
  }

  // 2) node_modules courant (prod : /app) puis parent (dev : racine du
  //    monorepo quand le backend tourne depuis backend/).
  for (const base of [process.cwd(), resolve(process.cwd(), '..')]) {
    candidates.push(
      resolve(base, 'node_modules', '@anthropic-ai', platformDir, 'claude'),
    );
  }

  const found = candidates.find((candidate) => existsSync(candidate));

  if (!found) {
    throw new Error(
      `Binaire Claude Code introuvable (@anthropic-ai/${platformDir}) — définir CLAUDE_CODE_BIN.`,
    );
  }

  return found;
}

function stripAnsi(value: string): string {
  return value
    .replaceAll(/\u001b\[[0-9;?]*[a-zA-Z]/g, '')
    .replaceAll(/\u001b\][^\u0007]*\u0007/g, '')
    .replaceAll(/\u001b[=>]/g, '');
}
