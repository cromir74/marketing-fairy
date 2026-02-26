import { createClient } from './client';

/**
 * base64 형태의 이미지를 Supabase Storage에 업로드하고 공개 URL을 반환합니다.
 * @param base64 base64 문자열 (data:image/jpeg;base64,... 형식)
 * @param fileName 저장할 파일명
 * @returns 공개 URL 문자열
 */
export async function uploadGeneratedImage(base64: string, fileName: string): Promise<string> {
    const supabase = createClient();

    // base64 prefix 제거
    const base64Data = base64.split(',')[1] || base64;

    // Buffer/Blob으로 변환
    const binaryData = Buffer.from(base64Data, 'base64');

    // 'photo' 버킷에 업로드 (Public 설정 필요)
    const { data, error } = await supabase.storage
        .from('photo')
        .upload(`uploads/${Date.now()}_${fileName}`, binaryData, {
            contentType: 'image/jpeg', // Instagram은 JPEG 추천
            upsert: true
        });

    if (error) {
        console.error('Storage Upload Error:', error);
        throw new Error(`이미지 업로드 실패: ${error.message}`);
    }

    // 공개 URL 가져오기
    const { data: { publicUrl } } = supabase.storage
        .from('photo')
        .getPublicUrl(data.path);

    return publicUrl;
}
