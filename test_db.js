import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkValues() {
    const { data, error } = await supabase.from('appointments').select('*').limit(10);
    console.log('Result:', data, 'Error:', error);
}

checkValues();
