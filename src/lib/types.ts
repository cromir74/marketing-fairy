export interface Store {
    id: string;
    user_id: string;
    name: string;
    category: string;
    location: string;
    atmosphere: string;
    main_products: string;
    tone: string;
    photo_url: string | null;
    created_at: string;
}

export interface Content {
    id: string;
    user_id: string;
    store_id: string;
    platform: "instagram" | "threads";
    topic: string;
    content: string;
    image_url: string | null;
    is_published: boolean;
    created_at: string;
}
