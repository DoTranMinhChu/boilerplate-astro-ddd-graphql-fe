#!/usr/bin/env node
import { execSync, spawn } from 'child_process';
async function main() {
  const command = process.argv[2];
  switch (command) {
    case 'deploy':
      let [MINI_APP_ID, ACCESS_TOKEN, MODE] = process.argv.slice(3);
      await zmpLogin(MINI_APP_ID, ACCESS_TOKEN);
      execSync(
        `zmp deploy -p${MODE === 'dev' ? '' : 't'}m "$(git log -1 --pretty=%B)"`,
      );
      break;

    case 'refresh':
      let [APP_ID, APP_SECRET, REFRESH_TOKEN] = process.argv.slice(3);
      if (!APP_ID || !APP_SECRET || !REFRESH_TOKEN) {
        throw new Error(
          'Please put ZALO_APP_ID, ZALO_APP_SECRET, ZALO_REFRESH_TOKEN inside environment variables. If you are using Github Actions, put it inside Secrets!',
        );
      }
      const { error, error_description, access_token, refresh_token } =
        await renewAccessToken(APP_ID, APP_SECRET, REFRESH_TOKEN);
      if (error) {
        throw new Error(error_description);
      } else {
        // Pass these env into the next jobs. If you're using Github Actions, it would look like this >> $GITHUB_ENV
        // Please don't change APP_ID & ZMP_TOKEN, otherwise zmp-cli won't collect it
        // Save this refresh token back, the old refresh token is now invalid
        console.log(
          [
            `NEW_ACCESS_TOKEN=${access_token}`,
            `NEW_REFRESH_TOKEN=${refresh_token}`,
          ].join('\n'),
        );
      }
      break;

    default:
      throw new Error('Operation not supported!');
  }
}

async function zmpLogin(miniAppId: string, accessToken: string) {
  return new Promise<void>((resolve, reject) => {
    const proc = spawn('zmp', ['login'], {
      env: { ...process.env, APP_ID: miniAppId },
      stdio: ['pipe', 'pipe', 'inherit'],
    });

    let buffer = '';
    let stage: 'method' | 'token' | 'done' = 'method';

    const timeout = setTimeout(() => {
      proc.kill();
      reject(new Error('zmp login timed out'));
    }, 10_000);

    proc.stdout.on('data', (data) => {
      buffer += data.toString();

      if (stage === 'method' && buffer.includes('Choose a Login Method')) {
        proc.stdin.write('\x1B[B\n'); // down arrow + enter
        stage = 'token';
        buffer = '';
      }

      if (stage === 'token' && buffer.includes('Zalo Access Token')) {
        proc.stdin.write(accessToken + '\n');
        stage = 'done';
      }
    });

    proc.on('close', (code) => {
      clearTimeout(timeout);
      if (code === 0) resolve();
      else reject(new Error(`Login failed with code ${code}`));
    });

    proc.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

export async function renewAccessToken(
  app_id: string,
  secret_key: string,
  refresh_token: string,
): Promise<any> {
  return (
    await fetch('https://oauth.zaloapp.com/v4/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        secret_key,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        app_id,
        refresh_token,
      }),
    })
  ).json();
}

main();
