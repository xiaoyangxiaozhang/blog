import { defineStore } from 'pinia'
import { useAuthStore } from '@/stores/auth'
export const useUserStore = defineStore('user',{
    state:()=>({
        
    }),
    getters:{
     userAvatar:()=>{
       const authStore = useAuthStore()
       return authStore.getUserInfo()?.avatar || 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'
     },
     nickName:()=>{
       const authStore = useAuthStore()
       return authStore.getUserInfo()?.nickname || 'Admin'
     },
    }
    
})