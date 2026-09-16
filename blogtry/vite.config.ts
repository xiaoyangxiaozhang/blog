import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import path from 'path'
// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      resolvers: [ElementPlusResolver()],
      imports: ['vue', 'vue-router', {
        'element-plus': [
          'ElMessageBox',
          'ElMessage'
        ]
      }]
    }),
    Components({
      resolvers: [ElementPlusResolver()],
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://admin.xiaoyangxiaozhang.xyz',
        changeOrigin: true,
        headers: {
          origin: 'https://admin.xiaoyangxiaozhang.xyz'
        },
        secure: true
      },
      '/uploads': {
        target: 'https://admin.xiaoyangxiaozhang.xyz',
        changeOrigin: true,
        headers: {
          origin: 'https://admin.xiaoyangxiaozhang.xyz'
        },
        secure: true
      }
    }
  }
})
