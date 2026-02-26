import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDB() {
    console.log("Checking contents table...");
    const { data, error } = await supabase.from("contents").select("*");
    if (error) {
        console.error("Error fetching contents:", error);
    } else {
        console.log(`Found ${data.length} records in contents table.`);
        console.table(data.map(r => ({
            id: r.id,
            platform: r.platform,
            topic: r.topic?.substring(0, 20),
            is_published: r.is_published,
            scheduled_at: r.scheduled_at,
            created_at: r.created_at
        })));
    }
}

checkDB();
