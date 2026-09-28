import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Base path is derived from the repo name automatically, so renaming the
// GitHub repo does not break the deployed site.
// - In GitHub Actions, GITHUB_REPOSITORY is "owner/repo".
// - Locally (npm run dev / build) it falls back to '/'.
// - A user/org site (repo named "<name>.github.io") is served from '/'.
const repo = process.env.GITHUB_REPOSITORY?.split('/')[1]
const base = repo && !repo.endsWith('.github.io') ? `/${repo}/` : '/'

export default defineConfig({
  plugins: [react()],
  base,
})
