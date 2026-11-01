import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import { useThemeStore } from './presentation/composables/useTheme'
import './presentation/main.css'
import { router } from './presentation/router'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia).use(router)

// Inicializa o tema antes do mount para aplicar a classe .dark e ouvir o sistema
useThemeStore(pinia)

app.mount('#app')
