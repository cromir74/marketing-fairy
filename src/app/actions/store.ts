"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function saveStore(prevState: any, formData: FormData) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { error: "로그인이 필요합니다." };

    const storeData = {
        user_id: user.id,
        name: formData.get("name") as string,
        category: formData.get("category") as string,
        location: formData.get("location") as string,
        atmosphere: formData.get("atmosphere") as string,
        main_products: formData.get("main_products") as string,
        tone: formData.get("tone") as string,
        phone: formData.get("phone") as string || null,
        business_hours: formData.get("business_hours") as string || null,
        one_liner: formData.get("one_liner") as string || null,
        target_customers: formData.get("target_customers") ? JSON.parse(formData.get("target_customers") as string) : [],
        photos: formData.get("photos") ? JSON.parse(formData.get("photos") as string) : [],
        naver_place_url: formData.get("naver_place_url") as string || null,
        naver_rating: formData.get("naver_rating") ? parseFloat(formData.get("naver_rating") as string) : null,
    };

    if (!storeData.name || !storeData.category) {
        return { error: "가게명과 업종은 필수입니다." };
    }

    // 기존 가게 확인
    const { data: existing } = await supabase
        .from("stores")
        .select("id")
        .eq("user_id", user.id)
        .single();

    if (existing) {
        const { error } = await supabase
            .from("stores")
            .update(storeData)
            .eq("id", existing.id);
        if (error) return { error: error.message };
    } else {
        const { error } = await supabase.from("stores").insert(storeData);
        if (error) return { error: error.message };
    }

    revalidatePath("/dashboard");
    revalidatePath("/store");
    return { success: "가게 정보가 저장되었습니다!" };
}
