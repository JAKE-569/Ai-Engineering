import dotenv from 'dotenv';
// Project settings take precedence over unrelated CLI settings in the shell.
// An omitted key continues to use the existing environment credential.
dotenv.config({ path: '.env', override: true, quiet: true });
dotenv.config({ path: '.env.local', override: true, quiet: true });
