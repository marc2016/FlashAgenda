import { readFileSync } from 'node:fs'
import { defineConfig } from 'vitepress'

// The release script bumps the app version in frontend/package.json first; show it in the nav
const appVersion: string = JSON.parse(
  readFileSync(new URL('../../frontend/package.json', import.meta.url), 'utf8')
).version

const repoUrl = 'https://github.com/marc2016/FlashAgenda'

export default defineConfig({
  lang: 'en-US',
  title: 'FlashAgenda',
  description: 'Collaborative meeting agendas: share a link, collect topics, run the meeting live.',
  cleanUrls: true,
  // Links to a local instance (localhost) are intentional; every other dead link fails the build
  ignoreDeadLinks: 'localhostLinks',

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    ['link', { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Bangers&display=swap' }],
    ['meta', { name: 'theme-color', content: '#b71c1c' }]
  ],

  themeConfig: {
    logo: '/logo.svg',

    nav: [
      { text: 'Guide', link: '/guide/what-is-flashagenda', activeMatch: '/guide/' },
      { text: `v${appVersion}`, link: `${repoUrl}/releases` }
    ],

    sidebar: [
      {
        text: 'Introduction',
        items: [
          { text: 'What is FlashAgenda?', link: '/guide/what-is-flashagenda' },
          { text: 'Getting Started', link: '/guide/getting-started' }
        ]
      },
      {
        text: 'Guide',
        items: [
          { text: 'Using FlashAgenda', link: '/guide/usage' },
          { text: 'Configuration', link: '/guide/configuration' },
          { text: 'Development', link: '/guide/development' }
        ]
      }
    ],

    socialLinks: [{ icon: 'github', link: repoUrl }],

    search: { provider: 'local' },

    editLink: {
      pattern: `${repoUrl}/edit/main/website/:path`,
      text: 'Edit this page on GitHub'
    },

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026 Marc Lammers'
    }
  }
})
