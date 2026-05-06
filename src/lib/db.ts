import { createClient } from '@supabase/supabase-js'

// 抓取你剛剛存在 .env.local 裡面的金鑰
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// 建立並輸出一個可以到處使用的 supabase 實例
export const supabase = createClient(supabaseUrl, supabaseAnonKey)